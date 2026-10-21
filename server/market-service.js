import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import {previousSession,validateMarket} from '../src/market-data.js';

import {downloadMarket} from './market-provider.js';
export {downloadMarket,parseYahoo} from './market-provider.js';

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
