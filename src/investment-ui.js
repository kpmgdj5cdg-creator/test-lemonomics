import {FUNDS,SYMBOLS} from './funds.js';
import {MarketClient} from './market-client.js';
import {marketFresh,previousSession,quotePrice,fundSeries,rangeStart} from './market-data.js';
import {ensurePortfolio,portfolioTotals,portfolioHistory,quoteTrade,executeTrade,applyMarket,releaseLegacy,money,shares,cents,SHARE_SCALE} from './investments.js';
import {drawChart} from './investment-chart.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>s?new Date(s+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'Unavailable';
export class InvestmentDesk{
  constructor(host,{getState,commit,isRunning}){
    this.host=host;this.getState=getState;this.commit=commit;this.isRunning=isRunning;this.market=new MarketClient();this.selected=new Set(['DIA','SPY']);this.chartTab='funds';this.range='1M';this.form={symbol:'DIA',side:'buy',mode:'dollars',amount:''};this.review=null;this.notice='';this.error=false;
    host.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
      if(b.dataset.chartTab){this.chartTab=b.dataset.chartTab;this.review=null;this.render()}
      else if(b.dataset.range){this.range=b.dataset.range;this.renderChartControls()}
      else if(b.dataset.selectFund){this.form.symbol=b.dataset.selectFund;this.selected.add(this.form.symbol);this.review=null;this.render();this.host.querySelector('#tradeAmount').focus()}
      else if(b.dataset.tradeSide){this.form.side=b.dataset.tradeSide;this.review=null;this.render()}
      else if(b.dataset.sellFund){this.form.symbol=b.dataset.sellFund;this.form.side='sell';this.form.mode='shares';this.form.amount=String((ensurePortfolio(this.getState().bank).positions[this.form.symbol]?.units||0)/SHARE_SCALE);this.review=null;this.render();this.host.querySelector('#tradeAmount').focus()}
      else if(b.id==='reviewTrade'){e.preventDefault();this.prepare();}
      else if(b.id==='refreshMarket')this.open(true);
      else if(b.id==='cancelTrade'){this.review=null;this.render()}
      else if(b.id==='confirmTrade')this.confirm();
      else if(b.id==='releaseLegacy'){if(this.isRunning())return;try{releaseLegacy(this.getState());this.commit();this.message('Your previous investment balance is now in checking.')}catch(e){this.message(e.message,true)}}
    });
    host.addEventListener('change',e=>{
      if(e.target.dataset.compare){e.target.checked?this.selected.add(e.target.dataset.compare):this.selected.delete(e.target.dataset.compare);this.renderChart();}
      else if(e.target.id==='tradeFund'||e.target.id==='tradeMode'){this.form[e.target.id==='tradeFund'?'symbol':'mode']=e.target.value;this.review=null;this.render();}
    });
    host.addEventListener('input',e=>{if(e.target.id==='tradeAmount'){this.form.amount=e.target.value;this.review=null;this.host.querySelector('.invest-confirmation')?.remove();this.updateEstimate();}});
    host.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='tradeAmount'){e.preventDefault();this.prepare();}});
    host.addEventListener('submit',e=>{if(e.target.id!=='tradeForm')return;e.preventDefault();this.prepare()});
    if(this.market.data){applyMarket(this.getState(),this.market.data);}
    this.chartWidth=0;this.chartObserver=new ResizeObserver(()=>{const width=this.host.clientWidth;if(width&&width!==this.chartWidth){this.chartWidth=width;this.renderChart();}});this.chartObserver.observe(host);
  }
  value(){return portfolioTotals(this.getState().bank,this.market.data).valueCents/100}
  open(force=false){this.market.refresh(()=>{
    const state=this.getState();if(this.market.data&&applyMarket(state,this.market.data)){this.commit();}else this.render();
  },force);}
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
    try{this.review=quoteTrade(this.getState().bank,this.market.data,this.form);this.notice='';this.render()}catch(e){this.message(e.message,true)}
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
      const trade=executeTrade(this.getState(),this.market.data,this.form,expected);this.form.amount='';this.commit();
      this.message((trade.side==='buy'?'Bought ':'Sold ')+shares(trade.units)+' '+trade.symbol+' shares. '+(trade.side==='buy'?money(trade.totalCents)+' including the fee was paid from checking.':money(trade.totalCents)+' after the fee was deposited in checking.'));
    }catch(e){this.message(e.message,true)}
  }
  render(){
    const state=this.getState(),bank=state.bank,p=ensurePortfolio(bank),market=this.market.data,t=portfolioTotals(bank,market),fresh=marketFresh(market),blocked=this.isRunning()||!fresh;
    const quoteDate=market?.asOf;
    this.host.innerHTML=`<div class="invest-intro"><div><div class="invest-eyebrow">LEMONADE LANE · INVESTING</div><h3>Grow a little, learn a lot.</h3><p>Choose a fund. Build your portfolio. Follow the real market.</p></div><div class="invest-price-status"><strong>${market?'Closing prices · '+date(quoteDate):'Closing prices unavailable'}</strong><span>${this.market.loading?'Refreshing six funds…':fresh?'Latest prior trading day':market?'Saved prices · refresh required to trade':'No verified market data loaded'}</span><button type="button" id="refreshMarket" ${this.market.loading?'disabled':''}>${this.market.loading?'Refreshing…':'Refresh prices ↻'}</button></div></div>
    ${this.market.error?'<p class="invest-feed-note" role="status">'+esc(this.market.error)+(market?'':' Fund details are available below; trading opens once prices arrive.')+'</p>':''}
    ${market&&!fresh?'<p class="invest-feed-note">Expected close: '+date(previousSession())+'. Purchases and sales are paused until current prices are available.</p>':''}
    <div class="invest-summary"><div><span>PORTFOLIO VALUE</span><strong id="investValue">${money(t.valueCents)}</strong></div><div><span>NET GAIN / LOSS</span><strong class="${t.profitCents<0?'negative':'positive'}" id="portfolioGain">${money(t.profitCents)}</strong></div><div><span>CHECKING AVAILABLE</span><strong>${money(cents(bank.checking))}</strong></div><div><span>TRADING FEES PAID</span><strong>${money(t.feeCents)}</strong></div></div>
    ${p.legacyCents?'<div class="invest-feed-note">Your previous investment balance of '+money(p.legacyCents)+' is preserved as unallocated money. <button type="button" id="releaseLegacy" '+(this.isRunning()?'disabled':'')+'>Move it to checking</button></div>':''}
    <section class="invest-chart-card"><div class="invest-chart-tabs" role="tablist" aria-label="Investment chart"><button type="button" role="tab" data-chart-tab="funds" aria-selected="${this.chartTab==='funds'}">Explore funds</button><button type="button" role="tab" data-chart-tab="portfolio" aria-selected="${this.chartTab==='portfolio'}">My portfolio</button></div><div class="invest-chart-heading"><div><h4 id="investChartTitle">${this.chartTab==='funds'?'Compare fund performance':'Your portfolio performance'}</h4><p id="investChartCaption"></p></div><div class="invest-ranges" role="group" aria-label="Chart time period">${['1W','1M','YTD','1Y','5Y'].map(r=>'<button type="button" data-range="'+r+'" aria-pressed="'+(r===this.range)+'">'+r+'</button>').join('')}</div></div><div class="invest-series-select" ${this.chartTab==='portfolio'?'hidden':''}>${FUNDS.map(f=>'<label style="--fund-color:'+f.color+'"><input type="checkbox" data-compare="'+f.symbol+'" '+(this.selected.has(f.symbol)?'checked':'')+'><span>'+f.name+'</span></label>').join('')}</div><div id="investChart" class="invest-chart"></div><p class="invest-chart-note">${this.chartTab==='funds'?'Percentage change from the start of the selected period. Adjusted fund history accounts for splits and distributions.':'Net gain or loss after trading fees, including realized gains and credited fund distributions. Adding money is not counted as a gain. History begins with your first purchase.'}</p></section>
    <div class="invest-lower-grid"><section class="invest-funds"><div class="invest-section-heading"><h4>Find your mix</h4><span>6 FUNDS · FRACTIONAL SHARES</span></div><div class="invest-fund-grid">${FUNDS.map(f=>{
      const price=quotePrice(market,f.symbol),history=market?.funds[f.symbol]?.history||[],prior=history.at(-2)?.[1],change=prior?(price/prior-1)*100:null;
      return '<button type="button" class="invest-fund-card '+(this.form.symbol===f.symbol?'chosen':'')+'" data-select-fund="'+f.symbol+'" style="--fund-color:'+f.color+'"><div class="fund-card-top"><span>'+f.symbol+'</span><small class="'+(change<0?'negative':'positive')+'">'+(change===null?'—':(change>=0?'+':'')+change.toFixed(2)+'%')+'</small></div><strong>'+f.name+'</strong><p>'+f.description+'</p><div class="fund-card-price">'+(price===null?'—':money(cents(price)))+'<small> / share</small></div><small class="fund-risk">'+f.risk+'</small></button>';
    }).join('')}</div></section>
    <section class="invest-trade-card"><h4>Make an investment</h4><p class="invest-trade-sub">Your checking account funds every purchase.</p><div class="invest-side-picker" role="group" aria-label="Trade direction"><button type="button" data-trade-side="buy" aria-pressed="${this.form.side==='buy'}">Buy</button><button type="button" data-trade-side="sell" aria-pressed="${this.form.side==='sell'}">Sell</button></div>
    <form id="tradeForm" novalidate><label for="tradeFund">Fund</label><select id="tradeFund">${FUNDS.map(f=>'<option value="'+f.symbol+'" '+(f.symbol===this.form.symbol?'selected':'')+'>'+f.name+' · '+f.symbol+'</option>').join('')}</select><div class="invest-form-row"><div><label for="tradeMode">Enter an amount in</label><select id="tradeMode"><option value="dollars" ${this.form.mode==='dollars'?'selected':''}>Dollars</option><option value="shares" ${this.form.mode==='shares'?'selected':''}>Shares</option></select></div><div><label for="tradeAmount">${this.form.mode==='shares'?'Shares':'Dollars before fee'}</label><input id="tradeAmount" type="number" min="${this.form.mode==='shares'?'0.000001':'.01'}" step="${this.form.mode==='shares'?'0.000001':'.01'}" inputmode="decimal" placeholder="${this.form.mode==='shares'?'0.000000':'0.00'}" value="${esc(this.form.amount)}" required></div></div><div id="tradeEstimate" class="invest-estimate" aria-live="polite"></div><p class="invest-fee-note">0.5% fee per buy or sell, rounded to cents; minimum $0.01. Fractional shares to 6 decimal places.</p><button type="button" id="reviewTrade" class="invest-review" ${blocked?'disabled':''}>Review ${this.form.side==='buy'?'purchase':'sale'} →</button>${blocked?'<p class="invest-form-note">'+(this.isRunning()?'Finish your business day before trading.':'Current closing prices are required to trade.')+'</p>':''}</form>
    ${this.review?this.reviewHTML():''}<div id="investNotice" tabindex="-1" role="status" class="invest-notice ${this.error?'error':''}" ${this.notice?'':'hidden'}>${esc(this.notice)}</div></section></div>
    <section class="invest-holdings"><div class="invest-section-heading"><h4>Your holdings</h4><span>${market?'VALUED AT '+date(quoteDate).toUpperCase():'LAST KNOWN VALUE'}</span></div>${this.holdingsHTML(p,market,t)}<div class="invest-performance-detail">Realized gain / loss: ${money(t.realizedCents)} · Unrealized: ${money(t.unrealizedCents)} · Fund distributions: ${money(t.dividendCents)}</div></section>
    <details class="invest-activity"><summary>Trade history · ${p.trades.length} ${p.trades.length===1?'trade':'trades'}</summary>${p.trades.length?'<div class="invest-table-wrap"><table><thead><tr><th>Executed</th><th>Trade</th><th>Shares</th><th>Close date</th><th>Price</th><th>Fee</th><th>Checking movement</th></tr></thead><tbody>'+p.trades.slice().reverse().map(x=>'<tr><td>'+esc(new Date(x.executedAt).toLocaleDateString('en-US'))+'</td><td>'+x.side.toUpperCase()+' '+x.symbol+'</td><td>'+shares(x.units)+'</td><td>'+date(x.priceDate)+'</td><td>'+money(cents(x.price))+'</td><td>'+money(x.feeCents)+'</td><td>'+(x.side==='buy'?'−':'+')+money(x.totalCents)+'</td></tr>').join('')+'</tbody></table></div>':'<p>No purchases or sales yet.</p>'}</details>
    <p class="invest-bottom-note">Game money only. Prices follow real trading days, not lemonade game days. All six choices are ETFs. Lower risk does not mean guaranteed returns. Fund distributions are credited to checking on the provider’s ex-date; taxes are not simulated.${market?' Source: '+esc(market.source)+'.':''}</p>`;
    this.renderChart();this.updateEstimate();
  }
  holdingsHTML(p,market,totals){
    const positions=FUNDS.filter(f=>p.positions[f.symbol]?.units);
    if(!positions.length)return '<div class="invest-empty-holdings">Your portfolio starts here.<span>Buy a little of a fund above to start tracking your investments.</span></div>';
    return '<div class="invest-table-wrap"><table><thead><tr><th>Fund</th><th>Shares</th><th>Average cost*</th><th>Market value</th><th>Gain / loss*</th><th>Allocation</th><th></th></tr></thead><tbody>'+positions.map(f=>{
      const pos=p.positions[f.symbol],price=quotePrice(market,f.symbol)??pos.lastPrice,value=Math.round(pos.units/SHARE_SCALE*price*100),gain=value-pos.costCents;
      return '<tr><td><strong>'+f.symbol+'</strong><small>'+f.name+'</small></td><td>'+shares(pos.units)+'</td><td>'+money(Math.round(pos.costCents/(pos.units/SHARE_SCALE)))+'</td><td>'+money(value)+'</td><td class="'+(gain<0?'negative':'positive')+'">'+money(gain)+'</td><td>'+((value/(totals.valueCents||1))*100).toFixed(1)+'%</td><td><button type="button" data-sell-fund="'+f.symbol+'">Sell all</button></td></tr>';
    }).join('')+'</tbody></table></div><p class="invest-small-note">*Average cost and unrealized gain / loss include purchase fees.</p>';
  }
  updateEstimate(){
    const el=this.host.querySelector('#tradeEstimate');if(!el)return;
    const pos=ensurePortfolio(this.getState().bank).positions[this.form.symbol];
    if(!this.form.amount){el.textContent='You own '+shares(pos?.units||0)+' '+this.form.symbol+' shares. Enter an amount to see the fee and total.';return}
    try{const q=quoteTrade(this.getState().bank,this.market.data,this.form);el.innerHTML='<div><span>'+shares(q.units)+' shares × '+money(cents(q.price))+'</span><b>'+money(q.notionalCents)+'</b></div><div><span>Trading fee · 0.5%</span><b>'+money(q.feeCents)+'</b></div><div class="estimate-total"><span>'+(q.side==='buy'?'Total from checking':'Net to checking')+'</span><b>'+money(q.totalCents)+'</b></div><small>Checking after trade: '+money(q.checkingAfterCents)+' · Close '+date(q.priceDate)+'</small>';}catch(e){el.textContent=e.message}
  }
  reviewHTML(){const q=this.review;return '<section class="invest-confirmation" aria-label="Review investment trade"><h5>Confirm '+(q.side==='buy'?'purchase':'sale')+'</h5><p>'+shares(q.units)+' '+q.symbol+' shares at '+money(cents(q.price))+' per share<br>Closing price: '+date(q.priceDate)+'</p><p>Fee: <strong>'+money(q.feeCents)+'</strong><br>'+(q.side==='buy'?'Checking pays':'Checking receives')+': <strong>'+money(q.totalCents)+'</strong><br>Checking afterward: '+money(q.checkingAfterCents)+'</p><div><button type="button" id="cancelTrade">Cancel</button><button type="button" id="confirmTrade">Confirm '+(q.side==='buy'?'purchase':'sale')+'</button></div></section>'}
  renderChartControls(){for(const b of this.host.querySelectorAll('[data-range]'))b.setAttribute('aria-pressed',String(b.dataset.range===this.range));this.renderChart()}
  renderChart(){
    const host=this.host.querySelector('#investChart'),caption=this.host.querySelector('#investChartCaption');if(!host)return;
    const market=this.market.data;
    if(this.chartTab==='funds'){
      const selected=FUNDS.filter(f=>this.selected.has(f.symbol)),series=selected.map(f=>({name:f.name,color:f.color,points:fundSeries(market,f.symbol,this.range)}));
      const dates=series.flatMap(s=>s.points.map(p=>p.date)).sort();caption.textContent=dates.length?date(dates[0])+' → '+date(dates.at(-1))+' · total return (%)':market?'Choose funds to compare':'History will appear when closing prices are available.';
      drawChart(host,series,{empty:market?'Select a fund above to display its history.':'Waiting for verified market history. Six funds are ready to explore below.'});
    }else{
      const p=ensurePortfolio(this.getState().bank),points=portfolioHistory(this.getState().bank,market).filter(s=>s.date>=rangeStart(this.range,market?.asOf||previousSession())).map(s=>({date:s.date,value:s.profitCents/100}));
      caption.textContent=points.length?date(points[0].date)+' → '+date(points.at(-1).date)+' · net gain / loss ($)':'No investment performance yet';
      drawChart(host,[{name:'Portfolio net gain / loss',color:'#26734b',points}],{portfolio:true,empty:p.trades.length?'No portfolio observations in this period. Select a longer interval.':'Make your first purchase to start your portfolio history. Your money has no investment history before you buy.'});
    }
  }
}
