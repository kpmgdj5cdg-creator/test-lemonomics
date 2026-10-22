import {decorateQuotes} from '../src/live-market-data.js';
// Vite/static previews deliberately cannot expose provider secrets or turn on
// upstream data calls. Use authenticated Wrangler + the existing D1 binding.
export function livePreviewMiddleware(req,res,next){
 const url=new URL(req.url,'http://localhost');if(!['/api/market/quotes','/api/market/history'].includes(url.pathname)){next();return}
 if(req.method!=='GET'){res.writeHead(405);res.end();return}
 const data=url.pathname.endsWith('/quotes')?decorateQuotes(null,null,'disabled',new Date(),300000):{status:'disabled',symbol:url.searchParams.get('symbol'),range:url.searchParams.get('range'),points:[]};
 res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({...data,message:'Live Alpaca data requires the authenticated Cloudflare Worker setup. Preview uses no live credentials.'}));
}
