import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {LiveMarketService} from '../server/live-market-service.js';
import {normalizeSnapshots,historyRequest,normalizeBars,boundedHistory} from '../server/alpaca-provider.js';
import {marketSession,tradeQuote,LIVE_LIMITS,HISTORY_RANGES,decorateQuotes} from '../src/live-market-data.js';
import {quoteTrade,executeTrade,applyLiveMarks,portfolioTotals,applyMarket} from '../src/investments.js';
import {FUNDS,SYMBOLS} from '../src/funds.js';
import {gameWithChecking,marketFixture} from './fixtures/market.js';
export function liveEnvironment(){
 const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('../cloud/migrations/0005_live_market.sql',import.meta.url),'utf8'));
 const DB={prepare(query){
  let args=[];
  return {bind(...a){args=a;return this},async first(){return sql.prepare(query).get(...args)||null},async all(){return {results:sql.prepare(query).all(...args)}},async run(){return {meta:{changes:Number(sql.prepare(query).run(...args).changes)}}}};
 }};
 return {DB,ALPACA_LIVE_ENABLED:'true',ALPACA_API_KEY_ID:'TEST_ONLY_KEY',ALPACA_API_SECRET_KEY:'TEST_ONLY_SECRET'};
}
export function snapshots(now=new Date('2026-10-22T15:00:00Z'),price=200){return Object.fromEntries(SYMBOLS.map(s=>[s,{latestTrade:{p:price,t:now.toISOString()},prevDailyBar:{c:190,t:'2026-10-21T04:00:00Z'}}]))}
export function calendar(){return {start:'2026-01-01',end:'2026-12-31',days:[{date:'2026-10-22',open:'09:30',close:'16:00'},{date:'2026-03-06',open:'09:30',close:'16:00'},{date:'2026-03-09',open:'09:30',close:'16:00'},{date:'2026-11-27',open:'09:30',close:'13:00'}]}}
function fixture(){let time=Date.parse('2026-10-22T15:00:00Z'),calls=[],mode='ok';const env=liveEnvironment(),clock=()=>new Date(time);
 const fetcher=async(url,options)=>{calls.push({url,options});if(mode==='network')throw Error('offline');if(mode==='401'||mode==='403'||mode==='429')return new Response('{}',{status:+mode,headers:{'Retry-After':'120'}});if(url.includes('/calendar?'))return Response.json(calendar().days);if(url.includes('/snapshots?'))return Response.json(snapshots(clock()));return Response.json({bars:[{t:new Date(time-3600000).toISOString(),c:180},{t:new Date(time-1800000).toISOString(),c:200}]})};
 return {env,calls,clock,service:()=>new LiveMarketService(env,{clock,fetcher}),advance:n=>time+=n,setMode:m=>mode=m};
}
async function warmed(f){await f.service().quotes();f.advance(5000);return f.service().quotes()}
test('three players share one global five-second snapshot cache for all six funds, with original timestamps and no public credentials',async()=>{
 const f=fixture();const first=await warmed(f);assert.equal(first.session.verified,true);assert.equal(first.session.open,true);for(const s of SYMBOLS){assert.equal(first.quotes[s].price,200);assert.equal(first.quotes[s].previousClose,190);assert.equal(first.quotes[s].change,10)}
 const count=f.calls.length;await Promise.all(Array.from({length:3},()=>f.service().quotes()));assert.equal(f.calls.length,count);f.advance(5000);await Promise.all(Array.from({length:3},()=>f.service().quotes()));assert.equal(f.calls.length,count+1);
 for(const r of f.calls){assert.equal(r.options.method,'GET');assert.ok(!r.url.includes('orders'));if(!r.url.includes('calendar'))assert.equal(new URL(r.url).searchParams.get('feed'),'iex');assert.equal(r.options.headers['APCA-API-KEY-ID'],'TEST_ONLY_KEY')}
 assert.ok(!JSON.stringify(first).includes('TEST_ONLY'));assert.ok(f.calls.filter(c=>c.url.includes('snapshots')).every(c=>new URL(c.url).searchParams.get('symbols')===SYMBOLS.join(',')));
});
test('provider 429 backoff, network errors and missing quotes retain timestamps without invented prices',async()=>{
 const f=fixture(),old=await warmed(f);f.advance(5000);f.setMode('429');const failed=await f.service().quotes(),count=f.calls.length;assert.equal(failed.status,'rate-limited');assert.ok(failed.retryAfterMs>=120000);assert.equal(failed.quotes.SPY.timestamp,old.quotes.SPY.timestamp);for(let i=0;i<20;i++)await f.service().quotes();assert.equal(f.calls.length,count);
 f.advance(125000);f.setMode('network');const offline=await f.service().quotes();assert.equal(offline.quotes.SPY.price,200);assert.equal(offline.quotes.SPY.current,false);
 const raw=snapshots();raw.SPY.latestTrade.p=-1;const missing=normalizeSnapshots(raw,{quotes:old.quotes},f.clock());assert.equal(missing.quotes.SPY.price,200);assert.equal(missing.quotes.SPY.unavailable,true);assert.equal(missing.quotes.DIA.price,200);
});
test('401/403 stop requests until credential rotation, and clicks cannot bypass global daily/minute ceilings',async()=>{
 for(const mode of ['401','403']){const f=fixture();await warmed(f);f.advance(5000);f.setMode(mode);assert.equal((await f.service().quotes()).status,'configuration');const count=f.calls.length;f.advance(2*86400000);await f.service().quotes();assert.equal(f.calls.length,count);f.env.ALPACA_API_SECRET_KEY='ROTATED_TEST_SECRET';f.setMode('ok');await f.service().quotes();assert.ok(f.calls.length>count)}
 const f=fixture();await warmed(f);await f.env.DB.prepare('UPDATE live_market_guard SET daily_calls=?,day=? WHERE id=1').bind(LIVE_LIMITS.dailyCalls,'2026-10-22').run();const count=f.calls.length;f.advance(5000);assert.equal((await f.service().quotes()).status,'daily-limit');await f.service().history('SPY','1D');assert.equal(f.calls.length,count);
 const g=fixture();await g.service().init();await g.env.DB.prepare('UPDATE live_market_guard SET minute=?,minute_calls=? WHERE id=1').bind(Math.floor(+g.clock()/60000),LIVE_LIMITS.minuteCalls).run();assert.equal(await g.service().reserve(),false);
});
test('verified calendar respects Eastern DST, holidays and early close; fallback never authorizes a trade',()=>{
 const c=calendar();assert.equal(marketSession(c,new Date('2026-03-06T14:30:00Z')).open,true);assert.equal(marketSession(c,new Date('2026-03-06T13:30:00Z')).open,false);assert.equal(marketSession(c,new Date('2026-03-09T13:30:00Z')).open,true);assert.equal(marketSession(c,new Date('2026-11-27T17:59:00Z')).open,true);assert.equal(marketSession(c,new Date('2026-11-27T18:00:00Z')).open,false);assert.equal(marketSession(c,new Date('2026-12-25T15:00:00Z')).open,false);
 const data=decorateQuotes(normalizeSnapshots(snapshots()),null,'ok',new Date('2026-10-22T15:00:00Z'));assert.throws(()=>tradeQuote(data,'SPY',new Date('2026-10-22T15:00:00Z')),/verified/);
});
test('fractional $20 total-budget buy, changing portfolio value and partial/full sale preserve checking, basis and realized gains',()=>{
 const now=new Date('2026-10-22T15:00:00Z'),state=gameWithChecking(20),market=marketFixture(now);market.liveQuotes=decorateQuotes(normalizeSnapshots(snapshots(now),null,now),calendar(),'ok',now);applyMarket(state,market);
 const buy={symbol:'SPY',side:'buy',mode:'dollars',amount:'20',marketMode:'live',accountId:'TEST_PLAYER'};const q=quoteTrade(state.bank,market,buy,now);assert.ok(q.units>0&&q.units<100000);assert.ok(q.totalCents<=2000);executeTrade(state,market,buy,q.signature,now);assert.equal(state.bank.checking,0);const cash=state.cash,bank=state.bank.checking;
 const next=new Date(+now+5000);market.liveQuotes=decorateQuotes(normalizeSnapshots(snapshots(next,240),null,next),calendar(),'ok',next);applyLiveMarks(state,market.liveQuotes,next);assert.equal(state.bank.checking,bank);assert.equal(state.cash,cash);assert.ok(portfolioTotals(state.bank,market).unrealizedCents>0);assert.equal(state.bank.portfolio.trades[0].accountId,'TEST_PLAYER');
 const units=state.bank.portfolio.positions.SPY.units;const sell={symbol:'SPY',side:'sell',mode:'shares',amount:(units/2/1e6).toFixed(6),marketMode:'live',accountId:'TEST_PLAYER'};let v=quoteTrade(state.bank,market,sell,next);executeTrade(state,market,sell,v.signature,next);assert.ok(state.bank.portfolio.trades.at(-1).realizedCents>0);assert.ok(state.bank.portfolio.positions.SPY.costCents>0);sell.amount=(state.bank.portfolio.positions.SPY.units/1e6).toFixed(6);v=quoteTrade(state.bank,market,sell,next);executeTrade(state,market,sell,v.signature,next);assert.equal(state.bank.portfolio.positions.SPY,undefined);assert.ok(state.bank.checking>20);assert.equal(state.cash,cash);
});
test('expired quotes, market close, changed quotes, repeat confirmations and unsupported symbols cannot mutate funds',()=>{
 const now=new Date('2026-10-22T15:00:00Z'),s=gameWithChecking(100),m=marketFixture(now);m.liveQuotes=decorateQuotes(normalizeSnapshots(snapshots(now),null,now),calendar(),'ok',now);const req={symbol:'SPY',side:'buy',mode:'dollars',amount:20,marketMode:'live',accountId:'A'},q=quoteTrade(s.bank,m,req,now);const before=JSON.stringify(s);assert.throws(()=>executeTrade(s,m,req,q.signature,new Date(+now+16000)),/expired/);assert.equal(JSON.stringify(s),before);assert.throws(()=>quoteTrade(s.bank,m,req,new Date('2026-10-22T20:00:00Z')),/closed/);m.liveQuotes.quotes.SPY.price=201;assert.throws(()=>executeTrade(s,m,req,q.signature,now),/changed/);m.liveQuotes.quotes.SPY.price=200;executeTrade(s,m,req,q.signature,now);assert.throws(()=>executeTrade(s,m,req,q.signature,now),/changed/);assert.throws(()=>quoteTrade(s.bank,m,{...req,symbol:'AAPL'},now),/valid/);
});
test('all six funds and six periods use real paginated IEX bars, bounded observations and split-only adjustment',async()=>{
 const f=fixture();for(const symbol of SYMBOLS)for(const range of Object.keys(HISTORY_RANGES)){f.advance(2100);const h=await f.service().history(symbol,range);assert.equal(h.provider,'Alpaca');assert.equal(h.feed,'iex');assert.ok(h.points.length>0&&h.points.length<=1600);const url=new URL(historyRequest(symbol,range,f.clock()),'https://data.alpaca.markets');assert.equal(url.searchParams.get('feed'),'iex');assert.equal(url.searchParams.get('adjustment'),'split');assert.ok(Date.parse(url.searchParams.get('end'))<=+f.clock()-16*60000)}
 assert.equal((await f.service().history('INVALID','5Y')).status,'invalid');
 const points=Array.from({length:3000},(_,i)=>({timestamp:new Date(Date.parse('2026-10-01T15:00Z')+i*60000).toISOString(),price:100+i}));assert.equal(boundedHistory(points,'1W').length,1600);assert.ok(boundedHistory(points,'1W').every(p=>points.includes(p)));assert.deepEqual(normalizeBars({bars:[{t:'bad',c:3},{t:'2026-10-01T15:00Z',c:0}]}),[]);
});
test('live updates are independent of simulated days and preserve legacy holdings and prior-close collateral pricing',()=>{
 const now=new Date('2026-10-22T15:00:00Z'),s=gameWithChecking(1000),m=marketFixture(now);const legacy={symbol:'DIA',side:'buy',mode:'dollars',amount:100};const q=quoteTrade(s.bank,m,legacy,now);executeTrade(s,m,legacy,q.signature,now);const units=s.bank.portfolio.positions.DIA.units,checking=s.bank.checking;
 const live=decorateQuotes(normalizeSnapshots(snapshots(now,500)),calendar(),'ok',now);applyLiveMarks(s,live,now);const value=portfolioTotals(s.bank,m).valueCents;for(let i=0;i<3;i++){s.day++;applyLiveMarks(s,live,now);assert.equal(portfolioTotals(s.bank,m).valueCents,value);assert.equal(s.bank.checking,checking);assert.equal(s.bank.portfolio.positions.DIA.units,units)}
 assert.equal(s.bank.portfolio.trades.length,1);const daily=quoteTrade(s.bank,m,legacy,now);assert.equal(daily.price,m.funds.DIA.history.at(-1)[1]);
});
test('historical pagination is bounded across calls and a cached chart never refetches on button spam',async()=>{
 const env=liveEnvironment();let now=Date.parse('2026-10-22T15:00Z'),calls=0;
 const fetcher=async url=>{assert.equal(new URL(url).searchParams.get('feed'),'iex');const page=calls++;return Response.json({bars:Array.from({length:1000},(_,i)=>({t:new Date(Date.parse('2026-09-01T00:00Z')+(page*1000+i)*60000).toISOString(),c:100+page+i/10000})),next_page_token:'page-'+(page+1)})};
 for(let i=0;i<4;i++){now+=1100;const result=await new LiveMarketService(env,{clock:()=>new Date(now),fetcher}).history('SPY','1M');assert.ok(result.points.length<=1600);if(i===3){assert.equal(result.truncated,true);assert.equal(result.nextPageToken,null)}}
 const last=calls;for(let i=0;i<10;i++)await new LiveMarketService(env,{clock:()=>new Date(now),fetcher}).history('SPY','1M');assert.equal(calls,last);assert.equal(calls,4);
});
test('market quotes are disabled with no credentials or activation flag and make zero upstream requests',async()=>{
 const env=liveEnvironment();delete env.ALPACA_API_SECRET_KEY;let calls=0;const service=new LiveMarketService(env,{fetcher:()=>{calls++;throw Error()}});assert.equal((await service.quotes()).status,'disabled');assert.equal((await service.history('SPY','1D')).status,'disabled');assert.equal(calls,0);
});

test('malformed trade timestamps and expired snapshots are safely rejected',()=>{
 const now=new Date('2026-10-22T15:00:00Z'),calendar={start:'2026-10-22',end:'2026-10-22',days:[{date:'2026-10-22',open:'09:30',close:'16:00'}]};
 const raw={fetchedAt:now.toISOString(),quotes:{SPY:{symbol:'SPY',price:200,timestamp:now.toISOString(),feed:'iex',provider:'Alpaca'}}};
 const batch=decorateQuotes(raw,calendar,'ok',now);assert.equal(tradeQuote(batch,'SPY',now).price,200);
 for(const timestamp of ['bad date',null,'2026-10-23T15:00:00Z']){const invalid=structuredClone(batch);invalid.quotes.SPY.timestamp=timestamp;assert.throws(()=>tradeQuote(invalid,'SPY',now),/expired or unavailable/);}
 const expired=decorateQuotes({...raw,fetchedAt:'2026-10-22T14:59:40Z'},calendar,'ok',now);assert.equal(expired.quotes.SPY.stale,true);assert.equal(expired.quotes.SPY.current,false);assert.throws(()=>tradeQuote(expired,'SPY',now),/expired or unavailable/);
});
