import {FUNDS,INVESTMENT_SYMBOLS,isCrypto} from './funds.js';
import {marketDay,holidays} from './market-data.js';
export const LIVE_LIMITS={quoteCacheMs:5000,cryptoQuoteCacheMs:20000,cryptoSnapshotAgeMs:45000,closedCacheMs:300000,tradeAgeMs:120000,snapshotAgeMs:15000,minuteCalls:30,dailyCalls:10000,minCallGapMs:1000,maxHistoryPoints:1600,maxHistoryPages:4};
export const HISTORY_RANGES={'1D':{timeframe:'1Min',days:1,cacheMs:60000},'1W':{timeframe:'5Min',days:7,cacheMs:300000},'1M':{timeframe:'1Hour',days:32,cacheMs:900000},'3M':{timeframe:'1Day',days:94,cacheMs:3600000},'YTD':{timeframe:'1Day',days:370,cacheMs:3600000},'1Y':{timeframe:'1Day',days:370,cacheMs:21600000},'5Y':{timeframe:'1Week',days:1835,cacheMs:86400000}};
const clock=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
export function easternMinutes(now){const p=Object.fromEntries(clock.formatToParts(now).map(x=>[x.type,x.value]));return +p.hour*60+(+p.minute)}
export function localSession(now=new Date()){
 const day=marketDay(now),d=new Date(day+'T12:00:00Z'),year=d.getUTCFullYear(),weekday=d.getUTCDay(),closed=[0,6].includes(weekday)||holidays(year).has(day);
 const thanksgiving=new Date(Date.UTC(year,10,1));while(thanksgiving.getUTCDay()!==4)thanksgiving.setUTCDate(thanksgiving.getUTCDate()+1);thanksgiving.setUTCDate(thanksgiving.getUTCDate()+22);
 // Conservative fallback only; new trades require a verified Alpaca calendar day.
 const early=day===thanksgiving.toISOString().slice(0,10)||day===`${year}-12-24`||day===`${year}-07-03`;
 const minute=easternMinutes(now),close=early?780:960;
 return {date:day,open:!closed&&minute>=570&&minute<close,opens:'09:30',closes:early?'13:00':'16:00',verified:false,source:'Local US market schedule (unverified)',earlyClose:early};
}
export function marketSession(calendar,now=new Date()){
 const day=marketDay(now),valid=calendar&&calendar.start<=day&&calendar.end>=day;
 if(!valid)return localSession(now);
 const row=calendar.days.find(x=>x.date===day),minutes=easternMinutes(now),toMinutes=s=>{const [h,m]=s.split(':').map(Number);return h*60+m};
 return {date:day,open:!!row&&minutes>=toMinutes(row.open)&&minutes<toMinutes(row.close),opens:row?.open||null,closes:row?.close||null,verified:true,source:'Alpaca market calendar',earlyClose:!!row&&toMinutes(row.close)<960};
}
export function validLiveQuote(q,now=new Date()){
 return !!q&&INVESTMENT_SYMBOLS.includes(q.symbol)&&Number.isFinite(q.price)&&q.price>0&&Number.isFinite(Date.parse(q.timestamp))&&Date.parse(q.timestamp)<=+now+1000;
}
export function tradeQuote(data,symbol,now=new Date()){
 const q=data?.quotes?.[symbol],session=data?.session;
 if(isCrypto(symbol)){
  const crypto=data?.crypto,fetched=Date.parse(crypto?.fetchedAt);
  if(crypto?.status!=='ok'||!Number.isFinite(fetched)||fetched>+now+1000||+now-fetched>LIVE_LIMITS.cryptoSnapshotAgeMs||!validLiveQuote(q,now)||q.symbol!==symbol||q.unavailable||q.feed!=='crypto-us'||q.provider!=='Alpaca'||+now-Date.parse(q.timestamp)>LIVE_LIMITS.tradeAgeMs)throw Error('This Bitcoin quote is expired or unavailable. Refresh prices before trading.');
  return q;
 }
 if(!session?.open||!session.verified||session.date!==marketDay(now))throw Error('Virtual trades are available only during verified regular US market hours.');
 const minute=easternMinutes(now),close=session.closes?.split(':').map(Number),open=session.opens?.split(':').map(Number);
 if(!close||!open||minute<open[0]*60+open[1]||minute>=close[0]*60+close[1])throw Error('The regular market session has closed.');
 const fetched=Date.parse(data.fetchedAt),tradeMinute=validLiveQuote(q,now)?easternMinutes(new Date(q.timestamp)):-1;
 if(data.status!=='ok'||!Number.isFinite(fetched)||fetched>+now+1000||!validLiveQuote(q,now)||marketDay(new Date(q.timestamp))!==session.date||tradeMinute<open[0]*60+open[1]||tradeMinute>=close[0]*60+close[1]||q.unavailable||q.feed!=='iex'||q.provider!=='Alpaca'||+now-Date.parse(q.timestamp)>LIVE_LIMITS.tradeAgeMs||+now-Date.parse(data.fetchedAt)>LIVE_LIMITS.snapshotAgeMs)throw Error('This IEX quote is expired or unavailable. Refresh prices before trading.');
 return q;
}
export function decorateQuotes(raw,calendar,status='ok',now=new Date(),retryAfterMs=5000){
 const session=marketSession(calendar,now),quotes={};
 for(const f of FUNDS){const q=raw?.quotes?.[f.symbol];const valid=validLiveQuote(q,now);quotes[f.symbol]=valid?{...q,name:f.name,current:status==='ok'&&session.open&&session.verified&&!q.unavailable&&+now-Date.parse(q.timestamp)<=LIVE_LIMITS.tradeAgeMs&&+now-Date.parse(raw.fetchedAt)<=LIVE_LIMITS.snapshotAgeMs,stale:!session.open||!session.verified||status!=='ok'||!!q.unavailable||!Number.isFinite(Date.parse(raw?.fetchedAt))||+now-Date.parse(raw.fetchedAt)>LIVE_LIMITS.snapshotAgeMs||+now-Date.parse(q.timestamp)>LIVE_LIMITS.tradeAgeMs}:{symbol:f.symbol,name:f.name,price:null,unavailable:true,current:false,stale:true,provider:'Alpaca',feed:'iex'};}
 return {version:1,provider:'Alpaca',feed:'iex',fetchedAt:raw?.fetchedAt||null,serverTime:now.toISOString(),status,session,quotes,retryAfterMs:Math.max(5000,retryAfterMs)};
}

export function decorateBitcoin(raw,status='ok',now=new Date(),retryAfterMs=20000){
 const q=raw?.quotes?.['BTC/USD'],valid=validLiveQuote(q,now),fetched=Date.parse(raw?.fetchedAt);
 const current=valid&&status==='ok'&&!q.unavailable&&Number.isFinite(fetched)&&fetched<=+now+1000&&+now-fetched<=LIVE_LIMITS.cryptoSnapshotAgeMs&&+now-Date.parse(q.timestamp)<=LIVE_LIMITS.tradeAgeMs;
 return {quote:valid?{...q,current,stale:!current}:{symbol:'BTC/USD',name:'Bitcoin',price:null,unavailable:true,current:false,stale:true,provider:'Alpaca',feed:'crypto-us'},market:{status,fetchedAt:raw?.fetchedAt||null,alwaysOpen:true,retryAfterMs:Math.max(5000,retryAfterMs)}};
}
