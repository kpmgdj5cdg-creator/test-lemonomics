import {validMortgageRate} from '../src/mortgage.js';
export const RATE_SOURCE='Freddie Mac PMMS · 30-year fixed · via FRED';
export function parseMortgageRate(csv,now=new Date()){
 const rows=String(csv).trim().split(/\r?\n/).slice(1).map(line=>{const [asOf,value]=line.replaceAll('"','').split(',');return {asOf,rate:Number(value),source:RATE_SOURCE}}).filter(q=>validMortgageRate(q,now)).sort((a,b)=>a.asOf.localeCompare(b.asOf));
 if(!rows.length)throw Error('No recent mortgage rate is available.');return rows.at(-1);
}
export async function downloadMortgageRate({fetcher=fetch,now=new Date()}={}){
 const start=new Date(+now-35*86400000).toISOString().slice(0,10),end=now.toISOString().slice(0,10);
 const response=await fetcher(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=MORTGAGE30US&cosd=${start}&coed=${end}`,{signal:AbortSignal.timeout(10000),headers:{'User-Agent':'Lemonomics educational playtest'}});
 if(!response.ok)throw Error('The mortgage rate feed is unavailable.');return parseMortgageRate(await response.text(),now);
}
export function mortgageRateMiddleware(){
 let data=null,retry=0,pending=null;
 return async(req,res,next)=>{
  if(req.url?.split('?')[0]!=='/api/mortgage-rate'){next();return}
  if(req.method!=='GET'){res.writeHead(405);res.end();return}
  if(Date.now()>retry){pending??=downloadMortgageRate().then(q=>{data=q}).catch(()=>{}).finally(()=>{retry=Date.now()+3600000;pending=null});await pending;}
  const valid=validMortgageRate(data);res.writeHead(valid?200:503,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({data:valid?data:null}));
 };
}
