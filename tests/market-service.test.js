import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {downloadMarket,parseYahoo,createMarketService} from '../server/market-service.js';
import {marketFixture} from './fixtures/market.js';
const now=new Date('2026-10-20T16:00:00Z');
function yahoo(){return {chart:{result:[{meta:{currency:'USD'},timestamp:['2026-10-16','2026-10-19','2026-10-20'].map(d=>Date.parse(d+'T14:30:00Z')/1000),indicators:{quote:[{close:[99,100,999]}],adjclose:[{adjclose:[98,100,999]}]},events:{dividends:{one:{date:Date.parse('2026-10-19T13:30:00Z')/1000,amount:.25}},splits:{one:{date:Date.parse('2026-10-20T13:30:00Z')/1000,numerator:2,denominator:1}}}}]}}}
test('provider parsing excludes today’s in-progress price and events, keeping raw closes and adjusted history separate',()=>{
  const f=parseYahoo('SPY',yahoo(),'2026-10-20');assert.equal(f.history.length,2);assert.deepEqual(f.history[0],['2026-10-16',99,98]);assert.deepEqual(f.events,[{date:'2026-10-19',type:'dividend',value:.25}]);
  const invalid=yahoo();invalid.chart.result[0].meta.currency='EUR';assert.throws(()=>parseYahoo('SPY',invalid,'2026-10-20'));
});
test('one download requests only six fixed funds and never uses current-day quotes',async()=>{
  const urls=[];const data=await downloadMarket({now,fetcher:async url=>{urls.push(url);return {ok:true,json:async()=>yahoo()}}});
  assert.equal(urls.length,6);assert.equal(new Set(urls.map(u=>new URL(u).pathname)).size,6);assert.equal(data.asOf,'2026-10-19');assert.equal(Object.keys(data.funds).length,6);
  assert.ok(urls.every(u=>new URL(u).hostname==='query1.finance.yahoo.com'));
});
test('six complete quote histories are required before a new snapshot replaces the cache',async()=>{
  await assert.rejects(()=>downloadMarket({now,fetcher:async url=>url.includes('/SLV?')?{ok:false,status:429}:{ok:true,json:async()=>yahoo()}}),/429/);
});
test('a current shared disk cache serves multiple users without any provider calls',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'lemon-market-')),file=join(dir,'market.json');await writeFile(file,JSON.stringify(marketFixture(now)));let requests=0;
  const service=createMarketService({cacheFile:file,snapshotFile:join(dir,'missing'),clock:()=>now,fetcher:async()=>{requests++;throw new Error('offline')}});
  const results=await Promise.all([service.get(),service.get(),service.get()]);assert.equal(requests,0);assert.ok(results.every(r=>r.status==='current'));
});
test('concurrent refreshes share six requests and persist one complete market snapshot',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'lemon-market-'));let requests=0;const file=join(dir,'market.json');
  const service=createMarketService({cacheFile:file,snapshotFile:join(dir,'missing'),clock:()=>now,fetcher:async()=>{requests++;return {ok:true,json:async()=>yahoo()}}});
  const results=await Promise.all([service.get(),service.get(),service.get()]);assert.equal(requests,6);assert.ok(results.every(r=>r.status==='current'));assert.equal(JSON.parse(await readFile(file,'utf8')).asOf,'2026-10-19');
});
test('provider failure returns a dated stale snapshot, throttles retries and never overwrites it',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'lemon-market-')),file=join(dir,'market.json'),old=marketFixture(new Date('2026-10-19T16:00:00Z'));await writeFile(file,JSON.stringify(old));let requests=0;
  const service=createMarketService({cacheFile:file,snapshotFile:join(dir,'missing'),clock:()=>now,fetcher:async()=>{requests++;throw new Error('offline')}});
  assert.equal((await service.get()).status,'stale');assert.equal((await service.get()).status,'stale');assert.equal(requests,1);assert.equal(JSON.parse(await readFile(file,'utf8')).asOf,old.asOf);
});
