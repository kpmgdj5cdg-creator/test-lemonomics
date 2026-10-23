import test from 'node:test';import assert from 'node:assert/strict';
import {spinSlots,spinRoulette,dealHoldem,resolveHoldem,bestHand,compareRanks,rankFive,SLOT_RTP,SLOT_WEIGHTS,SLOT_PAYS,shuffledDeck} from '../src/casino-rules.js';
import {DOWNTOWN_LOTS,lotBounds} from '../src/downtown-layout.js';
import {validCasinoPosition,moveInCasino} from '../src/casino-interior.js';
import {statements} from '../src/reports.js';
const initial=()=>({day:1,cash:100,inventory:{lemons:0,sugar:0,ice:0,cups:0},upgrades:[],ledger:[],bank:{checking:200,loans:[]}});
const drawSequence=a=>{let i=0;return ()=>a[i++%a.length]};
const card=(rank,suit=0)=>(rank-2)+suit*13;
test('slot paytable has exactly 94.475% theoretical return and credits winnings including stake',()=>{
 let total=0;for(let a=0;a<5;a++)for(let b=0;b<5;b++)for(let c=0;c<5;c++)if(a===b&&b===c)total+=SLOT_WEIGHTS[a]*SLOT_WEIGHTS[b]*SLOT_WEIGHTS[c]*SLOT_PAYS[a];assert.ok(Math.abs(total/8000-SLOT_RTP)<1e-12);assert.ok(Math.abs(SLOT_RTP-.94475)<1e-12);
 for(const amount of [.25,1,5]){const s=initial(),r=spinSlots(s,amount,()=>19);assert.equal(r.payout,amount*500);assert.equal(s.cash,100-amount+amount*500);assert.equal(s.bank.checking,200);assert.equal(s.ledger.length,1);}
});
test('invalid or unaffordable casino actions are atomic; losses never consume bank money',()=>{
 const s=initial();s.cash=.20;const before=JSON.stringify(s);for(const amount of [.25,-1,NaN,Infinity,0,2])assert.throws(()=>spinSlots(s,amount));assert.equal(JSON.stringify(s),before);
 s.cash=1;const r=spinSlots(s,.25,drawSequence([0,8,13]));assert.equal(r.net,-.25);assert.equal(s.cash,.75);assert.equal(s.bank.checking,200);
});
test('single-zero roulette has one winning straight-up pocket, and zero loses even-money bets',()=>{
 for(const kind of ['red','black','odd','even','low','high']){let net=0,wins=0;for(let n=0;n<=36;n++){const r=spinRoulette(initial(),1,kind,0,()=>n);net+=r.net;if(r.payout)wins++;if(n===0)assert.equal(r.payout,0)}assert.equal(wins,18);assert.equal(net,-1)}
 let net=0;for(let n=0;n<=36;n++)net+=spinRoulette(initial(),1,'number',7,()=>n).net;assert.equal(net,-1);
 const s=initial(),before=JSON.stringify(s);assert.throws(()=>spinRoulette(s,1,'number',37));assert.equal(JSON.stringify(s),before);
});
test('poker evaluator compares seven-card kickers, wheel straights, full houses and royal flushes',()=>{
 assert.deepEqual(rankFive([card(14),card(2,1),card(3,2),card(4),card(5,3)]),[4,5]);
 const royal=[10,11,12,13,14].map(r=>card(r,3));assert.deepEqual(bestHand([...royal,card(2),card(4)]),[8,14]);
 assert.equal(bestHand([card(9),card(9,1),card(9,2),card(4),card(4,1),card(4,2),card(2)])[0],6);
 assert.equal(compareRanks([1,14,13,10,8],[1,14,12,11,9]),1);assert.equal(new Set(shuffledDeck()).size,52);
});
test('Holdem ante/call/fold survives JSON saves and cannot settle twice',()=>{
 const s=initial(),h=dealHoldem(s,1);assert.equal(s.cash,99);assert.equal(new Set([...h.player,...h.dealer,...h.board]).size,9);assert.throws(()=>spinSlots(s,1));
 const restored=JSON.parse(JSON.stringify(s));resolveHoldem(restored,h.id,false);assert.equal(restored.cash,99);assert.equal(restored.casino.hand,null);const before=JSON.stringify(restored);assert.throws(()=>resolveHoldem(restored,h.id,true));assert.equal(JSON.stringify(restored),before);
});
test('Holdem qualifying wins, dealer nonqualification, pushes and losses settle exact cents',()=>{
 const cases=[
  {player:[card(14),card(14,1)],dealer:[card(13),card(12,1)],board:[card(2,2),card(5,1),card(8,3),card(9),card(11,2)],payout:4},
  {player:[card(14),card(14,1)],dealer:[card(13),card(13,1)],board:[card(2,2),card(5,1),card(8,3),card(9),card(11,2)],payout:6},
  {player:[card(3),card(4)],dealer:[card(6),card(7)],board:[10,11,12,13,14].map(r=>card(r,3)),payout:3},
  {player:[card(13),card(12,1)],dealer:[card(14),card(14,1)],board:[card(2,2),card(5,1),card(8,3),card(9),card(11,2)],payout:0},
 ];
 for(const c of cases){const s=initial();dealHoldem(s,1);Object.assign(s.casino.hand,c);const r=resolveHoldem(s,s.casino.hand.id,true);assert.equal(r.payout,c.payout);assert.equal(s.cash,97+c.payout);assert.equal(s.ledger.reduce((v,l)=>v+l.cash,0),s.cash-100)}
});
test('casino gains and losses reconcile the income statement and cash flow',()=>{
 const s=initial();spinSlots(s,.25,()=>0);spinRoulette(s,1,'red',0,()=>0);const report=statements(s),net=s.cash-100;assert.equal(report.profits[1].casino,net);assert.equal(report.income.at(-1).at(-1),net);assert.equal(report.flow.find(r=>r[0]==='Operating cash flow')[1],net);
});
test('downtown fronts face a nearest street, lots stay separate, and casino circulation is connected',()=>{
 assert.ok(DOWNTOWN_LOTS.length>=30);
 for(const [i,a] of DOWNTOWN_LOTS.entries()){const main=Math.abs(a.z-4),side=a.z<0?Math.abs(a.x-8):Infinity,angle=a.angle||0;assert.ok(main<=side+.01?Math.cos(angle)*(a.z<4?1:-1)>.9:Math.sin(angle)*(a.x<8?1:-1)>.9);
 const b=lotBounds(a);for(const other of DOWNTOWN_LOTS.slice(i+1)){const c=lotBounds(other);assert.ok(b.maxX<=c.minX||b.minX>=c.maxX||b.maxZ<=c.minZ||b.minZ>=c.maxZ,`${a.shop} overlaps ${other.shop}`)}}
 assert.ok(validCasinoPosition({x:0,z:4.2}));assert.ok(!validCasinoPosition({x:-2.4,z:0}));let p={x:0,z:4.2};for(let i=0;i<70;i++)p=moveInCasino(p,{x:0,z:-1},0,.05);assert.ok(p.z<-2.4);for(let i=0;i<50;i++)p=moveInCasino(p,{x:-1,z:0},0,.05);assert.ok(p.x<-3.4);assert.ok(validCasinoPosition(p));
});
