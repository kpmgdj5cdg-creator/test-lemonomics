import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {mortgageRateMiddleware} from './mortgage-rate.js';
import {createMarketService,marketMiddleware} from './market-service.js';
const root=resolve('dist'),market=marketMiddleware(createMarketService());
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const rate=mortgageRateMiddleware();
const server=createServer((req,res)=>{rate(req,res,()=>market(req,res,async()=>{
  try{
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return}
    const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname),file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(root+sep)||(await stat(file)).isDirectory()){res.writeHead(404);res.end('Not found');return}
    const body=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?'':body);
  }catch{res.writeHead(404);res.end('Not found')}
}).catch(()=>{if(!res.headersSent)res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({data:null,status:'unavailable'}))})).catch(()=>{if(!res.headersSent)res.writeHead(503);res.end()})});
server.listen(Number(process.env.PORT)||4173,'0.0.0.0',()=>console.log('Lemonade Lane server ready, with shared daily market pricing.'));
