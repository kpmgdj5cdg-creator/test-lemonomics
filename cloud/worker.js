import snapshot from '../src/data/market-snapshot.json' with {type:'json'};
import {downloadFund} from '../server/market-provider.js';
import {previousSession} from '../src/market-data.js';
import {SYMBOLS} from '../src/funds.js';
import {validName} from '../src/profiles.js';

const encoder=new TextEncoder(),COOKIE='__Host-lemonomics',MAX_BODY=2_000_000;
const security={'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow, noarchive','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'DENY','Content-Security-Policy':"frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'"};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...security,'Content-Type':'application/json'}});
const error=(message,status)=>Object.assign(new Error(message),{status});
const hex=bytes=>[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
async function key(secret){return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify'])}
async function signature(secret,value){return hex(await crypto.subtle.sign('HMAC',await key(secret),encoder.encode(value)))}
async function verify(secret,value,sig){
  if(!/^[0-9a-f]{64}$/.test(sig||''))return false;
  return crypto.subtle.verify('HMAC',await key(secret),new Uint8Array(sig.match(/../g).map(x=>parseInt(x,16))),encoder.encode(value));
}
async function authenticated(request,secret,now){
  const value=request.headers.get('Cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';
  const [expiry,nonce,sig]=value.split('.');
  return /^\d+$/.test(expiry||'')&&+expiry>now&&+expiry<=now+7*86400000&&/^[\da-f-]{36}$/.test(nonce||'')&&await verify(secret,expiry+'.'+nonce,sig);
}
function loginPage(message=''){
  return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lemonomics · Family test</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#69b461;color:#124f2d;font:18px system-ui}main{width:min(86vw,420px);text-align:center}h1{color:#ffda39;font-size:clamp(36px,8vw,58px);text-shadow:3px 3px #97761d}form{padding:28px;background:#eff8cd;border:3px solid #17663a;border-radius:12px;display:grid;gap:16px}input,button{font:inherit;padding:12px;border:2px solid #17663a;border-radius:6px}button{background:#17663a;color:#fff;cursor:pointer}.error{color:#8b2121}</style><main><h1>LEMONOMICS</h1><p>Our family playtest</p><form method="post" action="/login"><label for="password">Family password</label><input id="password" name="password" type="password" autocomplete="current-password" maxlength="256" required><button>Play Lemonomics</button><p class="error" role="alert">${message}</p></form></main></html>`,{status:200,headers:{...security,'Content-Type':'text/html; charset=utf-8'}});
}
async function body(request){
  if(+request.headers.get('Content-Length')>MAX_BODY)throw error('Save is too large.',413);
  const reader=request.body?.getReader();if(!reader)return '';
  let size=0,parts=[];try{while(true){const r=await reader.read();if(r.done)break;size+=r.value.byteLength;if(size>MAX_BODY){await reader.cancel();throw error('Save is too large.',413)}parts.push(r.value)}}finally{reader.releaseLock()}
  const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length}return new TextDecoder().decode(bytes);
}
function validProfile(p){return p&&typeof p.id==='string'&&/^[\da-f-]{36}$/.test(p.id)&&validName(p.name)&&['male','female'].includes(p.avatar)&&p.state&&Number.isInteger(p.state.day)&&p.state.day>0&&p.state.inventory&&Array.isArray(p.state.ledger)}
export async function refreshFund(env,symbol,now,fetcher=fetch){
  if(!SYMBOLS.includes(symbol))return json({message:'Unknown fund.'},404);
  await env.DB.prepare("INSERT OR IGNORE INTO fund_cache (symbol,as_of,payload,lease) VALUES (?,'',NULL,0)").bind(symbol).run();
  const row=await env.DB.prepare('SELECT as_of FROM fund_cache WHERE symbol=?').bind(symbol).first();
  if(row.as_of>=previousSession(new Date(now)))return json({status:'current'});
  const lease=now+15*60000;
  const claimed=await env.DB.prepare('UPDATE fund_cache SET lease=? WHERE symbol=? AND lease<=?').bind(lease,symbol,now).run();
  if(!claimed.meta.changes)return json({status:'pending-or-retained'});
  try{
    const fund=await downloadFund(symbol,{fetcher,now:new Date(now)}),asOf=fund.history.at(-1)[0];
    await env.DB.prepare('UPDATE fund_cache SET payload=?,as_of=? WHERE symbol=? AND as_of<=? AND lease=?').bind(JSON.stringify(fund),asOf,symbol,asOf,lease).run();
    return json({status:'refreshed'});
  }catch{return json({status:'retained'})}
}
export async function market(env,now){
  await env.DB.prepare('INSERT OR IGNORE INTO market_cache (id,as_of,payload) VALUES (1,?,?)').bind(snapshot.asOf,JSON.stringify(snapshot)).run();
  let row=await env.DB.prepare('SELECT * FROM market_cache WHERE id=1').first();
  const target=previousSession(new Date(now));
  if(row.as_of<target){
    const cached=await env.DB.prepare('SELECT symbol,payload FROM fund_cache WHERE payload IS NOT NULL').all();
    if(cached.results.length===6){
      // Each fund has already been validated in a separate, bounded request.
      const funds=Object.fromEntries(cached.results.map(r=>[r.symbol,JSON.parse(r.payload)]));
      const dates=Object.fromEntries(SYMBOLS.map(s=>[s,new Set(funds[s].history.map(p=>p[0]))]));
      const asOf=funds[SYMBOLS[0]].history.map(p=>p[0]).filter(d=>SYMBOLS.every(s=>dates[s].has(d))).at(-1);
      if(asOf&&asOf>row.as_of){
        for(const s of SYMBOLS){funds[s].history=funds[s].history.filter(p=>p[0]<=asOf);funds[s].events=funds[s].events.filter(e=>e.date<=asOf)}
        const data={version:1,asOf,fetchedAt:new Date(now).toISOString(),source:'Yahoo Finance · daily closes and adjusted fund history',funds};
        await env.DB.prepare('UPDATE market_cache SET payload=?,as_of=? WHERE id=1 AND as_of<?').bind(JSON.stringify(data),asOf,asOf).run();
        row=await env.DB.prepare('SELECT * FROM market_cache WHERE id=1').first();
      }
    }
  }
  const data=JSON.parse(row.payload),stale=data.asOf!==target;
  return json({data,status:stale?'stale':'current',refreshFunds:stale});
}
export default {
 async fetch(request,env){
  try{
   if(!env.FAMILY_PASSWORD||env.FAMILY_PASSWORD.length<12)return json({message:'Family access is not configured yet.'},503);
   const url=new URL(request.url),path=url.pathname,now=Date.now(),mutation=!['GET','HEAD'].includes(request.method);
   if(mutation&&request.headers.get('Origin')!==url.origin)return json({message:'Please submit from the game website.'},403);
   if(path==='/login'){
    if(request.method==='GET')return loginPage();
    if(request.method!=='POST')return json({message:'Method not allowed.'},405);
    const ip=request.headers.get('CF-Connecting-IP')||'local',bucket=await signature(env.FAMILY_PASSWORD,ip+':'+Math.floor(now/900000));
    await env.DB.prepare('DELETE FROM login_attempts WHERE expires<?').bind(now).run();
    const attempts=await env.DB.prepare('INSERT INTO login_attempts (bucket,attempts,expires) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET attempts=attempts+1 RETURNING attempts').bind(bucket,now+900000).first();
    if(attempts.attempts>10)return new Response('Too many attempts. Please try again in 15 minutes.',{status:429,headers:{...security,'Retry-After':'900'}});
    const password=new URLSearchParams(await body(request)).get('password')||'';
    const sig=await signature(env.FAMILY_PASSWORD,'password-check');
    if(!await verify(password,'password-check',sig))return loginPage('That password did not match. Please try again.');
    const value=(now+7*86400000)+'.'+crypto.randomUUID();
    return new Response(null,{status:303,headers:{...security,Location:'/', 'Set-Cookie':`${COOKIE}=${value}.${await signature(env.FAMILY_PASSWORD,value)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`}});
   }
   if(!await authenticated(request,env.FAMILY_PASSWORD,now)){
    if(path.startsWith('/api/'))return json({message:'Sign in again, then retry saving. Keep this game open.'},401);
    return new Response(null,{status:303,headers:{...security,Location:'/login'}});
   }
   if(path==='/logout'&&request.method==='POST')return new Response(null,{status:303,headers:{...security,Location:'/login','Set-Cookie':COOKIE+'=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'}});
   if(path==='/api/config'&&request.method==='GET')return json({onlineProfiles:true,version:1});
   if(path==='/api/market'&&request.method==='GET')return market(env,now);
   if(path.startsWith('/api/market/fund/')&&request.method==='GET')return refreshFund(env,path.slice('/api/market/fund/'.length),now);
   if(path==='/api/profiles'&&request.method==='GET'){
    const rows=await env.DB.prepare('SELECT slot,revision,profile FROM profiles ORDER BY slot').all(),slots=[null,null,null];
    for(const row of rows.results)slots[row.slot]={...JSON.parse(row.profile),revision:row.revision};
    return json({version:1,slots});
   }
   if(path==='/api/profiles'&&['POST','PUT'].includes(request.method)){
    let payload;try{payload=JSON.parse(await body(request))}catch(e){if(e.status)throw e;throw error('Invalid save format.',400)}
    const {slot,profile,revision}=payload;
    if(!Number.isInteger(slot)||slot<0||slot>2||!validProfile(profile))throw error('Invalid player profile.',400);
    const clean={id:profile.id,name:profile.name,avatar:profile.avatar,state:profile.state,savedAt:new Date(now).toISOString(),marketAsOf:profile.marketAsOf||null};
    let result;
    if(request.method==='POST')result=await env.DB.prepare('INSERT OR IGNORE INTO profiles (slot,id,revision,profile) VALUES (?,?,1,?)').bind(slot,clean.id,JSON.stringify(clean)).run();
    else{
     if(!Number.isInteger(revision)||revision<1)throw error('Invalid save revision.',400);
     // Name/avatar identity cannot be changed by an update or another occupied slot.
     const old=await env.DB.prepare('SELECT profile FROM profiles WHERE slot=? AND id=?').bind(slot,clean.id).first();
     if(old){const p=JSON.parse(old.profile);clean.name=p.name;clean.avatar=p.avatar}
     result=await env.DB.prepare('UPDATE profiles SET profile=?,revision=revision+1 WHERE slot=? AND id=? AND revision=?').bind(JSON.stringify(clean),slot,clean.id,revision).run();
    }
    if(!result.meta.changes)return json({message:'This profile changed on another computer. Your browser backup has been kept. Reload to load the online version; your changes have not overwritten it.'},409);
    return json({...clean,revision:request.method==='POST'?1:revision+1});
   }
   if(path.startsWith('/api/'))return json({message:'Not found.'},404);
   if(!['GET','HEAD'].includes(request.method))return json({message:'Method not allowed.'},405);
   const response=await env.ASSETS.fetch(request),headers=new Headers(response.headers);
   for(const [k,v] of Object.entries(security))headers.set(k,v);
   return new Response(response.body,{status:response.status,headers});
  }catch(e){return json({message:e.status?e.message:'The online service could not complete that request. Keep your game open and try again.'},e.status||503)}
 }
};
