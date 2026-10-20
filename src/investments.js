import {SYMBOLS} from './funds.js';
import {quotePrice,marketFresh} from './market-data.js';
export const SHARE_SCALE=1_000_000,FEE_RATE=.005;
export const cents=value=>Math.round((value+Number.EPSILON)*100);
export const money=c=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(c/100);
export const shares=units=>new Intl.NumberFormat('en-US',{maximumFractionDigits:6}).format(units/SHARE_SCALE);
export function newPortfolio(legacyCents=0){return {version:1,positions:{},trades:[],events:[],snapshots:[],sequence:1,legacyCents,marketDate:null};}
export function ensurePortfolio(bank){
  if(!bank.portfolio){bank.portfolio=newPortfolio(Math.max(0,cents(Number(bank.investments)||0)));}
  const p=bank.portfolio;
  if(p.version!==1||!p.positions||!Array.isArray(p.trades)||!Array.isArray(p.events)||!Array.isArray(p.snapshots))throw new Error('This portfolio save format is not supported.');
  return p;
}
export function portfolioTotals(bank,market){
  const p=ensurePortfolio(bank);let value=p.legacyCents||0,basis=0,realized=0,fees=0,dividends=0,totalBought=0;
  for(const symbol of SYMBOLS){const pos=p.positions[symbol];if(!pos)continue;const price=quotePrice(market,symbol)??pos.lastPrice;value+=Math.round(pos.units/SHARE_SCALE*(price||0)*100);basis+=pos.costCents;}
  for(const t of p.trades){realized+=t.realizedCents||0;fees+=t.feeCents;if(t.side==='buy')totalBought+=t.totalCents;}
  for(const e of p.events)dividends+=e.amountCents||0;
  const unrealized=value-(p.legacyCents||0)-basis;
  return {valueCents:value,basisCents:basis,realizedCents:realized,unrealizedCents:unrealized,dividendCents:dividends,feeCents:fees,profitCents:realized+unrealized+dividends,totalBoughtCents:totalBought};
}
function numberInput(value){
  if(typeof value==='string'&&!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim()))throw new Error('Enter a positive number without commas.');
  const n=Number(value);if(!Number.isFinite(n)||n<=0||n>1e9)throw new Error('Enter an amount greater than zero.');return n;
}
export function quoteTrade(bank,market,{symbol,side,mode,amount},now=new Date()){
  if(!SYMBOLS.includes(symbol)||!['buy','sell'].includes(side)||!['dollars','shares'].includes(mode))throw new Error('Choose a valid fund and trade type.');
  const p=ensurePortfolio(bank);if(!marketFresh(market,now))throw new Error('Refresh prices before trading. Trades use the latest prior trading day’s close.');
  if(p.marketDate&&market.asOf<p.marketDate)throw new Error('These quotes are older than your portfolio. Refresh prices first.');
  if(bank.loans?.some(l=>l.secured&&l.balance>0&&!l.settling)){if(side==='sell')throw new Error('These investments secure a loan. Repay the secured loan before selling.');if(bank.loans.some(l=>l.collateralDue))throw new Error('Settle the overdue secured loan before investing.');}
  const n=numberInput(amount),price=quotePrice(market,symbol);
  const units=Math.floor((mode==='shares'?n:n/price)*SHARE_SCALE+1e-7);
  if(!Number.isSafeInteger(units)||units<1)throw new Error('The smallest trade is 0.000001 share.');
  const notionalCents=Math.round(units/SHARE_SCALE*price*100);
  if(notionalCents<1)throw new Error('The trade must be worth at least $0.01.');
  const feeCents=Math.max(1,Math.round(notionalCents*FEE_RATE)),totalCents=side==='buy'?notionalCents+feeCents:notionalCents-feeCents;
  if(side==='buy'&&totalCents>cents(bank.checking))throw new Error('Not enough money in checking to cover the investment and fee.');
  const position=p.positions[symbol];
  if(side==='sell'&&(!position||units>position.units))throw new Error('You do not own enough shares for this sale.');
  if(side==='sell'&&totalCents<0)throw new Error('Choose a larger sale so the proceeds cover the fee.');
  const removedCost=side==='sell'?(units===position.units?position.costCents:Math.round(position.costCents*units/position.units)):0;
  return {symbol,side,mode,units,price,priceDate:market.asOf,notionalCents,feeCents,totalCents,removedCost,realizedCents:side==='sell'?totalCents-removedCost:0,checkingAfterCents:cents(bank.checking)+(side==='buy'?-totalCents:totalCents),signature:JSON.stringify([symbol,side,units,price,market.asOf,feeCents,cents(bank.checking),position?.units||0,position?.costCents||0,p.sequence])};
}
export function recordSnapshot(bank,market){
  if(!market)return;const p=ensurePortfolio(bank),t=portfolioTotals(bank,market);bank.investments=t.valueCents/100;
  if(!p.trades.length)return;
  const snapshot={date:market.asOf,valueCents:t.valueCents,profitCents:t.profitCents};
  const previous=p.snapshots.findIndex(s=>s.date===snapshot.date);
  if(previous>=0)p.snapshots[previous]=snapshot;else p.snapshots.push(snapshot);
  p.snapshots.sort((a,b)=>a.date.localeCompare(b.date));
}
export function executeTrade(state,market,request,expectedSignature,now=new Date()){
  const q=quoteTrade(state.bank,market,request,now);if(q.signature!==expectedSignature)throw new Error('Your balance or price changed. Review the trade again.');
  const bank=state.bank,p=ensurePortfolio(bank),position=p.positions[q.symbol]||{units:0,costCents:0,lastPrice:q.price};
  if(q.side==='buy'){position.units+=q.units;position.costCents+=q.totalCents;}
  else {position.units-=q.units;position.costCents-=q.removedCost;}
  position.lastPrice=q.price;
  if(position.units)p.positions[q.symbol]=position;else delete p.positions[q.symbol];
  bank.checking=q.checkingAfterCents/100;
  const trade={id:p.sequence++,side:q.side,symbol:q.symbol,units:q.units,price:q.price,priceDate:q.priceDate,notionalCents:q.notionalCents,feeCents:q.feeCents,totalCents:q.totalCents,realizedCents:q.realizedCents,executedAt:now.toISOString(),gameDay:state.day};p.trades.push(trade);p.marketDate=market.asOf;
  state.ledger.push({day:state.day,desc:(q.side==='buy'?'Bought ':'Sold ')+shares(q.units)+' '+q.symbol+' shares at '+money(cents(q.price))+'; fee '+money(q.feeCents)+'; close '+q.priceDate,category:'investment '+q.side,cash:0,bankChange:(q.side==='buy'?-q.totalCents:q.totalCents)/100,investmentChange:(q.side==='buy'?q.notionalCents:-q.notionalCents)/100,fee:q.feeCents/100,priceDate:q.priceDate});
  recordSnapshot(bank,market);return trade;
}
export function applyMarket(state,market){
  const p=ensurePortfolio(state.bank);if(p.marketDate&&market.asOf<p.marketDate)return false;
  if(p.marketDate){
    const events=SYMBOLS.flatMap(symbol=>market.funds[symbol].events.map(e=>({...e,symbol}))).filter(e=>e.date>p.marketDate&&e.date<=market.asOf).sort((a,b)=>a.date.localeCompare(b.date)||(a.type==='split'?-1:1));
    for(const e of events){
      const position=p.positions[e.symbol];if(!position?.units)continue;
      const id=e.symbol+':'+e.type+':'+e.date;if(p.events.some(x=>x.id===id))continue;
      if(e.type==='split'){
        const old=position.units;position.units=Math.round(position.units*e.value);position.lastPrice/=e.value;
        p.events.push({id,type:'split',symbol:e.symbol,date:e.date,ratio:e.value});
        state.ledger.push({day:state.day,category:'investment split',cash:0,desc:e.symbol+' share split ×'+e.value+' ('+shares(old)+' → '+shares(position.units)+')'});
      }else{
        const amountCents=Math.round(position.units/SHARE_SCALE*e.value*100);state.bank.checking=(cents(state.bank.checking)+amountCents)/100;
        p.events.push({id,type:'dividend',symbol:e.symbol,date:e.date,amountCents});
        state.ledger.push({day:state.day,category:'investment dividend',cash:0,bankChange:amountCents/100,desc:e.symbol+' fund distribution for '+e.date+' credited to checking'});
      }
    }
  }
  p.marketDate=market.asOf;for(const symbol of SYMBOLS)if(p.positions[symbol])p.positions[symbol].lastPrice=quotePrice(market,symbol);
  recordSnapshot(state.bank,market);return true;
}
export function releaseLegacy(state){
  if(state.bank.loans?.some(l=>l.secured&&l.balance>0))throw new Error('Repay the secured loan before releasing collateral.');
  const p=ensurePortfolio(state.bank),amount=p.legacyCents||0;if(!amount)return;
  state.bank.checking=(cents(state.bank.checking)+amount)/100;p.legacyCents=0;
  state.ledger.push({day:state.day,category:'investment transfer',cash:0,bankChange:amount/100,investmentChange:-amount/100,desc:'Transferred previous investment balance to checking'});
}

/** Replay dated trades against daily closes so days away from the game still appear.
 * Yahoo's historical closes are split-normalized to the current date. Undo future
 * splits when valuing the shares that actually existed on an earlier date. */
export function portfolioHistory(bank,market){
  const p=ensurePortfolio(bank);if(!p.trades.length)return [];
  if(!market)return p.snapshots;
  const first=p.trades[0].priceDate,priceMaps={},currentPrice={},futureFactor={},units={},eventMap=new Map();
  for(const symbol of SYMBOLS){priceMaps[symbol]=new Map(market.funds[symbol].history.map(x=>[x[0],x[1]]));futureFactor[symbol]=1;
    for(const e of market.funds[symbol].events)if(e.date>=first)eventMap.set(symbol+':'+e.type+':'+e.date,{...e,symbol});
  }
  // Preserve older corporate events if they eventually fall outside the provider's window.
  for(const e of p.events)if(e.date>=first&&!eventMap.has(e.id))eventMap.set(e.id,{...e,value:e.ratio,recorded:true});
  const events=[...eventMap.values()].filter(e=>e.date<=market.asOf);
  for(const e of events)if(e.type==='split')futureFactor[e.symbol]*=e.value;
  const dates=[...new Set([...SYMBOLS.flatMap(s=>market.funds[s].history.map(x=>x[0])),...p.trades.map(t=>t.priceDate),...events.map(e=>e.date)])].filter(d=>d>=first&&d<=market.asOf).sort();
  const earliest=market.funds[SYMBOLS[0]].history[0][0],result=p.snapshots.filter(s=>s.date<earliest);
  let purchases=0,sales=0,distributions=0;
  for(const day of dates){
    const actions=events.filter(e=>e.date===day).sort((a,b)=>(a.type==='split'?0:1)-(b.type==='split'?0:1));
    for(const e of actions){if(e.type==='split'){units[e.symbol]=Math.round((units[e.symbol]||0)*e.value);futureFactor[e.symbol]/=e.value;}
      else distributions+=e.recorded?e.amountCents:Math.round((units[e.symbol]||0)/SHARE_SCALE*e.value*100);}
    for(const t of p.trades.filter(t=>t.priceDate===day)){
      units[t.symbol]=(units[t.symbol]||0)+(t.side==='buy'?t.units:-t.units);
      if(t.side==='buy')purchases+=t.totalCents;else sales+=t.totalCents;
      currentPrice[t.symbol]=t.price;
    }
    for(const symbol of SYMBOLS)if(priceMaps[symbol].has(day))currentPrice[symbol]=priceMaps[symbol].get(day)*futureFactor[symbol];
    if(day<earliest)continue;
    let value=0;for(const symbol of SYMBOLS)value+=Math.round((units[symbol]||0)/SHARE_SCALE*(currentPrice[symbol]||0)*100);
    result.push({date:day,valueCents:value+(p.legacyCents||0),profitCents:value+sales+distributions-purchases});
  }
  return result;
}
