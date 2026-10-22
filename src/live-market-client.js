import {INVESTMENT_SYMBOLS as SYMBOLS} from './funds.js';
import {validLiveQuote,HISTORY_RANGES,localSession,marketSession,easternMinutes} from './live-market-data.js';
export class LiveMarketClient{
 constructor({fetcher=globalThis.fetch?.bind(globalThis),clock=()=>new Date()}={}){
  this.fetcher=fetcher;this.clock=clock;this.data=null;this.histories=new Map();this.nextRefresh=0;this.error='';this.loading=false;
  try{const saved=JSON.parse(localStorage.getItem('lemonomics_iex_quotes_v1'));if(saved?.version===1&&saved.feed==='iex')this.data=saved}catch{}
 }
 expectedSession(){const s=this.data?.session,now=this.clock();return s?.verified&&s.date===now.toLocaleDateString('en-CA',{timeZone:'America/New_York'})?marketSession({start:s.date,end:s.date,days:s.opens?[{date:s.date,open:s.opens,close:s.closes}]:[]},now):localSession(now)}
 delay(){const now=this.clock(),s=this.expectedSession();let wait=Math.max(5000,this.nextRefresh-+now);if(s.open&&this.data?.status==='ok'&&!this.data.session.open)return 5000;if(!s.open&&s.opens){const [h,m]=s.opens.split(':').map(Number),delta=(h*60+m-easternMinutes(now))*60000-now.getUTCSeconds()*1000-now.getUTCMilliseconds();if(delta>0)wait=Math.min(wait,delta)}return Math.max(5000,wait)}
 async refresh(onChange=()=>{}){
  if(this.pending)return this.pending;const boundary=this.expectedSession().open!==this.data?.session?.open;if(boundary&&this.data?.status==='ok')this.nextRefresh=Math.min(this.nextRefresh,+this.clock());if(+this.clock()<this.nextRefresh){onChange();return}
  this.loading=true;
  this.pending=(async()=>{try{
   if(!['http:','https:'].includes(globalThis.location?.protocol))throw Error('Live market data requires the private hosted game.');
   const response=await this.fetcher('/api/market/quotes',{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Live data is unavailable. Your last known prices and holdings are retained.');
   const data=await response.json();if(data?.version!==1||data.provider!=='Alpaca'||data.feed!=='iex'||!data.quotes||!data.session)throw Error('Invalid market response.');
   for(const s of SYMBOLS){const q=data.quotes[s];if(q&&q.price!==null&&!validLiveQuote(q,this.clock()))throw Error('Invalid market quote.');const old=this.data?.quotes?.[s];if(validLiveQuote(old,this.clock())&&validLiveQuote(q,this.clock())&&Date.parse(old.timestamp)>Date.parse(q.timestamp))data.quotes[s]={...old,current:false,stale:true,unavailable:true};}
   this.data=data;this.error=data.status==='ok'?'':data.message||({'configuration':'Alpaca credentials or IEX permission need attention.','rate-limited':'Provider limit reached. Cached prices are retained.','daily-limit':'Today’s safety budget is used. Quotes resume tomorrow.','disabled':'Live Alpaca data is not enabled yet.','pending':'Loading verified quotes and market calendar…'}[data.status]||'Live data is temporarily unavailable. Cached prices are retained.');
   if(this.error&&data.crypto?.status==='ok')this.error='ETF feed: '+this.error;
   this.nextRefresh=+this.clock()+Math.max(5000,Number(data.retryAfterMs)||5000);try{localStorage.setItem('lemonomics_iex_quotes_v1',JSON.stringify(data))}catch{}
  }catch(e){this.error=e.message;this.nextRefresh=+this.clock()+60000;if(this.data)this.data={...this.data,status:'unavailable',crypto:this.data.crypto?{...this.data.crypto,status:'unavailable'}:undefined};}finally{this.loading=false;onChange();}})();try{await this.pending}finally{this.pending=null}
 }
 async history(symbol,range,onChange=()=>{}){
  if(!SYMBOLS.includes(symbol)||!HISTORY_RANGES[range])return;
  const key=symbol+':'+range,entry=this.histories.get(key);if(entry?.pending||entry?.nextRefresh>+this.clock())return;
  this.histories.set(key,{...entry,pending:true});
  try{if(!SYMBOLS.includes(symbol)||!HISTORY_RANGES[range])return;const response=await this.fetcher('/api/market/history?'+new URLSearchParams({symbol,range}),{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error();const data=await response.json();if(data.symbol!==symbol||data.range!==range||!Array.isArray(data.points)||data.points.length>1600||data.points.some(p=>!Number.isFinite(p.price)||p.price<=0||!Number.isFinite(Date.parse(p.timestamp))||Date.parse(p.timestamp)>+this.clock()))throw Error();this.histories.set(key,{...data,pending:false,nextRefresh:+this.clock()+(data.nextPageToken||data.status==='pending'||data.status==='retained'?Math.max(5000,data.retryAfterMs||5000):HISTORY_RANGES[range].cacheMs)});
  }catch{this.histories.set(key,{...entry,pending:false,status:'unavailable',nextRefresh:+this.clock()+60000})}finally{onChange()}
 }
}
