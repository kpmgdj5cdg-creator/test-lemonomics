import test from 'node:test';
import assert from 'node:assert/strict';
import {LocalProfileStore,PROFILE_KEY,validName,formatSavedAt} from '../src/profiles.js';
import {gameWithChecking} from './fixtures/market.js';

function storage(){const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)}}
test('three profiles keep independent business states and saving one never changes another',()=>{
 const disk=storage(),store=new LocalProfileStore(disk);
 const a=store.create(0,'Calvin','male',gameWithChecking(20)),b=store.create(1,'Ben','female',gameWithChecking(50));store.create(2,'Luke','male',gameWithChecking(100));
 const next=a.state;next.day=9;next.bank.checking=800;store.save(a.id,next,'2026-10-20');next.day=100;
 const reloaded=new LocalProfileStore(disk).list();assert.equal(reloaded[0].state.day,9);assert.equal(reloaded[0].marketAsOf,'2026-10-20');assert.equal(reloaded[1].state.bank.checking,50);assert.equal(reloaded[1].id,b.id);assert.equal(reloaded[2].state.bank.checking,100);
 assert.throws(()=>store.create(0,'Other','male',gameWithChecking()),/already in use/);
});
test('old saves migrate once, with original money, inventory, loans and an untouched backup',()=>{
 const disk=storage(),old=gameWithChecking(400);old.day=17;old.inventory.lemons=31;old.bank.loans=[{id:1,balance:42}];const raw=JSON.stringify(old);
 disk.setItem('lemonadeLane_bank_v3',raw);const store=new LocalProfileStore(disk);store.migrateLegacy();
 const profile=store.list()[0];assert.equal(profile.name,'Player');assert.deepEqual(profile.state,old);assert.equal(disk.getItem('lemonomics_legacy_backup_v1'),raw);
 const next={...profile.state,day:18};store.save(profile.id,next);store.migrateLegacy();assert.equal(store.list()[0].state.day,18);assert.equal(store.list().filter(Boolean).length,1);assert.equal(disk.getItem('lemonadeLane_bank_v3'),raw);
});
test('a quota failure preserves the previous save and reports failure',()=>{
 const disk=storage(),store=new LocalProfileStore(disk),p=store.create(0,'Test','female',gameWithChecking(100));
 const before=disk.getItem(PROFILE_KEY);disk.setItem=()=>{throw new Error('QuotaExceededError')};
 assert.throws(()=>store.save(p.id,{...p.state,day:9}),/QuotaExceededError/);assert.equal(disk.getItem(PROFILE_KEY),before);
});
test('invalid or unsupported save documents are not overwritten by migration',()=>{
 const disk=storage();disk.setItem(PROFILE_KEY,'broken json');disk.setItem('lemonadeLane_bank_v3',JSON.stringify(gameWithChecking()));const store=new LocalProfileStore(disk);store.migrateLegacy();assert.throws(()=>store.list(),/could not be read/);assert.equal(disk.getItem(PROFILE_KEY),'broken json');
});
test('names accept up to sixteen alphabetic characters and dates have the requested format',()=>{
 for(const name of ['Ben','calVIN','Abcdefghijklmnop'])assert.equal(validName(name),true);
 for(const name of ['', 'Abcdefghijklmnopq','John Doe','Ben2','<script>','é'])assert.equal(validName(name),false);
 assert.equal(formatSavedAt(new Date(2026,9,21,13,5).toISOString()),'10-21-2026, 01:05 PM');assert.equal(formatSavedAt(null),'Imported save');
});
