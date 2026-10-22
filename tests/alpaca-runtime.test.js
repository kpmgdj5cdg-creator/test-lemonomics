import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Miniflare} from 'miniflare';

test('Alpaca request options work in the actual Workers runtime and redirects never follow credentials',async()=>{
 const contents=`import {alpacaJSON} from './server/alpaca-provider.js';
 export default {async fetch(request){
  const scenario=new URL(request.url).pathname;let calls=0,mode;
  try{
   const result=await alpacaJSON({ALPACA_API_KEY_ID:'TEST_KEY',ALPACA_API_SECRET_KEY:'TEST_SECRET'},scenario==='/quotes'?'/v2/stocks/snapshots?symbols=SPY&feed=iex':scenario==='/bitcoin'?'/v1beta3/crypto/us/snapshots?symbols=BTC%2FUSD':'/v2/calendar?start=2026-10-22&end=2026-10-23',{fetcher:async(url,options)=>{
    calls++;const native=new Request(url,options);mode=native.redirect;
    if(native.headers.get('APCA-API-KEY-ID')!=='TEST_KEY'||native.method!=='GET')throw Error('Missing authentication or wrong method');
    return scenario==='/redirect'?new Response(null,{status:302,headers:{Location:'https://untrusted.example/'}}):Response.json({fixture:true});
   }});
   return Response.json({result,calls,mode});
  }catch(e){return Response.json({status:e.status||null,name:e.name,calls,mode});}
 }};`;
 const modules={'worker.js':{type:'esm',contents}};
 for(const path of ['server/alpaca-provider.js','src/funds.js','src/market-data.js','src/live-market-data.js'])modules[path]={type:'esm',contents:readFileSync(new URL('../'+path,import.meta.url),'utf8')};
 const mf=new Miniflare({workers:[{config:{name:'alpaca-runtime-test',compatibilityDate:'2026-10-01',manifest:{mainModule:'worker.js',modules}}}]});
 try{
  for(const path of ['/calendar','/quotes','/bitcoin']){const result=await(await mf.dispatchFetch('http://localhost'+path)).json();assert.deepEqual(result,{result:{fixture:true},calls:1,mode:'manual'});}
  const redirected=await(await mf.dispatchFetch('http://localhost/redirect')).json();assert.equal(redirected.status,302);assert.equal(redirected.calls,1);assert.equal(redirected.mode,'manual');
 }finally{await mf.dispose()}
});
