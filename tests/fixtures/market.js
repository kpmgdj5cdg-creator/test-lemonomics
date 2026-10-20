import {SYMBOLS} from '../../src/funds.js';
import {previousSession} from '../../src/market-data.js';
// Deliberately synthetic data for tests/screenshots; never bundled into the game.
export function marketFixture(now=new Date()){
  const asOf=previousSession(now),funds={},end=new Date(asOf+'T12:00:00Z'),start=new Date(end);start.setUTCFullYear(start.getUTCFullYear()-5);start.setUTCDate(start.getUTCDate()-10);
  SYMBOLS.forEach((symbol,i)=>{const history=[];let index=0;
    for(const d=new Date(start);d<=end;d.setUTCDate(d.getUTCDate()+1))if(![0,6].includes(d.getUTCDay())){const price=+[400,500,50,100,200,25][i]+index*(i===3?.00002:.012)+(i===3?0:Math.sin(index/24)*[10,12,5,0,6,2][i]);history.push([d.toISOString().slice(0,10),+price.toFixed(4),+price.toFixed(4)]);index++;}
    funds[symbol]={history,events:[]};
  });return {version:1,asOf,fetchedAt:now.toISOString(),source:'TEST FIXTURE · simulated prices, not real market quotes',funds};
}
export function gameWithChecking(amount=1000){return {version:5,upgrades:[],lemonLots:[],daySpoilage:{day:0,lemons:0,cost:0},day:1,cash:40,inventory:{lemons:0,sugar:0,ice:0,cups:0},recipe:{lemons:4,sugar:3,ice:5},price:2.25,pitchers:2,location:'neighborhood',history:[],ledger:[],bank:{checking:amount,investments:0,loans:[],creditScore:650,creditEstablished:false,onTime:0,missed:0,loanSequence:1}}}
