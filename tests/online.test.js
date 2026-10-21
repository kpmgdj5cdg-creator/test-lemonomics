import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../cloud/worker.js';
import {OnlineProfileStore,CLOUD_BACKUP_KEY} from '../src/online-profiles.js';
import {PROFILE_KEY} from '../src/profiles.js';
const state=()=>({day:1,inventory:{lemons:0},ledger:[],bank:{checking:0}});
function environment(){
 const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../cloud/migrations/0001_family.sql',import.meta.url),'utf8'));
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
