import test from 'node:test';
import assert from 'node:assert/strict';
import {LiveMarketClient} from '../src/live-market-client.js';
import {alpacaFixture,ALPACA_TEST_TIME} from './fixtures/alpaca.js';
test('live client shares pending refreshes, throttles buttons and retains original timestamps through network failures',async()=>{
 const oldLocation=globalThis.location;globalThis.location={protocol:'https:'};let time=ALPACA_TEST_TIME,calls=0,fail=false;
 const client=new LiveMarketClient({clock:()=>new Date(time),fetcher:async()=>{calls++;if(fail)throw Error('offline');return Response.json(alpacaFixture(new Date(time)))}});
 try{await Promise.all([client.refresh(),client.refresh(),client.refresh()]);assert.equal(calls,1);const stamp=client.data.quotes.SPY.timestamp;for(let i=0;i<10;i++)await client.refresh();assert.equal(calls,1);time+=5000;fail=true;await client.refresh();assert.equal(client.data.quotes.SPY.timestamp,stamp);assert.equal(client.data.status,'unavailable');await client.refresh();assert.equal(calls,2);assert.ok(client.nextRefresh>=time+60000)}finally{globalThis.location=oldLocation}
});
test('client wakes at the regular-session opening instead of waiting the full closed-market cache interval',async()=>{
 const oldLocation=globalThis.location;globalThis.location={protocol:'https:'};let time=Date.parse('2026-10-22T13:29:55Z'),calls=0;
 const client=new LiveMarketClient({clock:()=>new Date(time),fetcher:async()=>{calls++;const data=alpacaFixture(new Date(time));data.retryAfterMs=data.session.open?5000:300000;return Response.json(data)}});
 try{await client.refresh();assert.equal(client.data.session.open,false);assert.equal(client.delay(),5000);time+=5000;await client.refresh();assert.equal(calls,2);assert.equal(client.data.session.open,true)}finally{globalThis.location=oldLocation}
});

test('Bitcoin polls every twenty seconds while the last executed trade stays ten minutes old',async()=>{
 const oldLocation=globalThis.location;globalThis.location={protocol:'https:'};let time=Date.parse('2026-10-24T02:00:00Z'),calls=0;const original=time,tradeStamp=new Date(time-600000).toISOString();
 const {normalizeBitcoin}=await import('../server/alpaca-provider.js'),{decorateBitcoin}=await import('../src/live-market-data.js');
 const client=new LiveMarketClient({clock:()=>new Date(time),fetcher:async()=>{calls++;const now=new Date(time),data=alpacaFixture(now),base=60000+(time-original)/1000,btc=decorateBitcoin(normalizeBitcoin({snapshots:{'BTC/USD':{latestTrade:{p:59000,t:tradeStamp},latestQuote:{bp:base-10,ap:base+10,t:now.toISOString()}}}},null,now),'ok',now);data.quotes['BTC/USD']=btc.quote;data.crypto=btc.market;data.retryAfterMs=20000;return Response.json(data)}});
 try{for(let i=0;i<4;i++){await client.refresh();assert.equal(calls,i+1);assert.equal(client.data.quotes['BTC/USD'].price,60000+i*20);assert.equal(client.data.quotes['BTC/USD'].lastTradeTimestamp,tradeStamp);assert.equal(client.delay(),20000);time+=20000}}finally{globalThis.location=oldLocation}
});
