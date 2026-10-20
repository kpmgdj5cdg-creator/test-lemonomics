import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import {SYMBOLS} from '../src/funds.js';
import {marketDay,previousSession,validateMarket} from '../src/market-data.js';

export function parseYahoo(symbol,payload,today){
  const r=payload.chart?.result?.[0];if(!r||r.meta?.currency!=='USD')throw new Error(symbol+': provider returned no USD data.');
  const dates=r.timestamp||[],closes=r.indicators?.quote?.[0]?.close||[],adjusted=r.indicators?.adjclose?.[0]?.adjclose||closes;
  const history=dates.flatMap((timestamp,i)=>{const date=marketDay(new Date(timestamp*1000));return date<today&&Number.isFinite(closes[i])&&closes[i]>0&&Number.isFinite(adjusted[i])&&adjusted[i]>0?[[date,+closes[i].toFixed(6),+adjusted[i].toFixed(6)]]:[]});
  const events=[];
  for(const e of Object.values(r.events?.splits||{})){const date=marketDay(new Date(e.date*1000));if(date<today)events.push({date,type:'split',value:e.numerator/e.denominator});}
  for(const e of Object.values(r.events?.dividends||{})){const date=marketDay(new Date(e.date*1000));if(date<today)events.push({date,type:'dividend',value:e.amount});}
  if(history.length<2)throw new Error(symbol+': provider returned insufficient history.');return {history,events};
}
export async function downloadMarket({fetcher=fetch,now=new Date()}={}){
  const today=marketDay(now),start=new Date(today+'T00:00:00Z');start.setUTCFullYear(start.getUTCFullYear()-5);start.setUTCDate(start.getUTCDate()-12);
  const funds={};
  // Only the six fixed symbols can be requested. No arbitrary proxy URL is accepted.
  for(const symbol of SYMBOLS){
    const params=new URLSearchParams({period1:String(Math.floor(start.getTime()/1000)),period2:String(Math.floor(now.getTime()/1000)),interval:'1d',events:'div,splits'});
    const response=await fetcher('https://query1.finance.yahoo.com/v8/finance/chart/'+symbol+'?'+params,{headers:{'User-Agent':'LemonadeLane/1.0 personal educational game'},signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error('Market provider returned HTTP '+response.status+' for '+symbol+'.');
    funds[symbol]=parseYahoo(symbol,await response.json(),today);
  }
  // Holidays or a lagging individual fund must never mix execution dates.
  const common=funds[SYMBOLS[0]].history.map(p=>p[0]).filter(date=>SYMBOLS.every(s=>funds[s].history.some(p=>p[0]===date)));
  const asOf=common.at(-1);if(!asOf)throw new Error('No common completed trading session was returned.');
  for(const s of SYMBOLS){funds[s].history=funds[s].history.filter(p=>p[0]<=asOf);funds[s].events=funds[s].events.filter(e=>e.date<=asOf);}
  return validateMarket({version:1,asOf,fetchedAt:now.toISOString(),source:'Yahoo Finance · daily closes and adjusted fund history',funds},now);
}
export function createMarketService({cacheFile=resolve('.cache/market.json'),snapshotFile=resolve('src/data/market-snapshot.json'),fetcher=fetch,clock=()=>new Date()}={}){
  let cached=null,loadPromise=null,pending=null,nextRetry=0;
  async function load(){
    if(!loadPromise)loadPromise=(async()=>{for(const path of [cacheFile,snapshotFile]){try{const data=validateMarket(JSON.parse(await readFile(path,'utf8')),clock());if(!cached||data.asOf>cached.asOf)cached=data}catch{}}})();
    await loadPromise;
  }
  async function get(){
    await load();const now=clock(),target=previousSession(now);
    if(cached?.asOf===target)return {data:cached,status:'current'};
    if(Date.now()<nextRetry)return cached?{data:cached,status:'stale'}:{data:null,status:'unavailable'};
    if(!pending)pending=(async()=>{
      try{
        const data=await downloadMarket({fetcher,now});
        if(!cached||data.asOf>=cached.asOf){cached=data;await mkdir(resolve(cacheFile,'..'),{recursive:true});await writeFile(cacheFile+'.tmp',JSON.stringify(cached));await rename(cacheFile+'.tmp',cacheFile);}
        // An incomplete provider response is retried later, not six times per tab click.
        if(cached.asOf!==target)nextRetry=Date.now()+15*60*1000;
      }catch(error){nextRetry=Date.now()+15*60*1000;console.warn('Market refresh unavailable:',error.message)}finally{pending=null}
    })();
    await pending;return cached?{data:cached,status:cached.asOf===target?'current':'stale'}:{data:null,status:'unavailable'};
  }
  return {get};
}
export function marketMiddleware(service){return async(req,res,next)=>{
  if(req.url?.split('?')[0]!=='/api/market'){next();return}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return}
  const result=await service.get();res.writeHead(result.data?200:503,{'Content-Type':'application/json','Cache-Control':'no-store'});
  res.end(req.method==='HEAD'?'':JSON.stringify({...result,message:result.data?'':'Closing prices are unavailable. Please try again later.'}));
}}
