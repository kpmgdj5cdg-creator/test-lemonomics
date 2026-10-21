import {LocalProfileStore,PROFILE_KEY,PROFILE_SLOTS,emptySlots} from './profiles.js';
const clone=v=>JSON.parse(JSON.stringify(v));
export const CLOUD_BACKUP_KEY='lemonomics_online_recovery_v1';
async function request(fetcher,path,options={}){
 const response=await fetcher(path,{...options,credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(20000)});
 let result;try{result=await response.json()}catch{throw new Error('The online save service could not be reached. Your browser backup is kept.')}
 if(!response.ok){const e=new Error(result.message||'Online save failed. Your browser backup is kept.');e.status=response.status;throw e}return result;
}
// Autosaves checkpoint synchronously, then upload in order. Explicit Save awaits
// flush(), so Save & Quit cannot report success for an unconfirmed network write.
export class OnlineProfileStore extends LocalProfileStore{
 constructor(storage,fetcher=fetch,onError=()=>{}){
  const memory=new Map();super({getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)});
  this.backupStorage=storage;this.fetcher=fetcher;this.onError=onError;this.online=true;this.dirty=new Set();this.versions=new Map();this.pending=null;this.conflict=null;
 }
 async refresh(){
  await this.flush();const data=await request(this.fetcher,'/api/profiles');
  if(data.version!==1||![3,PROFILE_SLOTS].includes(data.slots?.length))throw new Error('The online profiles could not be read.');
  this.storage.setItem(PROFILE_KEY,JSON.stringify(data));this.read();
 }
 checkpoint(profile){
  // Keep each unsent/latest profile under its stable id, separate from old local saves.
  const records=JSON.parse(this.backupStorage.getItem(CLOUD_BACKUP_KEY)||'{}');
  records[profile.id]={profile:clone(profile),backedUpAt:new Date().toISOString()};
  this.backupStorage.setItem(CLOUD_BACKUP_KEY,JSON.stringify(records));
 }
 async create(slot,name,avatar,state,now){
  const before=this.storage.getItem(PROFILE_KEY),p=super.create(slot,name,avatar,state,now);
  try{
   this.checkpoint(p);const saved=await request(this.fetcher,'/api/profiles',{method:'POST',body:JSON.stringify({slot,profile:p})});
   const data=this.read();data.slots[slot]=saved;this.storage.setItem(PROFILE_KEY,JSON.stringify(data));return clone(saved);
  }catch(e){this.storage.setItem(PROFILE_KEY,before||JSON.stringify({version:1,slots:emptySlots()}));throw e}
 }
 async delete(id,revision){
  await this.flush();
  const data=this.read(),slot=data.slots.findIndex(p=>p?.id===id),profile=data.slots[slot];
  if(!profile)throw new Error('This profile is no longer available.');
  await request(this.fetcher,'/api/profiles',{method:'DELETE',body:JSON.stringify({slot,id,revision})});
  data.slots[slot]=null;this.storage.setItem(PROFILE_KEY,JSON.stringify(data));
  this.dirty.delete(id);this.versions.delete(id);
  // Remove this browser's checkpoint too; other profiles and old local games stay intact.
  try{
    const records=JSON.parse(this.backupStorage.getItem(CLOUD_BACKUP_KEY)||'{}');delete records[id];
    this.backupStorage.setItem(CLOUD_BACKUP_KEY,JSON.stringify(records));
    LocalProfileStore.prototype.clearLegacyCopy.call({storage:this.backupStorage},profile);
  }catch{throw new Error('Online save deleted, but this browser backup could not be cleared. Clear it in browser storage.');}
 }
 save(id,state,marketAsOf,now){
  if(this.conflict)throw this.conflict;
  const before=this.storage.getItem(PROFILE_KEY),p=super.save(id,state,marketAsOf,now);
  try{this.checkpoint(p)}catch(e){this.storage.setItem(PROFILE_KEY,before);throw e}
  this.dirty.add(id);this.versions.set(id,(this.versions.get(id)||0)+1);
  clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush().catch(e=>this.onError(e.message)),800);
  return p;
 }
 async flush(){
  clearTimeout(this.timer);
  if(this.pending){await this.pending;if(!this.dirty.size)return}
  if(this.conflict)throw this.conflict;
  this.pending=(async()=>{
   while(this.dirty.size){
    const id=this.dirty.values().next().value,data=this.read(),slot=data.slots.findIndex(p=>p?.id===id),p=data.slots[slot],version=this.versions.get(id);
    let saved;try{saved=await request(this.fetcher,'/api/profiles',{method:'PUT',body:JSON.stringify({slot,profile:p,revision:p.revision})})}
    catch(e){if(e.status===409)this.conflict=e;throw e}
    const latest=this.read();
    if(version===this.versions.get(id)){latest.slots[slot]=saved;this.dirty.delete(id)}
    else latest.slots[slot].revision=saved.revision;
    this.storage.setItem(PROFILE_KEY,JSON.stringify(latest));
   }
  })();
  try{await this.pending}finally{this.pending=null}
 }
}
export async function onlineAvailable(fetcher=fetch){
 if(!['http:','https:'].includes(globalThis.location?.protocol))return false;
 let response;try{response=await fetcher('/api/config',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(10000)})}catch{throw new Error('The server is unavailable. Reload when your connection returns.')}
 // Offline/static hosting has no API and remains a local game. An online service
 // error or expired login must never silently switch a family site to local saves.
 if(response.status===404)return false;
 if(!response.ok)throw new Error('Sign in again or reload to reconnect. Your saved games have been kept.');
 if(!response.headers.get('content-type')?.includes('application/json'))return false;
 return (await response.json()).onlineProfiles===true;
}
