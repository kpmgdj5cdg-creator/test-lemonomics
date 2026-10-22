import {FUNDS,SYMBOLS,INVESTMENT_SYMBOLS,isCrypto} from '../src/funds.js';
import {LIVE_LIMITS,HISTORY_RANGES,validLiveQuote} from '../src/live-market-data.js';
import {marketDay,previousSession} from '../src/market-data.js';
export class AlpacaError extends Error{constructor(status,retry=0){super(status===401||status===403?'Alpaca credentials or free-feed permissions need attention.':status===429?'Alpaca request limit reached; cached data is retained.':'Alpaca market data is temporarily unavailable.');this.status=status;this.retry=retry;}}
export async function alpacaJSON(env,path,{fetcher=fetch,now=new Date()}={}){
 // Closed allowlist. No browser-supplied URLs, feed names or brokerage orders.
 const calendar=path.startsWith('/v2/calendar?'),crypto=/^\/v1beta3\/crypto\/us\/(snapshots|bars)\?/.test(path);
 if(!calendar&&!crypto&&!path.startsWith('/v2/stocks/snapshots?')&&!/^\/v2\/stocks\/(DIA|SPY|ARKK|SGOV|GLD|SLV)\/bars\?/.test(path))throw Error('Unsupported market-data route.');
 const url=new URL(path,calendar?'https://paper-api.alpaca.markets':'https://data.alpaca.markets');
 if(crypto&&(url.searchParams.get('symbols')!=='BTC/USD'||url.searchParams.has('feed')))throw Error('Only the Bitcoin US crypto feed is supported.');
 if(!calendar&&!crypto&&url.searchParams.get('feed')!=='iex')throw Error('Only the free IEX feed is supported.');
 // Workers supports manual/follow, not redirect:error. Manual preserves the
 // no-redirect policy: 3xx is rejected below, so secrets never follow Location.
 const r=await fetcher(url.href,{method:'GET',headers:{'APCA-API-KEY-ID':env.ALPACA_API_KEY_ID,'APCA-API-SECRET-KEY':env.ALPACA_API_SECRET_KEY},signal:AbortSignal.timeout(8000),redirect:'manual'});
 if(!r.ok){const retry=r.headers.get('Retry-After');throw new AlpacaError(r.status,retry?Math.max(0,Number(retry)*1000||Date.parse(retry)-+now):0)}
 return r.json();
}
export function normalizeSnapshots(payload,previous=null,now=new Date()){
 const quotes={};for(const f of FUNDS){const s=payload?.[f.symbol],trade=s?.latestTrade,q={symbol:f.symbol,name:f.name,price:trade?.p,timestamp:trade?.t,provider:'Alpaca',feed:'iex'};
  if(!validLiveQuote(q,now)){if(previous?.quotes?.[f.symbol])quotes[f.symbol]={...previous.quotes[f.symbol],unavailable:true};continue}
  const prior=s.prevDailyBar,priorDate=Number.isFinite(Date.parse(prior?.t))?marketDay(new Date(prior.t)):null;
  q.previousClose=Number.isFinite(prior?.c)&&prior.c>0&&priorDate===previousSession(now)?prior.c:null;
  q.previousCloseDate=q.previousClose===null?null:priorDate;q.change=q.previousClose===null?null:+(q.price-q.previousClose).toFixed(6);q.changePercent=q.previousClose===null?null:(q.price/q.previousClose-1)*100;q.unavailable=false;
  const old=previous?.quotes?.[f.symbol];quotes[f.symbol]=old&&Date.parse(old.timestamp)>Date.parse(q.timestamp)?{...old,unavailable:false}:q;
 }
 return {quotes,fetchedAt:now.toISOString()};
}
export function calendarRequest(now=new Date()){
 const start=new Date(+now-8*86400000).toISOString().slice(0,10),end=new Date(+now+45*86400000).toISOString().slice(0,10);
 return {start,end,path:'/v2/calendar?'+new URLSearchParams({start,end})};
}
export function normalizeCalendar(payload,start,end){
 if(!Array.isArray(payload)||!payload.length)throw Error('Market calendar unavailable.');
 const days=payload.filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&/^\d{2}:\d{2}$/.test(x.open)&&/^\d{2}:\d{2}$/.test(x.close)&&x.date>=start&&x.date<=end).map(x=>({date:x.date,open:x.open,close:x.close}));
 if(!days.length)throw Error('Market calendar unavailable.');return {start,end,days};
}
export function historyRequest(symbol,range,now=new Date(),pageToken=null){
 if(!INVESTMENT_SYMBOLS.includes(symbol)||!HISTORY_RANGES[range])throw Error('Choose a supported fund and time range.');
 const spec=HISTORY_RANGES[range],end=new Date(+now-(isCrypto(symbol)?0:16*60000)),start=new Date(+end-(range==='1D'?(isCrypto(symbol)?1:4):spec.days)*86400000);
 if(range==='YTD')start.setTime(Date.UTC(end.getUTCFullYear(),0,1));
 const params=new URLSearchParams({start:start.toISOString(),end:end.toISOString(),timeframe:spec.timeframe,limit:'1000',sort:'asc'});if(isCrypto(symbol))params.set('symbols',symbol);else{params.set('feed','iex');params.set('adjustment','split')}if(pageToken)params.set('page_token',pageToken);
 return (isCrypto(symbol)?'/v1beta3/crypto/us/bars?':'/v2/stocks/'+symbol+'/bars?')+params;
}
export function normalizeBars(payload,existing=[],now=new Date(),symbol=null){
 const map=new Map(existing.map(p=>[p.timestamp,p]));
 for(const b of (isCrypto(symbol)?payload?.bars?.[symbol]:payload?.bars)||[]){if(!Number.isFinite(b.c)||b.c<=0||!Number.isFinite(Date.parse(b.t))||Date.parse(b.t)>+now)continue;map.set(b.t,{timestamp:b.t,price:b.c})}
 return [...map.values()].sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp));
}
export function boundedHistory(points,range){
 if(range==='1D'&&points.length){const last=marketDay(new Date(points.at(-1).timestamp));points=points.filter(p=>marketDay(new Date(p.timestamp))===last)}
 if(points.length<=LIVE_LIMITS.maxHistoryPoints)return points;
 // Decimate actual observations only. Never synthesize an interpolated price.
 return Array.from({length:LIVE_LIMITS.maxHistoryPoints},(_,i)=>points[Math.round(i*(points.length-1)/(LIVE_LIMITS.maxHistoryPoints-1))]);
}

export function normalizeBitcoin(payload,previous=null,now=new Date()){
 const symbol='BTC/USD',s=payload?.snapshots?.[symbol],trade=s?.latestTrade;
 const q={symbol,name:'Bitcoin',price:trade?.p,timestamp:trade?.t,provider:'Alpaca',feed:'crypto-us'};
 if(!validLiveQuote(q,now))return {quotes:previous?.quotes?.[symbol]?{[symbol]:{...previous.quotes[symbol],unavailable:true}}:{},fetchedAt:now.toISOString()};
 const prior=s.prevDailyBar,utcDay=now.toISOString().slice(0,10),previousDay=new Date(Date.parse(utcDay+'T00:00:00Z')-86400000).toISOString().slice(0,10);
 q.previousClose=Number.isFinite(prior?.c)&&prior.c>0&&Number.isFinite(Date.parse(prior?.t))&&new Date(prior.t).toISOString().slice(0,10)===previousDay?prior.c:null;
 q.previousCloseDate=q.previousClose===null?null:previousDay;q.change=q.previousClose===null?null:q.price-q.previousClose;q.changePercent=q.previousClose===null?null:(q.price/q.previousClose-1)*100;q.unavailable=false;
 const old=previous?.quotes?.[symbol];return {quotes:{[symbol]:old&&Date.parse(old.timestamp)>Date.parse(q.timestamp)?{...old,unavailable:false}:q},fetchedAt:now.toISOString()};
}
