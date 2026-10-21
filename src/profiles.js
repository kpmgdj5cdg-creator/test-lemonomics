export const PROFILE_SLOTS=5;
export const emptySlots=()=>Array(PROFILE_SLOTS).fill(null);
export const PROFILE_KEY='lemonomics_profiles_v1';
export const LEGACY_KEYS=['lemonadeLane_bank_v3','lemonadeLane_zero_v2'];
export const validName=name=>typeof name==='string'&&/^[A-Za-z]{1,16}$/.test(name);
const clone=value=>JSON.parse(JSON.stringify(value));
const newId=()=>globalThis.crypto.randomUUID?.()||'profile-'+[...crypto.getRandomValues(new Uint32Array(4))].map(n=>n.toString(16)).join('-');
const validState=state=>state&&typeof state==='object'&&state.inventory&&Array.isArray(state.ledger)&&Number.isInteger(state.day)&&state.day>0;

// Storage is an adapter boundary. A future authenticated online adapter can use
// these same versioned profile records; names alone are never account credentials.
export class LocalProfileStore{
  constructor(storage){this.storage=storage;}
  read(){
    const raw=this.storage.getItem(PROFILE_KEY);
    if(!raw)return {version:1,slots:emptySlots()};
    let data;try{data=JSON.parse(raw)}catch{throw new Error('Saved profiles could not be read. Your stored data has been kept.')}
    if(data.version!==1||!Array.isArray(data.slots)||![3,PROFILE_SLOTS].includes(data.slots.length)||data.slots.some(p=>p&&(!p.id||!validName(p.name)||!validState(p.state))))
      throw new Error('Saved profiles use an unreadable format. Your stored data has been kept.');
    while(data.slots.length<PROFILE_SLOTS)data.slots.push(null);
    return data;
  }
  list(){return clone(this.read().slots)}
  migrateLegacy(){
    if(this.storage.getItem(PROFILE_KEY))return;
    for(const key of LEGACY_KEYS){
      const raw=this.storage.getItem(key);if(!raw)continue;
      let state;try{state=JSON.parse(raw)}catch{continue}
      if(!validState(state))continue;
      // Keep an untouched copy even as the compatibility mirror is updated later.
      if(!this.storage.getItem('lemonomics_legacy_backup_v1'))this.storage.setItem('lemonomics_legacy_backup_v1',raw);
      const profile={id:newId(),name:'Player',avatar:'male',savedAt:null,marketAsOf:null,state};
      this.storage.setItem(PROFILE_KEY,JSON.stringify({version:1,slots:[profile,...emptySlots().slice(1)]}));return;
    }
  }
  create(slot,name,avatar,state,now=new Date()){
    if(!Number.isInteger(slot)||slot<0||slot>=PROFILE_SLOTS||!validName(name)||!['male','female'].includes(avatar)||!validState(state))throw new Error('Enter a name using 1–16 letters and choose an avatar.');
    const data=this.read();if(data.slots[slot])throw new Error('This profile slot is already in use.');
    const profile={id:newId(),name,avatar,savedAt:now.toISOString(),marketAsOf:null,state:clone(state)};
    data.slots[slot]=profile;this.storage.setItem(PROFILE_KEY,JSON.stringify(data));return clone(profile);
  }
  delete(id,revision){
    const data=this.read(),slot=data.slots.findIndex(p=>p?.id===id);
    if(slot<0)throw new Error('This profile is no longer available.');
    if(revision!==undefined&&data.slots[slot].revision!==revision)throw new Error('This profile changed. Reload before deleting it.');
    const deleted=data.slots[slot];data.slots[slot]=null;
    this.storage.setItem(PROFILE_KEY,JSON.stringify(data));
    this.clearLegacyCopy(deleted);
  }
  clearLegacyCopy(profile){
    // Retire matching compatibility copies so an erased business cannot reappear.
    for(const key of [...LEGACY_KEYS,'lemonomics_legacy_backup_v1'])try{
      const raw=this.storage.getItem(key);
      if(raw&&JSON.stringify(JSON.parse(raw))===JSON.stringify(profile.state))this.storage.removeItem?.(key);
    }catch{}
  }
  save(id,state,marketAsOf=null,now=new Date()){
    if(!validState(state))throw new Error('This game could not be saved.');
    const data=this.read(),slot=data.slots.findIndex(p=>p?.id===id);
    if(slot<0)throw new Error('This profile is no longer available.');
    const lastMarket=[marketAsOf,data.slots[slot].marketAsOf,state.bank?.portfolio?.marketDate].filter(Boolean).sort().at(-1)||null;
    const profile={...data.slots[slot],state:clone(state),savedAt:now.toISOString(),marketAsOf:lastMarket};
    data.slots[slot]=profile;
    // One atomic storage write contains the whole profile. A failed write leaves
    // the previous save intact and is surfaced to the player instead of quitting.
    this.storage.setItem(PROFILE_KEY,JSON.stringify(data));return clone(profile);
  }
}

export function formatSavedAt(iso){
  if(!iso)return 'Imported save';
  const d=new Date(iso);if(Number.isNaN(d.getTime()))return 'Saved game';
  const two=n=>String(n).padStart(2,'0');
  return `${two(d.getMonth()+1)}-${two(d.getDate())}-${d.getFullYear()}, ${two(d.getHours()%12||12)}:${two(d.getMinutes())} ${d.getHours()<12?'AM':'PM'}`;
}
