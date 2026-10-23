import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {LiveMarketService} from '../server/live-market-service.js';
import {normalizeBitcoin,historyRequest,normalizeBars} from '../server/alpaca-provider.js';
import {decorateBitcoin,tradeQuote,LIVE_LIMITS,HISTORY_RANGES} from '../src/live-market-data.js';
import {quoteTrade,executeTrade,portfolioTotals,applyLiveMarks,applyMarket,portfolioHistory} from '../src/investments.js';
import {alpacaFixture} from './fixtures/alpaca.js';
import {marketFixture,gameWithChecking} from './fixtures/market.js';
import {SYMBOLS} from '../src/funds.js';
import {originate} from '../src/business.js';
import {settleCollateral} from '../src/secured-investments.js';
import {purchaseHouse,downPaymentAssets} from '../src/mortgage.js';
const SATURDAY=Date.parse('2026-10-24T02:00:00Z');
const bitcoin=(now,price=60000)=>({snapshots:{'BTC/USD':{latestTrade:{p:price,t:now.toISOString()},prevDailyBar:{c:59000,t:new Date(Date.parse(now.toISOString().slice(0,10)+'T00:00:00Z')-86400000).toISOString()}}}});
function fixture(start=SATURDAY){
 let time=start,mode='ok';const calls=[],sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('../cloud/migrations/0005_live_market.sql',import.meta.url),'utf8'));
 const DB={prepare(query){
  let args=[];
  return {bind(...a){args=a;return this},async first(){return sql.prepare(query).get(...args)||null},async run(){return {meta:{changes:Number(sql.prepare(query).run(...args).changes)}}}};
 }};
 const env={DB,ALPACA_LIVE_ENABLED:'true',ALPACA_API_KEY_ID:'TEST_BTC_KEY',ALPACA_API_SECRET_KEY:'TEST_BTC_SECRET'},clock=()=>new Date(time);
 const fetcher=async(url,options)=>{calls.push({url,options,at:time});if(url.includes('/crypto/')){if(mode==='403'||mode==='429')return new Response('{}',{status:+mode});if(mode==='network')throw Error('offline');if(url.includes('/bars?'))return Response.json({bars:{'BTC/USD':[{t:new Date(time-3600000).toISOString(),c:59000},{t:new Date(time-60000).toISOString(),c:60000}]}});return Response.json(bitcoin(clock()))}
  if(url.includes('/calendar?'))return Response.json([{date:'2026-10-23',open:'09:30',close:'16:00'},{date:'2026-10-26',open:'09:30',close:'16:00'}]);
  return Response.json(Object.fromEntries(SYMBOLS.map(s=>[s,{latestTrade:{p:200,t:clock().toISOString()}}])));
 };
 return {env,calls,clock,advance:n=>time+=n,setMode:m=>mode=m,service:()=>new LiveMarketService(env,{clock,fetcher})};
}
async function ready(f){let data;for(let i=0;i<3;i++){if(i)f.advance(5000);data=await f.service().quotes()}return data}

test('Bitcoin is tradable at night and weekends while ETFs remain closed, with fractional fees and real gain accounting',t=>{
 t.mock.timers.enable({apis:['Date'],now:SATURDAY});
 for(const stamp of ['2026-10-23T02:00:00Z','2026-10-24T02:00:00Z','2026-10-25T17:00:00Z']){
  t.mock.timers.setTime(Date.parse(stamp));const now=new Date(stamp),data=alpacaFixture(now),market={...marketFixture(now),liveQuotes:data},s=gameWithChecking(20),r={symbol:'BTC/USD',side:'buy',mode:'dollars',amount:20,marketMode:'live',accountId:'BitcoinPlayer'};
  assert.equal(data.session.open,false);assert.equal(tradeQuote(data,'BTC/USD',now).price,60000);assert.throws(()=>tradeQuote(data,'SPY',now),/regular US market hours/);
  const q=quoteTrade(s.bank,market,r,now);executeTrade(s,market,r,q.signature,now);assert.equal(s.bank.checking,(2000-q.totalCents)/100);const remaining=s.bank.checking;assert.ok(s.bank.portfolio.positions['BTC/USD'].units>0);assert.equal(s.bank.portfolio.trades[0].feed,'crypto-us');assert.equal(s.bank.portfolio.trades[0].accountId,'BitcoinPlayer');
  data.quotes['BTC/USD'].price=66000;applyLiveMarks(s,data,now);assert.equal(s.bank.checking,remaining);assert.ok(portfolioTotals(s.bank,market).valueCents>2000);
  const sell={...r,side:'sell',mode:'shares',amount:s.bank.portfolio.positions['BTC/USD'].units/1000000},sale=quoteTrade(s.bank,market,sell,now);executeTrade(s,market,sell,sale.signature,now);assert.ok(s.bank.checking>20);assert.ok(sale.realizedCents>0);assert.equal(s.bank.portfolio.positions['BTC/USD'],undefined);
 }
});
test('Bitcoin price normalization preserves genuine timestamps, UTC change, missing-data flags and stale-trade protection',()=>{
 const now=new Date(SATURDAY),raw=normalizeBitcoin(bitcoin(now),null,now);assert.equal(raw.quotes['BTC/USD'].change,1000);assert.equal(raw.quotes['BTC/USD'].previousCloseDate,'2026-10-23');
 const missing=normalizeBitcoin({snapshots:{}},raw,now);assert.equal(missing.quotes['BTC/USD'].timestamp,now.toISOString());assert.equal(missing.quotes['BTC/USD'].unavailable,true);
 const data=alpacaFixture(now);data.crypto.fetchedAt=new Date(+now-46000).toISOString();assert.throws(()=>tradeQuote(data,'BTC/USD',now),/Bitcoin quote is expired/);data.crypto.fetchedAt=now.toISOString();data.quotes['BTC/USD'].timestamp=new Date(+now-121000).toISOString();assert.throws(()=>tradeQuote(data,'BTC/USD',now),/expired/);
});
test('three players share the Bitcoin cache, both feeds receive refreshes, and no orders or SIP requests are possible',async()=>{
 const f=fixture(),first=await ready(f);assert.equal(first.crypto.status,'ok');assert.equal(first.quotes['BTC/USD'].price,60000);assert.equal(first.session.open,false);
 const count=f.calls.length;await Promise.all([f.service().quotes(),f.service().quotes(),f.service().quotes()]);assert.equal(f.calls.length,count);
 for(let i=0;i<18;i++){f.advance(5000);await Promise.all([f.service().quotes(),f.service().quotes(),f.service().quotes()])}
 const crypto=f.calls.filter(c=>c.url.includes('/crypto/'));assert.ok(crypto.length>=4);for(let i=1;i<crypto.length;i++)assert.ok(crypto[i].at-crypto[i-1].at>=20000);
 for(const c of f.calls){assert.equal(c.options.method,'GET');assert.equal(c.options.redirect,'manual');assert.ok(!c.url.includes('orders')&&!c.url.includes('sip'));if(c.url.includes('/crypto/'))assert.equal(new URL(c.url).searchParams.get('symbols'),'BTC/USD')}
 assert.ok((await f.service().diagnostics()).bitcoinCached);
});
test('crypto entitlement failure stops crypto retries without blocking the existing ETF feed, and rotation keeps budgets',async()=>{
 const f=fixture();await ready(f);f.advance(20000);f.setMode('403');const failed=await f.service().quotes();assert.equal(failed.crypto.status,'configuration');assert.equal(failed.status,'ok');assert.equal((await f.service().guard()).status,'ok');
 const cryptoCount=f.calls.filter(c=>c.url.includes('/crypto/')).length;for(let i=0;i<4;i++){f.advance(300000);await f.service().quotes()}assert.equal(f.calls.filter(c=>c.url.includes('/crypto/')).length,cryptoCount);const before=(await f.service().guard()).daily_calls;
 f.env.ALPACA_API_SECRET_KEY='ROTATED_TEST_BTC';f.setMode('ok');f.advance(20000);await f.service().quotes();assert.ok(f.calls.filter(c=>c.url.includes('/crypto/')).length>cryptoCount);assert.ok((await f.service().guard()).daily_calls>before);
});
test('Bitcoin history uses actual crypto bars for every range and 1D keeps observations across UTC midnight',async()=>{
 const f=fixture(Date.parse('2026-10-24T00:30:00Z'));
 for(const range of Object.keys(HISTORY_RANGES)){f.advance(2100);const h=await f.service().history('BTC/USD',range);assert.equal(h.feed,'crypto-us');assert.equal(h.adjustment,'none');assert.equal(h.delayedMinutes,0);assert.equal(h.points.length,2);if(range==='1D')assert.ok(h.points[0].timestamp.startsWith('2026-10-23'));const u=new URL(historyRequest('BTC/USD',range,f.clock()),'https://data.alpaca.markets');assert.equal(u.searchParams.get('symbols'),'BTC/USD');assert.equal(u.searchParams.has('feed'),false);assert.equal(u.searchParams.has('adjustment'),false);}
});
test('Bitcoin holdings survive legacy market updates, saves and history replay without fabricated distributions',()=>{
 const now=new Date(SATURDAY),s=gameWithChecking(100),market={...marketFixture(now),liveQuotes:alpacaFixture(now)},r={symbol:'BTC/USD',side:'buy',mode:'dollars',amount:20,marketMode:'live'},q=quoteTrade(s.bank,market,r,now);executeTrade(s,market,r,q.signature,now);const before=structuredClone(s.bank.portfolio.positions['BTC/USD']);applyMarket(s,market);assert.deepEqual(s.bank.portfolio.positions['BTC/USD'],before);assert.equal(s.bank.portfolio.events.length,0);assert.doesNotThrow(()=>portfolioHistory(s.bank,market));const restored=JSON.parse(JSON.stringify(s));assert.equal(portfolioTotals(restored.bank,market).valueCents,portfolioTotals(s.bank,market).valueCents);assert.throws(()=>quoteTrade(s.bank,market,{...r,marketMode:undefined},now),/fresh live quote/);
});
test('pledged Bitcoin uses a fresh crypto quote to repay and never gets liquidated at a missing daily ETF close',()=>{
 const now=new Date(SATURDAY),s=gameWithChecking(1000),market={...marketFixture(now),liveQuotes:alpacaFixture(now)},r={symbol:'BTC/USD',side:'buy',mode:'dollars',amount:400,marketMode:'live'},q=quoteTrade(s.bank,market,r,now);executeTrade(s,market,r,q.signature,now);const loan=originate(s,100,true);s.bank.checking=0;const result=settleCollateral(s,loan,market,now,{full:true,collection:false});assert.match(result,/repayment/);assert.equal(loan.balance,0);assert.equal(s.bank.portfolio.trades.at(-1).feed,'crypto-us');
});

test('regular-session polling gives both asset classes bounded refreshes without starving either feed',async()=>{
 const f=fixture(Date.parse('2026-10-23T15:00:00Z'));await ready(f);
 for(let i=0;i<30;i++){f.advance(5000);await f.service().quotes()}
 const stocks=f.calls.filter(c=>c.url.includes('/v2/stocks/snapshots')),crypto=f.calls.filter(c=>c.url.includes('/crypto/us/snapshots'));
 assert.ok(stocks.length>=15);assert.ok(crypto.length>=6);
 for(let i=1;i<stocks.length;i++)assert.ok(stocks[i].at-stocks[i-1].at<=10000);
 for(let i=1;i<crypto.length;i++)assert.ok(crypto[i].at-crypto[i-1].at<=25000);
 assert.ok((await f.service().guard()).minute_calls<=LIVE_LIMITS.minuteCalls);
});

test('fresh Bitcoin bid/ask updates move the card between sparse trades and execute at the correct side of the spread',t=>{
 t.mock.timers.enable({apis:['Date'],now:SATURDAY});const now=new Date(SATURDAY),tradeTime=new Date(+now-600000).toISOString(),payload=bitcoin(now,81105.95);payload.snapshots['BTC/USD'].latestTrade.t=tradeTime;payload.snapshots['BTC/USD'].latestQuote={bp:81090,ap:81110,t:now.toISOString()};
 const raw=normalizeBitcoin(payload,null,now),btc=decorateBitcoin(raw,'ok',now),data=alpacaFixture(now);data.quotes['BTC/USD']=btc.quote;data.crypto=btc.market;
 assert.equal(btc.quote.price,81100);assert.equal(btc.quote.priceBasis,'bid-ask-midpoint');assert.equal(btc.quote.lastTradeTimestamp,tradeTime);assert.equal(btc.quote.current,true);assert.equal(tradeQuote(data,'BTC/USD',now).timestamp,now.toISOString());
 const market={...marketFixture(now),liveQuotes:data},s=gameWithChecking(20),request={symbol:'BTC/USD',side:'buy',mode:'dollars',amount:20,marketMode:'live'},buy=quoteTrade(s.bank,market,request,now);assert.equal(buy.price,81110);executeTrade(s,market,request,buy.signature,now);assert.equal(s.bank.portfolio.trades[0].priceBasis,'bid-ask-midpoint');assert.equal(s.bank.portfolio.trades[0].askPrice,81110);
 const sell={...request,side:'sell',mode:'shares',amount:s.bank.portfolio.positions['BTC/USD'].units/1000000},sale=quoteTrade(s.bank,market,sell,now);assert.equal(sale.price,81090);assert.ok(sale.realizedCents<0,'spread and fees cannot generate an instant profit');
 const later=new Date(+now+20000);t.mock.timers.setTime(+later);payload.snapshots['BTC/USD'].latestQuote={bp:81120,ap:81140,t:later.toISOString()};const updated=normalizeBitcoin(payload,raw,later);assert.equal(updated.quotes['BTC/USD'].price,81130);assert.equal(updated.quotes['BTC/USD'].lastTradeTimestamp,tradeTime);assert.equal(updated.fetchedAt,later.toISOString());
});
test('invalid or stale Bitcoin books never authorize stale trades, and spread changes invalidate review atomically',t=>{
 t.mock.timers.enable({apis:['Date'],now:SATURDAY});const now=new Date(SATURDAY),payload=bitcoin(now);payload.snapshots['BTC/USD'].latestTrade.t=new Date(+now-600000).toISOString();
 for(const book of [{bp:10,ap:9,t:now.toISOString()},{bp:0,ap:10,t:now.toISOString()},{bp:10,ap:11,t:'bad'},{bp:10,ap:11,t:new Date(+now-121000).toISOString()},{bp:10,ap:11,t:new Date(+now+10000).toISOString()}]){
  payload.snapshots['BTC/USD'].latestQuote=book;const btc=decorateBitcoin(normalizeBitcoin(payload,null,now),'ok',now),data=alpacaFixture(now);data.quotes['BTC/USD']=btc.quote;data.crypto=btc.market;assert.equal(btc.quote.current,false);assert.throws(()=>tradeQuote(data,'BTC/USD',now),/expired/);
 }
 payload.snapshots['BTC/USD'].latestQuote={bp:59900,ap:60100,t:now.toISOString()};const btc=decorateBitcoin(normalizeBitcoin(payload,null,now),'ok',now),data=alpacaFixture(now);data.quotes['BTC/USD']=btc.quote;data.crypto=btc.market;
 const s=gameWithChecking(20),market={...marketFixture(now),liveQuotes:data},r={symbol:'BTC/USD',side:'buy',mode:'dollars',amount:20,marketMode:'live'},q=quoteTrade(s.bank,market,r,now),before=JSON.stringify(s);data.quotes['BTC/USD'].bidPrice=59800;data.quotes['BTC/USD'].askPrice=60200;assert.throws(()=>executeTrade(s,market,r,q.signature,now),/changed/);assert.equal(JSON.stringify(s),before);
});

test('Bitcoin loan repayment and mortgage down-payment sales use bid proceeds rather than overstating the midpoint',t=>{
 t.mock.timers.enable({apis:['Date'],now:SATURDAY});const now=new Date(SATURDAY),payload=bitcoin(now);payload.snapshots['BTC/USD'].latestQuote={bp:59000,ap:61000,t:now.toISOString()};const btc=decorateBitcoin(normalizeBitcoin(payload,null,now),'ok',now),data=alpacaFixture(now);data.quotes['BTC/USD']=btc.quote;data.crypto=btc.market;const market={...marketFixture(now),liveQuotes:data};
 const state=gameWithChecking(20000);state.cash=0;state.bank.creditScore=700;const r={symbol:'BTC/USD',side:'buy',mode:'dollars',amount:20000,marketMode:'live'},q=quoteTrade(state.bank,market,r,now);executeTrade(state,market,r,q.signature,now);
 const collateral=structuredClone(state),loan=originate(collateral,100,true);collateral.bank.checking=0;settleCollateral(collateral,loan,market,now,{full:true,collection:false});assert.equal(loan.balance,0);assert.equal(collateral.bank.portfolio.trades.at(-1).price,59000);
 const units=state.bank.portfolio.positions['BTC/USD'].units,gross=Math.round(units/1000000*59000*100),net=gross-Math.max(1,Math.round(gross*.005));assert.equal(downPaymentAssets(state,market),Math.round((state.bank.checking+net/100)*100)/100);
 purchaseHouse(state,{mortgage:true,quote:{rate:6.5,asOf:'2026-10-23'},market,now});assert.equal(state.bank.mortgage.balance,392000);assert.equal(state.bank.portfolio.trades.at(-1).price,59000);assert.ok(state.bank.checking>=0);assert.ok(state.upgrades.includes('house'));
});
