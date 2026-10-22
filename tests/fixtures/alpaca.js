// Deliberately synthetic Alpaca-shaped responses. Never bundled into the game.
import {SYMBOLS} from '../../src/funds.js';
import {marketDay} from '../../src/market-data.js';
import {decorateQuotes,decorateBitcoin} from '../../src/live-market-data.js';
import {normalizeSnapshots,normalizeBitcoin} from '../../server/alpaca-provider.js';
export const ALPACA_TEST_TIME=Date.parse('2026-10-22T15:00:00Z');
export function alpacaFixture(now=new Date(ALPACA_TEST_TIME),price=200){
 const day=marketDay(now),days=[0,6].includes(new Date(day+'T12:00:00Z').getUTCDay())?[]:[{date:day,open:'09:30',close:'16:00'}],calendar={start:day,end:day,days};
 const snapshots=Object.fromEntries(SYMBOLS.map(s=>[s,{latestTrade:{p:price,t:now.toISOString()},prevDailyBar:{c:190,t:'2026-10-21T04:00:00Z'}}]));
 const btc=decorateBitcoin(normalizeBitcoin({snapshots:{'BTC/USD':{latestTrade:{p:60000,t:now.toISOString()},prevDailyBar:{c:59000,t:new Date(Date.parse(now.toISOString().slice(0,10)+'T00:00Z')-86400000).toISOString()}}}},null,now),'ok',now);
 return {...decorateQuotes(normalizeSnapshots(snapshots,null,now),calendar,'ok',now),crypto:btc.market,quotes:{...decorateQuotes(normalizeSnapshots(snapshots,null,now),calendar,'ok',now).quotes,'BTC/USD':btc.quote},mock:true};
}
export function alpacaHistory(symbol,range,now=new Date(ALPACA_TEST_TIME)){
 return {symbol,range,status:'ok',provider:'Alpaca',feed:symbol==='BTC/USD'?'crypto-us':'iex',adjustment:symbol==='BTC/USD'?'none':'split',mock:true,points:Array.from({length:30},(_,i)=>({timestamp:new Date(+now-(46-i)*60000).toISOString(),price:180+i/2}))};
}
