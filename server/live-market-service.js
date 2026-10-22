import {SYMBOLS} from '../src/funds.js';
import {LIVE_LIMITS,HISTORY_RANGES,decorateQuotes,marketSession} from '../src/live-market-data.js';
import {alpacaJSON,normalizeSnapshots,calendarRequest,normalizeCalendar,historyRequest,normalizeBars,boundedHistory} from './alpaca-provider.js';
const load=row=>{try{return row?.payload?JSON.parse(row.payload):null}catch{return null}};
export async function credentialFingerprint(env){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(env.ALPACA_API_KEY_ID+'\0'+env.ALPACA_API_SECRET_KEY));return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('')}
export class LiveMarketService{
 constructor(env,{fetcher=fetch,clock=()=>new Date()}={}){this.env=env;this.db=env.DB?.withSession?env.DB.withSession('first-primary'):env.DB;this.fetcher=fetcher;this.clock=clock;}
 enabled(){return this.env.ALPACA_LIVE_ENABLED==='true'&&!!this.env.ALPACA_API_KEY_ID&&!!this.env.ALPACA_API_SECRET_KEY}
 async init(){
  const fp=await credentialFingerprint(this.env);await this.db.prepare('INSERT OR IGNORE INTO live_market_guard (id,fingerprint) VALUES (1,?)').bind(fp).run();
  // Rotating credentials clears authorization failures, but never resets quotas.
  await this.db.prepare("UPDATE live_market_guard SET fingerprint=?,paused_until=0,status='ok',failures=0 WHERE id=1 AND fingerprint<>?").bind(fp,fp).run();
 }
 async cache(key){return this.db.prepare('SELECT * FROM live_market_cache WHERE cache_key=?').bind(key).first()}
 async guard(){return this.db.prepare('SELECT * FROM live_market_guard WHERE id=1').first()}
 async reserve(){
  const now=+this.clock(),day=this.clock().toISOString().slice(0,10),minute=Math.floor(now/60000);
  const r=await this.db.prepare(`UPDATE live_market_guard SET day=?,daily_calls=CASE WHEN day=? THEN daily_calls+1 ELSE 1 END,minute=?,minute_calls=CASE WHEN minute=? THEN minute_calls+1 ELSE 1 END,next_call=? WHERE id=1 AND status<>'configuration' AND paused_until<=? AND next_call<=? AND (day<>? OR daily_calls<?) AND (minute<>? OR minute_calls<?)`).bind(day,day,minute,minute,now+LIVE_LIMITS.minCallGapMs,now,now,day,LIVE_LIMITS.dailyCalls,minute,LIVE_LIMITS.minuteCalls).run();
  return !!r.meta.changes;
 }
 async failure(error,operation='unknown'){
  const now=+this.clock(),g=await this.guard(),status=[401,403].includes(error.status)?'configuration':error.status===429?'rate-limited':'unavailable';
  const delay=status==='configuration'?365*86400000:Math.max(status==='rate-limited'?60000:30000,Math.min(365*86400000,Number.isFinite(error.retry)?error.retry:0),Math.min(3600000,30000*2**Math.min(6,g.failures)));
  await this.db.prepare('UPDATE live_market_guard SET paused_until=?,failures=failures+1,status=? WHERE id=1').bind(now+delay,status).run();
  const diagnosis={at:this.clock().toISOString(),operation:['calendar','quotes','history'].includes(operation)?operation:'unknown',httpStatus:Number.isInteger(error.status)&&error.status>=100&&error.status<=599?error.status:null,reason:error.status?'http-error':error.name==='TimeoutError'||error.name==='AbortError'?'timeout':error.name==='SyntaxError'?'invalid-response':'network-or-invalid-response'};
  // Store only explicitly selected safe fields: never provider bodies, messages,
  // URLs, request headers, credentials or account identifiers.
  await this.db.prepare("INSERT INTO live_market_cache (cache_key,payload,fetched) VALUES ('diagnostic',?,?) ON CONFLICT(cache_key) DO UPDATE SET payload=excluded.payload,fetched=excluded.fetched").bind(JSON.stringify(diagnosis),now).run();
 }
 async request(path){
  if(!await this.reserve())return null;
  try{const result=await alpacaJSON(this.env,path,{fetcher:this.fetcher,now:this.clock()});await this.db.prepare("UPDATE live_market_guard SET failures=0,status='ok' WHERE id=1 AND status<>'configuration'").run();return result}catch(e){await this.failure(e,path.startsWith('/v2/calendar?')?'calendar':path.startsWith('/v2/stocks/snapshots?')?'quotes':'history');e.marketFailureRecorded=true;throw e}
 }
 async resource(key,ttl,refresh){
  let row=await this.cache(key);const now=+this.clock();if(row?.fetched>now-ttl)return {data:load(row),cached:true};
  const guard=await this.guard();if(guard.paused_until>now||guard.status==='configuration'||(guard.day===this.clock().toISOString().slice(0,10)&&guard.daily_calls>=LIVE_LIMITS.dailyCalls))return {data:load(row),retained:true};
  await this.db.prepare('INSERT OR IGNORE INTO live_market_cache (cache_key) VALUES (?)').bind(key).run();
  const lease=now+15000,claim=await this.db.prepare('UPDATE live_market_cache SET lease=? WHERE cache_key=? AND lease<=? AND fetched<=?').bind(lease,key,now,now-ttl).run();
  if(!claim.meta.changes)return {data:load(await this.cache(key)),pending:true};
  try{
   const data=await refresh(load(row));if(data!==null){await this.db.prepare('UPDATE live_market_cache SET payload=?,fetched=?,lease=0 WHERE cache_key=? AND lease=?').bind(JSON.stringify(data),+this.clock(),key,lease).run();return {data,cached:false};}
  }catch(e){if(!e.marketFailureRecorded)await this.failure(e,key==='calendar'?'calendar':key==='quotes'?'quotes':'history')}finally{await this.db.prepare('UPDATE live_market_cache SET lease=0 WHERE cache_key=? AND lease=?').bind(key,lease).run()}
  return {data:load(await this.cache(key)),retained:true};
 }
 async diagnostics(){
  const configuration={activationEnabled:this.env.ALPACA_LIVE_ENABLED==='true',keyIdPresent:!!this.env.ALPACA_API_KEY_ID,secretKeyPresent:!!this.env.ALPACA_API_SECRET_KEY};
  try{
   const g=await this.guard(),lastFailure=load(await this.cache('diagnostic')),calendar=load(await this.cache('calendar')),quotes=load(await this.cache('quotes'));
   return {configuration,storage:'ok',status:g?.status||'not-started',pausedUntil:g?.paused_until?new Date(g.paused_until).toISOString():null,failures:g?.failures||0,dailyCalls:g?.daily_calls||0,budgetDate:g?.day||null,lastFailure:lastFailure?{at:lastFailure.at,operation:lastFailure.operation,httpStatus:lastFailure.httpStatus,reason:lastFailure.reason}:null,calendarCached:!!calendar,quotesCached:!!quotes,note:'Read-only diagnostic. Open Investments and refresh prices once after any current backoff ends to record a new failure. No keys or provider response bodies are returned.'};
  }catch{return {configuration,storage:'unavailable',message:'Market cache tables or the D1 binding are unavailable. Check the deployment migration result.'}}
 }
 async calendar(){
  const spec=calendarRequest(this.clock());return this.resource('calendar',86400000,async()=>{const raw=await this.request(spec.path);return raw?normalizeCalendar(raw,spec.start,spec.end):null});
 }
 async quotes(){
  const now=this.clock();if(!this.enabled())return {...decorateQuotes(null,null,'disabled',now,300000),message:'Live Alpaca data is not enabled. Holdings are preserved; ask the family administrator to complete the free-plan setup.'};
  await this.init();
  // Verify the calendar first. Cold starts fetch snapshots on a later poll,
  // respecting the shared request gap.
  const calendarRow=await this.cache('calendar');if(!calendarRow||calendarRow.fetched<+now-86400000){const refresh=await this.calendar();if(!calendarRow&&refresh.data)return decorateQuotes(load(await this.cache('quotes')),refresh.data,'pending',this.clock(),5000);}
  const cachedCalendar=load(await this.cache('calendar')),session=marketSession(cachedCalendar,now);
  const result=await this.resource('quotes',session.open?LIVE_LIMITS.quoteCacheMs:LIVE_LIMITS.closedCacheMs,async old=>{
   const raw=await this.request('/v2/stocks/snapshots?'+new URLSearchParams({symbols:SYMBOLS.join(','),feed:'iex'}));return raw?normalizeSnapshots(raw,old,this.clock()):null;
  });
  // The calendar is refreshed before snapshots, preventing a cold-start race.
  const calendar=load(await this.cache('calendar')),g=await this.guard(),today=now.toISOString().slice(0,10);
  const budget=g.day===today&&g.daily_calls>=LIVE_LIMITS.dailyCalls;
  const activePause=g.paused_until>+now||g.status==='configuration';
  const status=budget?'daily-limit':activePause?g.status:result.data?'ok':result.pending?'pending':'unavailable';
  const retry=budget?86400000-(+now%86400000):activePause?g.paused_until-(+now):marketSession(calendar,now).open?5000:300000;
  return decorateQuotes(result.data,calendar,status,this.clock(),retry);
 }
 async history(symbol,range){
  if(!SYMBOLS.includes(symbol)||!HISTORY_RANGES[range])return {status:'invalid',message:'Choose one of the six funds and a supported time range.'};
  if(!this.enabled())return {status:'disabled',symbol,range,points:[],message:'Alpaca history is not enabled. Existing records are preserved.'};
  await this.init();const key='history:'+symbol+':'+range,spec=HISTORY_RANGES[range],now=this.clock();
  const result=await this.resource(key,spec.cacheMs,async old=>{
   const raw=await this.request(historyRequest(symbol,range,now,old?.nextPageToken||null));if(!raw)return null;
   const continuation=!!old?.nextPageToken,points=normalizeBars(raw,continuation?old.points:[],now),pages=continuation?(old.pages||1)+1:1;
   const next=typeof raw.next_page_token==='string'&&raw.next_page_token.length<=1024&&pages<LIVE_LIMITS.maxHistoryPages?raw.next_page_token:null;
   return {symbol,range,points:boundedHistory(points,range),pages,nextPageToken:next,truncated:!!raw.next_page_token&&!next,fetchedAt:now.toISOString(),provider:'Alpaca',feed:'iex',adjustment:'split',delayedMinutes:16};
  });
  // A bounded continuation is fetched on a later on-demand call, never a tight
  // server loop or extra subrequests hidden inside one client request.
  if(result.data?.nextPageToken&&!result.retained)await this.db.prepare('UPDATE live_market_cache SET fetched=0 WHERE cache_key=?').bind(key).run();
  const g=await this.guard(),blocked=g.paused_until>+now||g.status==='configuration';
  return {...result.data,symbol,range,status:blocked?g.status:result.retained?'retained':result.data?.nextPageToken?'partial':result.data?'ok':'pending',points:result.data?.points||[],retryAfterMs:Math.max(5000,g.paused_until-(+now)),stale:!!result.retained||blocked};
 }
}
