import test from 'node:test';
import assert from 'node:assert/strict';
import {ensurePortfolio,quoteTrade,executeTrade,portfolioTotals,portfolioHistory,applyMarket,cents,releaseLegacy} from '../src/investments.js';
import {marketFresh,previousSession,validateMarket,fundSeries} from '../src/market-data.js';
import {marketFixture,gameWithChecking} from './fixtures/market.js';
const now=new Date('2026-10-20T16:00:00Z');
function setup(){const state=gameWithChecking(),market=marketFixture(now);for(const f of Object.values(market.funds))f.history.at(-1)[1]=100;applyMarket(state,market);return {state,market}}
function trade(state,market,request,time=now){const q=quoteTrade(state.bank,market,request,time);return executeTrade(state,market,request,q.signature,time)}
test('a fractional buy uses only checking and accounts for its fee and saved basis',()=>{
  const {state,market}=setup();const request={symbol:'SPY',side:'buy',mode:'dollars',amount:'10'};
  const q=quoteTrade(state.bank,market,request,now);assert.equal(q.units,100000);assert.equal(q.feeCents,5);assert.equal(q.totalCents,1005);
  trade(state,market,request);assert.equal(state.bank.checking,989.95);assert.equal(state.cash,40);assert.equal(state.bank.portfolio.positions.SPY.costCents,1005);assert.equal(portfolioTotals(state.bank,market).profitCents,-5);assert.equal(state.ledger.at(-1).bankChange,-10.05);
  const restored=JSON.parse(JSON.stringify(state));assert.equal(ensurePortfolio(restored.bank).positions.SPY.units,100000);
});
test('partial and full sales allocate basis and fees exactly, with no leftover shares or money',()=>{
  const {state,market}=setup();trade(state,market,{symbol:'DIA',side:'buy',mode:'shares',amount:'2'});
  market.funds.DIA.history.at(-1)[1]=120;
  trade(state,market,{symbol:'DIA',side:'sell',mode:'shares',amount:'.5'});
  assert.equal(state.bank.portfolio.positions.DIA.costCents,15075);assert.equal(state.bank.portfolio.trades.at(-1).realizedCents,945);
  trade(state,market,{symbol:'DIA',side:'sell',mode:'dollars',amount:'180'});
  assert.equal(state.bank.portfolio.positions.DIA,undefined);assert.equal(state.bank.checking,1037.8);assert.equal(portfolioTotals(state.bank,market).profitCents,3780);
  assert.equal(state.bank.portfolio.trades.reduce((n,t)=>n+t.feeCents,0),220);
});
test('overspending, overselling, invalid input, stale prices and duplicate confirmation leave balances unchanged',()=>{
  const {state,market}=setup(),before=JSON.stringify(state);
  for(const amount of ['0','-2','NaN','Infinity','1e9'])assert.throws(()=>quoteTrade(state.bank,market,{symbol:'SPY',side:'buy',mode:'dollars',amount},now));
  assert.throws(()=>quoteTrade(state.bank,market,{symbol:'SPY',side:'buy',mode:'dollars',amount:'1000'},now),/Not enough/);
  assert.throws(()=>quoteTrade(state.bank,market,{symbol:'SPY',side:'sell',mode:'shares',amount:'1'},now),/enough shares/);
  assert.equal(JSON.stringify(state),before);
  const request={symbol:'SPY',side:'buy',mode:'dollars',amount:'100'},q=quoteTrade(state.bank,market,request,now);
  executeTrade(state,market,request,q.signature,now);const after=JSON.stringify(state);assert.throws(()=>executeTrade(state,market,request,q.signature,now),/Review/);assert.equal(JSON.stringify(state),after);
  assert.throws(()=>quoteTrade(state.bank,market,request,new Date('2026-10-21T16:00:00Z')),/Refresh prices/);
});
test('splits retain basis and distributions credit checking exactly once across reloads',()=>{
  const {state,market}=setup();trade(state,market,{symbol:'SGOV',side:'buy',mode:'shares',amount:'2'});
  const next=structuredClone(market);next.asOf='2026-10-20';for(const f of Object.values(next.funds))f.history.push(['2026-10-20',100,100]);
  next.funds.SGOV.events=[{date:'2026-10-20',type:'split',value:2},{date:'2026-10-20',type:'dividend',value:.25}];next.funds.SGOV.history.at(-1)[1]=50;
  applyMarket(state,next);assert.equal(state.bank.portfolio.positions.SGOV.units,4000000);assert.equal(state.bank.portfolio.positions.SGOV.costCents,20100);assert.equal(state.bank.checking,800);
  assert.equal(portfolioTotals(state.bank,next).profitCents,0);const copy=JSON.parse(JSON.stringify(state));applyMarket(copy,next);assert.equal(copy.bank.checking,800);assert.equal(copy.bank.portfolio.events.length,2);
  assert.equal(applyMarket(copy,market),false);
});
test('legacy investment money remains unallocated and can be transferred back without inventing shares',()=>{
  const state=gameWithChecking();state.bank.investments=17.25;const p=ensurePortfolio(state.bank);assert.equal(p.legacyCents,1725);assert.deepEqual(p.positions,{});
  releaseLegacy(state);assert.equal(state.bank.checking,1017.25);assert.equal(portfolioTotals(state.bank,null).valueCents,0);releaseLegacy(state);assert.equal(state.bank.checking,1017.25);
});
test('prior-session pricing uses New York dates, weekends and market holidays',()=>{
  assert.equal(previousSession(now),'2026-10-19');assert.equal(previousSession(new Date('2026-10-19T02:00:00Z')),'2026-10-16');
  assert.equal(previousSession(new Date('2026-12-26T16:00:00Z')),'2026-12-24');assert.equal(previousSession(new Date('2026-04-04T16:00:00Z')),'2026-04-02');
  assert.equal(previousSession(new Date('2025-01-10T16:00:00Z')),'2025-01-08');assert.equal(marketFresh(marketFixture(now),now),true);
});
test('price validation rejects partial, duplicate, invalid and current-day series; ranges include five years',()=>{
  const market=marketFixture(now);assert.equal(validateMarket(market,now).asOf,'2026-10-19');
  const partial=structuredClone(market);delete partial.funds.SLV;assert.throws(()=>validateMarket(partial,now));
  const invalid=structuredClone(market);invalid.funds.DIA.history.at(-1)[1]=NaN;assert.throws(()=>validateMarket(invalid,now));
  const duplicate=structuredClone(market);duplicate.funds.DIA.history.push(duplicate.funds.DIA.history.at(-1));assert.throws(()=>validateMarket(duplicate,now));
  const badDate=structuredClone(market);badDate.funds.SPY.history[0][0]='2021-02-30';assert.throws(()=>validateMarket(badDate,now));
  const current=structuredClone(market);current.asOf='2026-10-20';assert.throws(()=>validateMarket(current,now));
  for(const range of ['1W','1M','YTD','1Y','5Y']){const series=fundSeries(market,'SPY',range);assert.ok(series.length>1);assert.equal(series[0].value,0);assert.equal(series.at(-1).date,market.asOf);}
  assert.ok(fundSeries(market,'SPY','5Y').length>1200);
});
test('portfolio chart observations start at purchase, exclude contributions and include both buy and sell fees',()=>{
  const {state,market}=setup();assert.equal(state.bank.portfolio.snapshots.length,0);
  trade(state,market,{symbol:'DIA',side:'buy',mode:'dollars',amount:'100'});assert.equal(state.bank.portfolio.snapshots[0].profitCents,-50);
  trade(state,market,{symbol:'SPY',side:'buy',mode:'dollars',amount:'100'});assert.equal(state.bank.portfolio.snapshots.length,1);assert.equal(state.bank.portfolio.snapshots[0].profitCents,-100);
  const snapshot=state.bank.portfolio.snapshots[0];assert.equal(snapshot.valueCents,20000);assert.equal(snapshot.date,market.asOf);
});

test('portfolio history fills intervening market days without inventing performance before buying',()=>{
  const earlier=new Date('2026-10-19T16:00:00Z'),state=gameWithChecking(),old=marketFixture(earlier);
  for(const f of Object.values(old.funds))f.history.at(-1)[1]=100;
  applyMarket(state,old);trade(state,old,{symbol:'SPY',side:'buy',mode:'shares',amount:'1'},earlier);
  const market=structuredClone(old);market.asOf='2026-10-19';for(const f of Object.values(market.funds))f.history.push(['2026-10-19',120,120]);
  applyMarket(state,market);const history=portfolioHistory(state.bank,market);
  assert.equal(history.length,2);assert.equal(history[0].date,'2026-10-16');assert.equal(history[0].profitCents,-50);assert.equal(history[1].profitCents,1950);
  trade(state,market,{symbol:'SPY',side:'sell',mode:'shares',amount:'1'});assert.equal(portfolioHistory(state.bank,market).at(-1).profitCents,1890);
});
test('historical chart reverses future split normalization so a split cannot invent returns',()=>{
  const {state,market}=setup();trade(state,market,{symbol:'SGOV',side:'buy',mode:'shares',amount:'2'});
  const next=structuredClone(market);next.asOf='2026-10-20';for(const f of Object.values(next.funds))f.history.push(['2026-10-20',100,100]);
  next.funds.SGOV.history.at(-2)[1]=50;next.funds.SGOV.history.at(-1)[1]=50;
  next.funds.SGOV.events=[{date:'2026-10-20',type:'split',value:2},{date:'2026-10-20',type:'dividend',value:.25}];
  applyMarket(state,next);const history=portfolioHistory(state.bank,next);assert.equal(history[0].profitCents,-100);assert.equal(history.at(-1).profitCents,0);
});
