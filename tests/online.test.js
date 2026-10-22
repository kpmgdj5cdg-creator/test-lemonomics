import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker,{refreshFund,market,mortgageRate} from '../cloud/worker.js';
import {OnlineProfileStore,CLOUD_BACKUP_KEY} from '../src/online-profiles.js';
import {PROFILE_KEY} from '../src/profiles.js';
const state=()=>({day:1,inventory:{lemons:0},ledger:[],bank:{checking:0}});
function environment(){
 const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../cloud/migrations/0001_family.sql',import.meta.url),'utf8'));db.exec(readFileSync(new URL('../cloud/migrations/0002_fund_refresh.sql',import.meta.url),'utf8'));
 db.exec(readFileSync(new URL('../cloud/migrations/0003_five_profiles.sql',import.meta.url),'utf8'));
 db.exec(readFileSync(new URL('../cloud/migrations/0004_mortgage_rate.sql',import.meta.url),'utf8'));
 db.exec(readFileSync(new URL('../cloud/migrations/0005_live_market.sql',import.meta.url),'utf8'));
 const DB={prepare(sql){
   let args=[];
   return {
    bind(...values){args=values;return this},
    async first(){return db.prepare(sql).get(...args)||null},
    async all(){return {results:db.prepare(sql).all(...args)}},
    async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}}}
   };
 }};
 return {FAMILY_PASSWORD:'family-testing-password',ASSETS:{fetch:async()=>new Response('private game asset')},DB};
}
async function family(env){
 const login=await worker.fetch(new Request('https://game.example/login',{method:'POST',headers:{Origin:'https://game.example'},body:new URLSearchParams({password:env.FAMILY_PASSWORD})}),env);
 assert.equal(login.status,303);const cookie=login.headers.get('Set-Cookie').split(';')[0];
 return (path,options={})=>worker.fetch(new Request('https://game.example'+path,{...options,headers:{Cookie:cookie,Origin:'https://game.example',...options.headers}}),env);
}
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)}};
test('private assets and APIs require login, secure cookie, origin checks and password rotation',async()=>{
 const env=environment();
 assert.equal((await worker.fetch(new Request('https://game.example/assets/game.js'),env)).status,303);
 assert.equal((await worker.fetch(new Request('https://game.example/api/profiles'),env)).status,401);
 const api=await family(env);assert.equal(await(await api('/')).text(),'private game asset');
 assert.match((await api('/')).headers.get('Cache-Control'),/no-store/);
 assert.equal((await api('/api/profiles',{method:'POST',headers:{Origin:'https://evil.example'},body:'{}'})).status,403);
 env.FAMILY_PASSWORD='a-new-family-password';assert.equal((await api('/api/profiles')).status,401);
});
test('login rate limits guesses and deployment stays closed until password is configured',async()=>{
 const env=environment();assert.equal((await worker.fetch(new Request('https://game.example/'),{...env,FAMILY_PASSWORD:''})).status,503);
 for(let n=0;n<10;n++)assert.equal((await worker.fetch(new Request('https://game.example/login',{method:'POST',headers:{Origin:'https://game.example'},body:'password=wrong'}),env)).status,200);
 assert.equal((await worker.fetch(new Request('https://game.example/login',{method:'POST',headers:{Origin:'https://game.example'},body:'password=wrong'}),env)).status,429);
});
test('two PCs share durable profiles, independent slots and atomic conflict checks',async()=>{
 const env=environment(),apiA=await family(env),apiB=await family(env),a=new OnlineProfileStore(storage(),apiA),b=new OnlineProfileStore(storage(),apiB);
 await a.refresh();await b.refresh();await a.create(0,'Henry','male',state());await b.create(1,'Lucy','female',state());
 await b.refresh();assert.equal(b.list()[0].name,'Henry');
 await a.refresh();const p=a.list()[0];await b.refresh();
 a.save(p.id,{...state(),day:4});await a.flush();
 b.save(p.id,{...state(),day:2});await assert.rejects(()=>b.flush(),/another computer/);
 const remote=await(await apiA('/api/profiles')).json();assert.equal(remote.slots[0].state.day,4);assert.equal(remote.slots[1].name,'Lucy');
 assert.equal(b.list()[0].state.day,2);assert.equal(JSON.parse(b.backupStorage.getItem(CLOUD_BACKUP_KEY))[p.id].profile.state.day,2);
});
test('failed network writes keep recoverable checkpoint and retry with same revision',async()=>{
 const env=environment(),api=await family(env),local=storage();let offline=false;
 const store=new OnlineProfileStore(local,(...args)=>offline?Promise.reject(new Error('offline')):api(...args));
 await store.refresh();const p=await store.create(0,'Sam','male',state());offline=true;
 store.save(p.id,{...state(),day:9});await assert.rejects(()=>store.flush(),/offline/);
 assert.equal(JSON.parse(local.getItem(CLOUD_BACKUP_KEY))[p.id].profile.state.day,9);
 offline=false;await store.flush();assert.equal((await(await api('/api/profiles')).json()).slots[0].state.day,9);
 assert.equal(local.getItem(PROFILE_KEY),null,'old browser-local profiles are not replaced');
});
test('saving while an upload is in flight uploads the newer state against the confirmed revision',async()=>{
 const env=environment(),api=await family(env);let release,delay=false,started;
 const entered=new Promise(r=>started=r),gate=new Promise(r=>release=r);
 const store=new OnlineProfileStore(storage(),async(...args)=>{if(delay&&args[1]?.method==='PUT'){delay=false;started();await gate}return api(...args)});
 await store.refresh();const p=await store.create(0,'Sam','male',state());delay=true;store.save(p.id,{...state(),day:2});const pending=store.flush();await entered;
 store.save(p.id,{...state(),day:3});release();await pending;
 assert.equal((await(await api('/api/profiles')).json()).slots[0].state.day,3);
});
test('invalid/oversized saves and duplicate slots never overwrite a game',async()=>{
 const api=await family(environment()),p={id:crypto.randomUUID(),name:'Sam',avatar:'male',state:state()};
 assert.equal((await api('/api/profiles',{method:'POST',body:JSON.stringify({slot:0,profile:p})})).status,200);
 assert.equal((await api('/api/profiles',{method:'POST',body:JSON.stringify({slot:0,profile:{...p,id:crypto.randomUUID()}})})).status,409);
 assert.equal((await api('/api/profiles',{method:'PUT',body:JSON.stringify({slot:0,revision:1,profile:{...p,state:{}}})})).status,400);
 assert.equal((await api('/api/profiles',{method:'PUT',body:' '.repeat(2_000_001)})).status,413);
});

test('split fund refresh publishes only complete common dates and retains them on provider failure',async()=>{
 const env=environment(),now=Date.parse('2026-10-21T16:00:00Z');let calls=0;
 const fetcher=async()=>{calls++;return {ok:true,json:async()=>({chart:{result:[{meta:{currency:'USD'},timestamp:['2026-10-19','2026-10-20'].map(d=>Date.parse(d+'T14:30:00Z')/1000),indicators:{quote:[{close:[100,101]}],adjclose:[{adjclose:[100,101]}]}}]}})}};
 for(const s of ['DIA','SPY','ARKK','SGOV','GLD'])await refreshFund(env,s,now,fetcher);
 assert.equal((await(await market(env,now)).json()).data.asOf,'2026-10-19');
 await refreshFund(env,'SLV',now,fetcher);const current=await(await market(env,now)).json();assert.equal(current.data.asOf,'2026-10-20');assert.equal(current.refreshFunds,false);assert.equal(calls,6);
 await refreshFund(env,'SLV',now,fetcher);assert.equal(calls,6);
 const later=now+86400000;await refreshFund(env,'SLV',later,async()=>{calls++;throw new Error('offline')});await refreshFund(env,'SLV',later,fetcher);assert.equal(calls,7);assert.equal((await(await market(env,later)).json()).data.asOf,'2026-10-20');
});

test('five online slots, deletion, stale tabs and replacements remain isolated',async()=>{
 const env=environment(),api=await family(env),disk=storage(),store=new OnlineProfileStore(disk,api);await store.refresh();
 const created=[];for(let slot=0;slot<5;slot++)created.push(await store.create(slot,'Player'+String.fromCharCode(65+slot),'male',state()));
 assert.equal(store.list().filter(Boolean).length,5);
 const old=created[4];await store.delete(old.id,old.revision);assert.equal(store.list()[4],null);
 assert.equal(JSON.parse(disk.getItem(CLOUD_BACKUP_KEY))[old.id],undefined);
 const replacement=await store.create(4,'NewPlayer','female',state());
 assert.equal((await api('/api/profiles',{method:'DELETE',body:JSON.stringify({slot:4,id:old.id,revision:old.revision})})).status,409);
 assert.equal((await api('/api/profiles',{method:'PUT',body:JSON.stringify({slot:4,profile:old,revision:old.revision})})).status,409);
 const slots=(await(await api('/api/profiles')).json()).slots;assert.equal(slots[4].id,replacement.id);assert.equal(slots[0].id,created[0].id);
});
test('deletion requires login, origin and the currently displayed revision',async()=>{
 const env=environment(),api=await family(env),store=new OnlineProfileStore(storage(),api);await store.refresh();const p=await store.create(0,'Tester','male',state());
 assert.equal((await worker.fetch(new Request('https://game.example/api/profiles',{method:'DELETE',headers:{Origin:'https://game.example'},body:JSON.stringify({slot:0,id:p.id,revision:1})}),env)).status,401);
 assert.equal((await api('/api/profiles',{method:'DELETE',headers:{Origin:'https://evil.example'},body:JSON.stringify({slot:0,id:p.id,revision:1})})).status,403);
 store.save(p.id,{...state(),day:2});await store.flush();await assert.rejects(()=>store.delete(p.id,p.revision),/changed on another computer/);
 assert.equal((await(await api('/api/profiles')).json()).slots[0].state.day,2);
});
test('three-slot database migration preserves saved ids, revisions and payloads',()=>{
 const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../cloud/migrations/0001_family.sql',import.meta.url),'utf8'));
 db.prepare('INSERT INTO profiles VALUES (?,?,?,?)').run(2,'existing',42,'saved business');
 db.exec(readFileSync(new URL('../cloud/migrations/0003_five_profiles.sql',import.meta.url),'utf8'));
 assert.deepEqual({...db.prepare('SELECT * FROM profiles WHERE slot=2').get()},{slot:2,id:'existing',revision:42,profile:'saved business'});
 db.prepare('INSERT INTO profiles VALUES (?,?,?,?)').run(4,'new',1,'new business');assert.equal(db.prepare('SELECT COUNT(*) AS n FROM profiles').get().n,2);
});

test('mortgage rate endpoint caches verified published rates and retains the last known quote through provider failures',async()=>{
 const env=environment(),now=Date.parse('2026-10-22T18:00:00Z');let calls=0;
 const fetcher=async()=>{calls++;return new Response('DATE,MORTGAGE30US\n2026-10-15,6.3\n2026-10-22,6.5\n')};
 let response=await mortgageRate(env,now,fetcher);assert.equal(response.status,200);assert.equal((await response.json()).data.rate,6.5);
 await mortgageRate(env,now+1000,fetcher);assert.equal(calls,1);
 response=await mortgageRate(env,now+2*3600000,async()=>{throw Error('offline')});assert.equal(response.status,200);assert.equal((await response.json()).data.asOf,'2026-10-22');
 response=await mortgageRate(env,now+40*86400000,async()=>{throw Error('offline')});assert.equal(response.status,503);
 const anonymous=await worker.fetch(new Request('https://game.example/api/mortgage-rate'),env);assert.equal(anonymous.status,401);
});

test('live market routes require family authentication and keep disabled configuration private',async()=>{
 const env=environment();env.ALPACA_API_KEY_ID='TEST_PRIVATE_ID';env.ALPACA_API_SECRET_KEY='TEST_PRIVATE_SECRET';
 const paths=['/api/market/quotes','/api/market/history?symbol=SPY&range=1D'];
 for(const path of paths)assert.equal((await worker.fetch(new Request('https://game.example'+path),env)).status,401);
 const api=await family(env);
 for(const path of paths){
  const response=await api(path);assert.equal(response.status,200);assert.equal(response.headers.get('Access-Control-Allow-Origin'),null);assert.match(response.headers.get('Cache-Control'),/no-store/);
  const body=await response.text();assert.equal(JSON.parse(body).status,'disabled');assert.doesNotMatch(body,/TEST_PRIVATE|APCA-API/);
  assert.equal((await api(path,{method:'POST',body:'{}'})).status,404);
 }
 assert.equal((await api('/api/orders',{method:'POST',body:'{}'})).status,404);
});
