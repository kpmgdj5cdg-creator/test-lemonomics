import {INVESTMENTS as FUNDS,INVESTMENT_SYMBOLS as SYMBOLS,isCrypto} from './funds.js';
import {MarketClient} from './market-client.js';
import {LiveMarketClient} from './live-market-client.js';
import {tradeQuote,HISTORY_RANGES} from './live-market-data.js';
import {marketFresh,previousSession,quotePrice,fundSeries,rangeStart} from './market-data.js';
import {ensurePortfolio,portfolioTotals,portfolioHistory,holdingPrice,applyLiveMarks,quoteTrade,executeTrade,applyMarket,releaseLegacy,money,shares,cents,SHARE_SCALE} from './investments.js';
import {drawChart} from './investment-chart.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>s?new Date(s+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'Unavailable';
export class InvestmentDesk{
  constructor(host,{getState,commit,isRunning,getAccount=()=>null,onValuation=()=>{}}){
    this.host=host;this.getAccount=getAccount;this.onValuation=onValuation;this.live=new LiveMarketClient();this.visible=false;this.historyAttempts=new Map();this.getState=getState;this.commit=commit;this.isRunning=isRunning;this.market=new MarketClient();this.selected=new Set(['DIA','SPY']);this.chartTab='funds';this.range='1D';this.form={symbol:'DIA',side:'buy',mode:'dollars',amount:''};this.review=null;this.notice='';this.error=false;
    host.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
      if(b.dataset.chartTab){this.chartTab=b.dataset.chartTab;this.review=null;this.render();this.loadHistory()}
      else if(b.dataset.range){this.range=b.dataset.range;this.renderChartControls();this.loadHistory()}
      else if(b.dataset.selectFund){this.form.symbol=b.dataset.selectFund;this.selected.add(this.form.symbol);this.review=null;this.render();this.host.querySelector('#tradeAmount').focus();this.loadHistory()}
      else if(b.dataset.tradeSide){this.form.side=b.dataset.tradeSide;this.review=null;this.render()}
      else if(b.dataset.sellFund){this.form.symbol=b.dataset.sellFund;this.form.side='sell';this.form.mode='shares';this.form.amount=String((ensurePortfolio(this.getState().bank).positions[this.form.symbol]?.units||0)/SHARE_SCALE);this.review=null;this.render();this.host.querySelector('#tradeAmount').focus();this.loadHistory()}
      else if(b.id==='reviewTrade'){e.preventDefault();this.prepare();}
      else if(b.id==='refreshMarket')this.open(true);
      else if(b.id==='refreshHistory'){this.historyAttempts.clear();this.loadHistory();}
      else if(b.id==='cancelTrade'){this.review=null;this.render()}
      else if(b.id==='confirmTrade')this.confirm();
      else if(b.id==='releaseLegacy'){if(this.isRunning())return;try{releaseLegacy(this.getState());this.commit();this.message('Your previous investment balance is now in checking.')}catch(e){this.message(e.message,true)}}
    });
    host.addEventListener('change',e=>{
      if(e.target.dataset.compare){e.target.checked?this.selected.add(e.target.dataset.compare):this.selected.delete(e.target.dataset.compare);this.renderChart();this.loadHistory();}
      else if(e.target.id==='tradeFund'||e.target.id==='tradeMode'){this.form[e.target.id==='tradeFund'?'symbol':'mode']=e.target.value;this.review=null;this.render();}
    });
    host.addEventListener('input',e=>{if(e.target.id==='tradeAmount'){this.form.amount=e.target.value;this.review=null;this.host.querySelector('.invest-confirmation')?.remove();this.updateEstimate();}});
    host.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='tradeAmount'){e.preventDefault();this.prepare();}});
    host.addEventListener('submit',e=>{if(e.target.id!=='tradeForm')return;e.preventDefault();this.prepare()});
    if(this.market.data){applyMarket(this.getState(),this.market.data);}
    this.chartWidth=0;this.chartObserver=new ResizeObserver(()=>{const width=this.host.clientWidth;if(width&&width!==this.chartWidth){this.chartWidth=width;cancelAnimationFrame(this.chartFrame);this.chartFrame=requestAnimationFrame(()=>this.renderChart());}});this.chartObserver.observe(host);document.addEventListener('visibilitychange',()=>{clearTimeout(this.pollTimer);if(this.visible&&!document.hidden){this.open();this.schedule()}});
  }
  value(){return portfolioTotals(this.getState().bank,this.market.data).valueCents/100}
  executionMarket(){return {...(this.market.data||{}),liveQuotes:this.live.data}}
  tradeRequest(){return {...this.form,marketMode:'live',accountId:this.getAccount()||'local-player'}}
  attachLive(){if(this.market.data)this.market.data.liveQuotes=this.live.data;if(this.live.data)applyLiveMarks(this.getState(),this.live.data);}
  setVisible(visible){this.visible=visible;clearTimeout(this.pollTimer);if(visible)this.schedule();}
  schedule(){clearTimeout(this.pollTimer);if(!this.visible||document.hidden)return;const wait=this.live.delay();this.pollTimer=setTimeout(async()=>{if(!this.visible||document.hidden)return;await this.refreshLive();this.continueHistory();this.schedule()},wait);}
  async refreshLive(){const state=this.getState();await this.live.refresh(()=>{if(this.getState()!==state)return;this.attachLive();if(this.review){try{const q=quoteTrade(state.bank,this.executionMarket(),this.tradeRequest());if(q.signature!==this.review.signature)throw Error()}catch{this.review=null;this.notice='The quote changed or expired. Review your trade again.';}}this.onValuation();this.render();});this.schedule();}
  open(force=false){
    const state=this.getState();if(this.visible)this.loadHistory();
    return Promise.all([this.market.refresh(()=>{if(this.getState()!==state)return;this.attachLive();if(this.market.data&&applyMarket(state,this.market.data))this.commit();else this.render();},force),this.refreshLive()]);
  }
  loadHistory(){if(!this.visible||this.chartTab!=='funds')return;for(const symbol of this.selected){const key=symbol+':'+this.range;this.historyAttempts.set(key,0);setTimeout(()=>{if(this.visible&&!document.hidden)this.fetchHistory(symbol,this.range)},1200);}}
  fetchHistory(symbol,range){const key=symbol+':'+range,count=this.historyAttempts.get(key)||0;if(count>=8)return;this.historyAttempts.set(key,count+1);return this.live.history(symbol,range,()=>this.renderChart());}
  continueHistory(){if(this.chartTab!=='funds')return;for(const symbol of this.selected){const h=this.live.histories.get(symbol+':'+this.range);if(h&&!h.pending&&(h.nextPageToken||['pending','retained'].includes(h.status))&&h.nextRefresh<=Date.now())setTimeout(()=>{if(this.visible&&!document.hidden)this.fetchHistory(symbol,this.range)},1200);}}
  reset(){this.form={symbol:'DIA',side:'buy',mode:'dollars',amount:''};this.review=null;this.notice='';this.error=false;this.chartTab='funds';this.range='1D';this.selected=new Set(['DIA','SPY']);clearTimeout(this.pollTimer);this.visible=false;this.historyAttempts.clear();}
  message(text,error=false){this.notice=text;this.error=error;this.render()}
  prepare(){
    // Review is a local game action, not a native form submission: embedded
    // previews may allow scripts while deliberately disallowing form navigation.
    this.form={...this.form,
      symbol:this.host.querySelector('#tradeFund')?.value||this.form.symbol,
      mode:this.host.querySelector('#tradeMode')?.value||this.form.mode,
      amount:this.host.querySelector('#tradeAmount')?.value??this.form.amount};
    this.review=null;
    if(this.isRunning()){this.message('Finish your business day before investing.',true);this.revealTradeResult();return}
    try{this.review=quoteTrade(this.getState().bank,this.executionMarket(),this.tradeRequest());this.notice='';this.render()}catch(e){this.message(e.message,true)}
    this.revealTradeResult();
  }
  revealTradeResult(){
    const target=this.host.querySelector(this.review?'#confirmTrade':'#investNotice');
    if(!target)return;
    if(!this.review)target.setAttribute('tabindex','-1');
    target.focus({preventScroll:true});
    target.scrollIntoView({block:'nearest',behavior:'instant'});
  }
  confirm(){
    if(!this.review)return;
    if(this.isRunning()){this.review=null;this.message('Finish your business day before investing.',true);return}
    const expected=this.review.signature;this.review=null;
    try{
      const trade=executeTrade(this.getState(),this.executionMarket(),this.tradeRequest(),expected);this.form.amount='';this.commit();
      this.message((trade.side==='buy'?'Bought ':'Sold ')+shares(trade.units)+' '+(isCrypto(trade.symbol)?'BTC':trade.symbol+' shares')+'. '+(trade.side==='buy'?money(trade.totalCents)+' including the fee was paid from checking.':money(trade.totalCents)+' after the fee was deposited in checking.'));
    }catch(e){this.message(e.message,true)}
  }
  render(){
    const focused=this.host.contains(document.activeElement)?document.activeElement.id:null;this.attachLive();
    const state=this.getState(),bank=state.bank,p=ensurePortfolio(bank),market=this.market.data,t=portfolioTotals(bank,market),fresh=!!this.live.data?.session?.open,blocked=this.isRunning()||!this.canTrade(this.form.symbol);
    const quoteDate=market?.asOf;
    this.host.innerHTML=`<div class="invest-intro"><div><div class="invest-eyebrow">LEMONADE LANE · INVESTING</div><h3>Grow a little, learn a lot.</h3><p>Choose an investment. Build your portfolio. Follow the real market.</p></div><div class="invest-price-status"><strong>${this.sessionLabel()}</strong><span>${this.live.loading?'Refreshing investment prices…':'Alpaca · IEX ETFs + Bitcoin · virtual money only'}</span><button type="button" id="refreshMarket" ${this.live.loading?'disabled':''}>${this.live.loading?'Refreshing…':'Refresh prices ↻'}</button></div></div>
    ${this.live.data?.mock?'<p class="invest-feed-note">TEST FIXTURE · simulated data for automated testing; not live prices.</p>':''}
    ${this.live.error?'<p class="invest-feed-note" role="status">'+esc(this.live.error)+'</p>':''}
    <p class="invest-feed-note">ETF trades come from IEX, one US exchange, and require fresh quotes during verified regular market hours. ${this.live.data?.session?.verified?'ETF hours follow the verified Alpaca calendar.':'ETF market hours are unverified; ETF trading is paused.'} Bitcoin uses Alpaca’s US crypto feed and can trade 24/7 with a fresh quote. Bitcoin’s displayed quote midpoint can move between trades; virtual buys use the ask and sells use the bid. A last-trade price is used only when a fresh bid/ask quote is unavailable. Shared Bitcoin checks run about every 20 seconds; ETF updates about every five seconds while open. All trades use game money.</p>
    ${this.live.data?.crypto&&this.live.data.crypto.status!=='ok'?'<p class="invest-feed-note" role="status">'+esc(this.cryptoNotice())+'</p>':''}
    <div class="invest-summary"><div><span>PORTFOLIO VALUE</span><strong id="investValue">${money(t.valueCents)}</strong></div><div><span>NET GAIN / LOSS</span><strong class="${t.profitCents<0?'negative':'positive'}" id="portfolioGain">${money(t.profitCents)}</strong></div><div><span>CHECKING AVAILABLE</span><strong>${money(cents(bank.checking))}</strong></div><div><span>TOTAL PURCHASES</span><strong>${money(t.totalBoughtCents)}</strong></div><div><span>UNREALIZED GAIN / LOSS</span><strong>${money(t.unrealizedCents)}</strong></div><div><span>REALIZED GAIN / LOSS</span><strong>${money(t.realizedCents)}</strong></div></div>
    ${p.legacyCents?'<div class="invest-feed-note">Your previous investment balance of '+money(p.legacyCents)+' is preserved as unallocated money. <button type="button" id="releaseLegacy" '+(this.isRunning()?'disabled':'')+'>Move it to checking</button></div>':''}
    <section class="invest-chart-card"><div class="invest-chart-tabs" role="tablist" aria-label="Investment chart"><button type="button" role="tab" data-chart-tab="funds" aria-selected="${this.chartTab==='funds'}">Explore funds</button><button type="button" role="tab" data-chart-tab="portfolio" aria-selected="${this.chartTab==='portfolio'}">My portfolio</button></div><div class="invest-chart-heading"><div><h4 id="investChartTitle">${this.chartTab==='funds'?'Compare fund performance':'Your portfolio performance'}</h4><p id="investChartCaption"></p></div><div class="invest-ranges" role="group" aria-label="Chart time period">${Object.keys(HISTORY_RANGES).map(r=>'<button type="button" data-range="'+r+'" aria-pressed="'+(r===this.range)+'">'+r+'</button>').join('')}</div></div><div class="invest-series-select" ${this.chartTab==='portfolio'?'hidden':''}>${FUNDS.map(f=>'<label style="--fund-color:'+f.color+'"><input type="checkbox" data-compare="'+f.symbol+'" '+(this.selected.has(f.symbol)?'checked':'')+'><span>'+f.name+'</span></label>').join('')}</div><div id="investChart" class="invest-chart"></div><button type="button" id="refreshHistory" class="invest-history-refresh">Load / refresh chart history</button><p class="invest-chart-note">${this.chartTab==='funds'?'Alpaca ETF and Bitcoin price history, loaded on demand. ETF prices are split adjusted, exclude distributions and are delayed at least 16 minutes. Bitcoin uses US crypto bars with UTC daily boundaries. Missing observations are not invented.':'Net gain or loss after trading fees, including realized gains and credited fund distributions. Adding money is not counted as a gain. History begins with your first purchase.'}</p></section>
    <div class="invest-lower-grid"><section class="invest-funds"><div class="invest-section-heading"><h4>Find your mix</h4><span>6 ETFs + BITCOIN · FRACTIONAL UNITS</span></div><div class="invest-fund-grid">${FUNDS.map(f=>{
      const q=this.live.data?.quotes?.[f.symbol],price=q?.price??null,change=q?.changePercent??null,changeDollars=q?.change??null;
      return '<button type="button" class="invest-fund-card '+(this.form.symbol===f.symbol?'chosen':'')+'" data-select-fund="'+f.symbol+'" style="--fund-color:'+f.color+'"><div class="fund-card-top"><span>'+f.symbol+'</span><small class="'+(change<0?'negative':'positive')+'">'+(change===null?'—':(change>=0?'+':'')+change.toFixed(2)+'%')+'</small></div><strong>'+f.name+'</strong><p>'+f.description+'</p><div class="fund-card-price">'+(price===null?'—':money(cents(price)))+'<small> / '+(isCrypto(f.symbol)?'BTC':'share')+'</small></div><small>'+esc(changeDollars===null?'Previous close unavailable':(changeDollars>=0?'+':'−')+money(cents(Math.abs(changeDollars)))+(isCrypto(f.symbol)?' vs previous UTC close':' today'))+'</small><small class="fund-quote-time">'+(isCrypto(f.symbol)?(q?.priceBasis==='bid-ask-midpoint'?'Quote midpoint · ':'Last trade · '):'')+esc(q?.timestamp?this.time(q.timestamp):'No valid price')+' · '+(this.canTrade(f.symbol)?'Current':q?.price?'Last known · trading paused':'Unavailable')+'</small>'+(isCrypto(f.symbol)?'<small class="fund-quote-time">Checked '+esc(this.live.data?.crypto?.fetchedAt?this.time(this.live.data.crypto.fetchedAt):'not yet')+'</small>':'')+'<small class="fund-risk">'+f.risk+'</small></button>';
    }).join('')}</div></section>
    <section class="invest-trade-card"><h4>Make an investment</h4><p class="invest-trade-sub">Your checking account funds every purchase.</p><div class="invest-side-picker" role="group" aria-label="Trade direction"><button type="button" data-trade-side="buy" aria-pressed="${this.form.side==='buy'}">Buy</button><button type="button" data-trade-side="sell" aria-pressed="${this.form.side==='sell'}">Sell</button></div>
    <form id="tradeForm" novalidate><label for="tradeFund">Investment</label><select id="tradeFund">${FUNDS.map(f=>'<option value="'+f.symbol+'" '+(f.symbol===this.form.symbol?'selected':'')+'>'+f.name+' · '+f.symbol+'</option>').join('')}</select><div class="invest-form-row"><div><label for="tradeMode">Enter an amount in</label><select id="tradeMode"><option value="dollars" ${this.form.mode==='dollars'?'selected':''}>Dollars</option><option value="shares" ${this.form.mode==='shares'?'selected':''}>Shares / BTC</option></select></div><div><label for="tradeAmount">${this.form.mode==='shares'?(isCrypto(this.form.symbol)?'BTC quantity':'Shares'):'Dollars (total buy budget)'}</label><input id="tradeAmount" type="number" min="${this.form.mode==='shares'?'0.000001':'.01'}" step="${this.form.mode==='shares'?'0.000001':'.01'}" inputmode="decimal" placeholder="${this.form.mode==='shares'?'0.000000':'0.00'}" value="${esc(this.form.amount)}" required></div></div><div id="tradeEstimate" class="invest-estimate" aria-live="polite"></div><p class="invest-fee-note">0.5% fee per buy or sell, rounded to cents; minimum $0.01. Fractional shares or BTC to 6 decimal places.</p><button type="button" id="reviewTrade" class="invest-review" ${blocked?'disabled':''}>Review ${this.form.side==='buy'?'purchase':'sale'} →</button>${blocked?'<p class="invest-form-note">'+(this.isRunning()?'Finish your business day before trading.':isCrypto(this.form.symbol)?'A fresh Bitcoin quote is required; Bitcoin trades 24/7.':'A fresh IEX quote during verified regular market hours is required to trade.')+'</p>':''}</form>
    ${this.review?this.reviewHTML():''}<div id="investNotice" tabindex="-1" role="status" class="invest-notice ${this.error?'error':''}" ${this.notice?'':'hidden'}>${esc(this.notice)}</div></section></div>
    <section class="invest-holdings"><div class="invest-section-heading"><h4>Your holdings</h4><span>LIVE / LAST KNOWN MARKET VALUE</span></div>${this.holdingsHTML(p,market,t)}<div class="invest-performance-detail">Realized gain / loss: ${money(t.realizedCents)} · Unrealized: ${money(t.unrealizedCents)} · Fund distributions: ${money(t.dividendCents)}</div></section>
    <details class="invest-activity"><summary>Trade history · ${p.trades.length} ${p.trades.length===1?'trade':'trades'}</summary>${p.trades.length?'<div class="invest-table-wrap"><table><thead><tr><th>Executed</th><th>Trade</th><th>Shares</th><th>Quote time / date</th><th>Price</th><th>Fee</th><th>Checking movement</th><th>Cost basis</th><th>Realized gain / loss</th><th>Player account</th></tr></thead><tbody>'+p.trades.slice().reverse().map(x=>'<tr><td>'+esc(this.time(x.executedAt))+'</td><td>'+x.side.toUpperCase()+' '+x.symbol+'</td><td>'+shares(x.units)+'</td><td>'+esc(x.quoteTimestamp?this.time(x.quoteTimestamp):date(x.priceDate))+'</td><td>'+money(cents(x.price))+'</td><td>'+money(x.feeCents)+'</td><td>'+(x.side==='buy'?'−':'+')+money(x.totalCents)+'</td><td>'+money(x.costBasisCents??(x.side==='buy'?x.totalCents:x.totalCents-(x.realizedCents||0)))+'</td><td>'+money(x.realizedCents||0)+'</td><td>'+esc(x.accountId||'Legacy account')+'</td></tr>').join('')+'</tbody></table></div>':'<p>No purchases or sales yet.</p>'}</details>
    <details class="invest-activity"><summary>Learn investing words</summary><p><strong>Market price:</strong> the latest recorded trade. <strong>Cost basis:</strong> what you paid, including game fees. <strong>Unrealized gain:</strong> a gain still inside your investments. <strong>Realized gain:</strong> a gain from selling. <strong>Diversification:</strong> spreading investments across different assets. <strong>Volatility:</strong> how much prices move. <strong>Risk:</strong> the possibility of losing value.</p></details><p class="invest-bottom-note">Game money only. Prices follow real market time, not lemonade game days. The six original choices are exchange-traded funds (ETFs). Bitcoin is a cryptocurrency, not an ETF, and its price can swing sharply at any hour. High Risk and Low Risk are relative labels, never promises. Unrealized gains stay in investments until sold. Trades are simulated here; no brokerage orders are sent. Fund distributions are credited to checking on the provider’s ex-date; taxes are not simulated.${market?' Source: '+esc(market.source)+'.':''}</p>`;
    this.renderChart();this.updateEstimate();if(focused){const el=this.host.querySelector('#'+focused);el?.focus({preventScroll:true});}
  }
  time(value){try{return new Date(value).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',second:'2-digit',timeZoneName:'short'})}catch{return 'Unavailable'}}
  sessionLabel(){const s=this.live.data?.session;return (s?.verified?(s.open?'Market open':'Market closed')+(s.earlyClose?' · early close '+s.closes+' ET':''):'Market calendar unverified')+' · Bitcoin 24/7'}
  quoteLabel(q){return isCrypto(q.symbol)?q.priceBasis==='bid-ask-midpoint'?(q.side==='buy'?'Crypto ask quote':'Crypto bid quote'):'Crypto trade':'IEX trade'}
  cryptoNotice(){return ({pending:'Loading Bitcoin prices…',configuration:'Bitcoin connection needs attention. Ask the family administrator to check access.',disabled:'Bitcoin prices are not enabled yet.','rate-limited':'Bitcoin updates are taking a short break. Last known prices are retained.','daily-limit':'Today’s shared update budget is used. Bitcoin updates resume tomorrow.'})[this.live.data?.crypto?.status]||'Bitcoin prices are temporarily unavailable. Last known prices are retained; trading waits for a fresh quote.'}
  canTrade(symbol){try{tradeQuote(this.live.data,symbol);return true}catch{return false}}
  holdingsHTML(p,market,totals){
    const positions=FUNDS.filter(f=>p.positions[f.symbol]?.units);
    if(!positions.length)return '<div class="invest-empty-holdings">Your portfolio starts here.<span>Buy a little of a fund above to start tracking your investments.</span></div>';
    return '<div class="invest-table-wrap"><table><thead><tr><th>Investment</th><th>Quantity</th><th>Average cost*</th><th>Cost basis*</th><th>Market value</th><th>Gain / loss*</th><th>Allocation</th><th></th></tr></thead><tbody>'+positions.map(f=>{
      const pos=p.positions[f.symbol],price=holdingPrice(p,market,f.symbol),value=Math.round(pos.units/SHARE_SCALE*price*100),gain=value-pos.costCents;
      return '<tr><td><strong>'+f.symbol+'</strong><small>'+f.name+'</small></td><td>'+shares(pos.units)+'</td><td>'+money(Math.round(pos.costCents/(pos.units/SHARE_SCALE)))+'</td><td>'+money(pos.costCents)+'</td><td>'+money(value)+'</td><td class="'+(gain<0?'negative':'positive')+'">'+money(gain)+'</td><td>'+((value/(totals.valueCents||1))*100).toFixed(1)+'%</td><td><button type="button" data-sell-fund="'+f.symbol+'">Sell all</button></td></tr>';
    }).join('')+'</tbody></table></div><p class="invest-small-note">*Average cost and unrealized gain / loss include purchase fees.</p>';
  }
  updateEstimate(){
    const el=this.host.querySelector('#tradeEstimate');if(!el)return;
    const pos=ensurePortfolio(this.getState().bank).positions[this.form.symbol];
    if(!this.form.amount){el.textContent='You own '+shares(pos?.units||0)+' '+(isCrypto(this.form.symbol)?'BTC':this.form.symbol+' shares')+'. Enter an amount to see the fee and total.';return}
    try{const q=quoteTrade(this.getState().bank,this.executionMarket(),this.tradeRequest());el.innerHTML='<div><span>'+shares(q.units)+(isCrypto(q.symbol)?' BTC × ':' shares × ')+money(cents(q.price))+'</span><b>'+money(q.notionalCents)+'</b></div><div><span>Trading fee · 0.5%</span><b>'+money(q.feeCents)+'</b></div><div class="estimate-total"><span>'+(q.side==='buy'?'Total from checking':'Net to checking')+'</span><b>'+money(q.totalCents)+'</b></div><small>Checking after trade: '+money(q.checkingAfterCents)+' · '+this.quoteLabel(q)+' '+esc(this.time(q.quoteTimestamp))+'</small>';}catch(e){el.textContent=e.message}
  }
  reviewHTML(){const q=this.review;return '<section class="invest-confirmation" aria-label="Review investment trade"><h5>Confirm '+(q.side==='buy'?'purchase':'sale')+'</h5><p>'+shares(q.units)+' '+(isCrypto(q.symbol)?'BTC':q.symbol+' shares')+' at '+money(cents(q.price))+(isCrypto(q.symbol)?' per BTC':' per share')+'<br>'+this.quoteLabel(q)+': '+esc(this.time(q.quoteTimestamp))+'</p><p>Fee: <strong>'+money(q.feeCents)+'</strong><br>'+(q.side==='buy'?'Checking pays':'Checking receives')+': <strong>'+money(q.totalCents)+'</strong><br>Checking afterward: '+money(q.checkingAfterCents)+'</p><div><button type="button" id="cancelTrade">Cancel</button><button type="button" id="confirmTrade">Confirm '+(q.side==='buy'?'purchase':'sale')+'</button></div></section>'}
  renderChartControls(){for(const b of this.host.querySelectorAll('[data-range]'))b.setAttribute('aria-pressed',String(b.dataset.range===this.range));this.renderChart()}
  renderChart(){
    const host=this.host.querySelector('#investChart'),caption=this.host.querySelector('#investChartCaption');if(!host)return;
    const market=this.market.data,p=ensurePortfolio(this.getState().bank);
    if(this.chartTab==='funds'){
      const selected=FUNDS.filter(f=>this.selected.has(f.symbol)),fallback=this.range!=='1D'&&this.live.data?.status!=='ok'&&!selected.some(f=>this.live.histories.get(f.symbol+':'+this.range)?.points?.length);
      const series=fallback?selected.map(f=>({name:f.name,color:f.color,points:fundSeries(market,f.symbol,this.range)})):selected.map(f=>{const h=this.live.histories.get(f.symbol+':'+this.range),first=h?.points?.[0]?.price;return {name:f.name,color:f.color,unit:isCrypto(f.symbol)?'BTC':'share',points:(h?.points||[]).map(x=>({date:x.timestamp,price:x.price,value:(x.price/first-1)*100}))}});
      const pending=selected.some(f=>this.live.histories.get(f.symbol+':'+this.range)?.pending),errors=selected.map(f=>this.live.histories.get(f.symbol+':'+this.range)).filter(h=>h&&(h.status!=='ok'||h.truncated));
      const note=this.host.querySelector('.invest-chart-note');if(note)note.textContent=fallback?'Saved legacy adjusted daily history includes distributions. This read-only fallback cannot authorize trades.':'Alpaca ETF and Bitcoin price history, loaded on demand. ETF prices are split adjusted, exclude distributions and are delayed at least 16 minutes. Bitcoin uses US crypto bars with UTC daily boundaries. Missing observations are not invented.';
      caption.textContent=fallback?'Saved legacy adjusted daily history (includes distributions) · read only · not live Alpaca data':pending?'Loading actual market history…':errors.length?'Some history is pending, restricted or retained. Use Load / refresh chart history.':'Actual ETF / Bitcoin prices · ETF history excludes distributions and is delayed; Bitcoin uses crypto bars';
      const pos=p.positions[this.form.symbol],basis=pos?.units?pos.costCents/100/(pos.units/SHARE_SCALE):null;
      drawChart(host,series,{empty:selected.length?'No verified Alpaca history loaded for this selection. Use Load / refresh chart history.':'Select a fund above to display history.',costBasis:basis,costBasisUnit:isCrypto(this.form.symbol)?'BTC':'share'});
      const title=this.host.querySelector('#investChartTitle');if(title)title.textContent='Compare fund price changes';
    }else{
      const end=market?.asOf||previousSession(),start=rangeStart(this.range==='1D'?'1W':this.range,end);
      const daily=portfolioHistory(this.getState().bank,market).filter(s=>s.date>=start).map(s=>({date:s.date,value:s.profitCents/100}));
      const live=(p.liveSnapshots||[]).filter(s=>Date.parse(s.timestamp)>=Date.now()-(this.range==='1D'?86400000:({ '1W':7,'1M':32,'3M':94,'1Y':370,'5Y':1835}[this.range]||32)*86400000)).map(s=>({date:s.timestamp,value:s.profitCents/100}));
      caption.textContent='Your actual recorded holdings · includes fees and previously credited distributions';drawChart(host,[{name:'Portfolio net gain / loss',color:'#26734b',points:this.range==='1D'?live:[...daily,...live]}],{portfolio:true,empty:'Portfolio history begins when you invest. No earlier performance is invented.'});
    }
  }
}
