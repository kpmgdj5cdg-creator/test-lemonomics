// Deliberately synthetic Alpaca-shaped responses. Never bundled into the game.
import {SYMBOLS} from '../../src/funds.js';
import {decorateQuotes} from '../../src/live-market-data.js';
import {normalizeSnapshots} from '../../server/alpaca-provider.js';
export const ALPACA_TEST_TIME=Date.parse('2026-10-22T15:00:00Z');
export function alpacaFixture(now=new Date(ALPACA_TEST_TIME),price=200){
 const day=now.toISOString().slice(0,10),days=[{date:day,open:'09:30',close:'16:00'}],calendar={start:day,end:day,days};
 const snapshots=Object.fromEntries(SYMBOLS.map(s=>[s,{latestTrade:{p:price,t:now.toISOString()},prevDailyBar:{c:190,t:'2026-10-21T04:00:00Z'}}]));
 return {...decorateQuotes(normalizeSnapshots(snapshots,null,now),calendar,'ok',now),mock:true};
}
export function alpacaHistory(symbol,range,now=new Date(ALPACA_TEST_TIME)){
 return {symbol,range,status:'ok',provider:'Alpaca',feed:'iex',adjustment:'split',mock:true,points:Array.from({length:30},(_,i)=>({timestamp:new Date(+now-(46-i)*60000).toISOString(),price:180+i/2}))};
}
