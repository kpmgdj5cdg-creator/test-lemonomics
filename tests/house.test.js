import test from 'node:test';
import assert from 'node:assert/strict';
import {gameWithChecking,marketFixture} from './fixtures/market.js';
import {monthlyPayment,purchaseHouse,downPaymentAssets,accrueMortgage,payMortgage,mortgagePayoff,validMortgageRate} from '../src/mortgage.js';
import {equipUpgrade,equippedStand,activeUpgrades} from '../src/equipment.js';
import {newPortfolio,SHARE_SCALE,quoteTrade,executeTrade} from '../src/investments.js';
import {parseMortgageRate} from '../server/mortgage-rate.js';
import {statements} from '../src/reports.js';
import {moveInHome,validHomePosition} from '../src/home-movement.js';
const now=new Date('2026-10-22T18:00:00Z'),quote={rate:6.5,asOf:'2026-10-22',source:'TEST FIXTURE'};
function eligible(amount=8000){const s=gameWithChecking(amount);s.cash=0;s.bank.creditScore=661;return s}
test('stand equipment preserves legacy appearance and ownership while switching benefits and individual machines',()=>{
 const s={upgrades:['classic','castle','register','fridge']};assert.equal(equippedStand(s),'castle');equipUpgrade(s,'classic',true);assert.deepEqual(activeUpgrades(s),['classic','register','fridge']);equipUpgrade(s,'starter',true);assert.deepEqual(activeUpgrades(s),['register','fridge']);equipUpgrade(s,'fridge',false);assert.deepEqual(activeUpgrades(s),['register']);assert.ok(s.upgrades.includes('fridge'));assert.throws(()=>equipUpgrade(s,'music',true));
});
test('mortgage requires strictly above 660, $8000 including fees, a recent real quote, and cannot buy twice',()=>{
 const s=eligible();s.bank.creditScore=660;assert.throws(()=>purchaseHouse(s,{mortgage:true,quote,now}),/above 660/);s.bank.creditScore=661;s.bank.checking=7999.99;assert.throws(()=>purchaseHouse(s,{mortgage:true,quote,now}),/8,000/);s.bank.checking=8000;assert.throws(()=>purchaseHouse(s,{mortgage:true,quote:{...quote,asOf:'2025-01-01'},now}),/rate/);
 purchaseHouse(s,{mortgage:true,quote,now});assert.equal(s.bank.checking,0);assert.equal(s.bank.mortgage.principal,392000);assert.equal(s.bank.mortgage.nextDue,11);assert.ok(s.upgrades.includes('house'));assert.throws(()=>purchaseHouse(s,{mortgage:true,quote,now}),/already/);assert.equal(monthlyPayment(100000,6),599.55);
});
test('mortgage fully amortizes in 360 ten-day installments without duplicate interest, and stays separate from business loans',()=>{
 const s=eligible(2e6);s.bank.loans=[{balance:55}];purchaseHouse(s,{mortgage:true,quote,now});const m=s.bank.mortgage;
 for(let n=1;n<=360;n++){s.day=1+n*10;accrueMortgage(s);const balance=m.balance;accrueMortgage(s);assert.equal(m.balance,balance);payMortgage(s);Object.assign(m,s.bank.mortgage)}
 assert.equal(s.bank.mortgage.balance,0);assert.equal(s.bank.mortgage.principal,0);assert.equal(s.bank.loans[0].balance,55);assert.equal(s.bank.mortgage.paid,360);
});
test('due payments and payoff combine checking and cash; failure is atomic; missed dates reduce credit only once',()=>{
 const s=eligible();purchaseHouse(s,{mortgage:true,quote,now});s.day=10;s.bank.checking=5000;assert.throws(()=>payMortgage(s),/Day 11/);s.day=12;accrueMortgage(s);const credit=s.bank.creditScore;accrueMortgage(s);assert.equal(s.bank.creditScore,credit);assert.equal(s.bank.missed,1);
 s.bank.checking=1;const before=JSON.stringify(s);assert.throws(()=>payMortgage(s),/Not enough/);assert.equal(JSON.stringify(s),before);s.cash=5000;payMortgage(s);assert.ok(s.cash<5000);s.day=16;s.cash=400000;s.bank.checking=100;const payoff=mortgagePayoff(s);assert.ok(payoff>s.bank.mortgage.balance);assert.equal(payMortgage(s,true),payoff);assert.equal(s.bank.mortgage.balance,0);
});
test('down payment can consume only needed investment proceeds, retains shares, rejects stale sales and pledged collateral atomically',()=>{
 const market=marketFixture(now),s=eligible(30000);s.bank.portfolio=newPortfolio();const req={symbol:'SPY',side:'buy',mode:'dollars',amount:20000};const q=quoteTrade(s.bank,market,req,now);executeTrade(s,market,req,q.signature,now);s.bank.checking=1000;s.cash=2000;
 const units=s.bank.portfolio.positions.SPY.units;assert.ok(downPaymentAssets(s,market)>8000);purchaseHouse(s,{mortgage:true,quote,market,now});assert.ok(s.bank.portfolio.positions.SPY.units>0&&s.bank.portfolio.positions.SPY.units<units);assert.ok(s.bank.checking>=0&&s.bank.checking<.02);
 const stale=eligible(0);stale.bank.portfolio=newPortfolio();stale.bank.portfolio.positions.SPY={units:100*SHARE_SCALE,costCents:100,lastPrice:500};const before=JSON.stringify(stale);assert.throws(()=>purchaseHouse(stale,{mortgage:true,quote,market:marketFixture(new Date('2026-10-01')),now}),/Refresh prices/);assert.equal(JSON.stringify(stale),before);stale.bank.loans=[{secured:true,balance:10}];assert.equal(downPaymentAssets(stale,market),0);
});
test('outright ownership and mortgage accounting record property once, interest as expense and principal as financing',()=>{
 const s=eligible(500000);purchaseHouse(s,{market:marketFixture(now)});assert.equal(s.bank.checking,100000);assert.equal(s.bank.mortgage,undefined);const report=statements(s);assert.equal(report.balance.find(r=>r[0]==='House at cost')[1],400000);assert.equal(report.income.at(-1).at(-1),0);assert.equal(report.flow.find(r=>r[0]==='Investing cash flow').at(-1),-400000);
 const m=eligible();purchaseHouse(m,{mortgage:true,quote,now});m.day=11;accrueMortgage(m);assert.equal(statements(m).profits[11].interest,2123.33);
});
test('official rate parser retains last valid observation and rejects missing, future, or stale data',()=>{
 const q=parseMortgageRate('DATE,MORTGAGE30US\n2026-10-15,6.3\n2026-10-22,6.5\n2026-10-23,7\n',now);assert.equal(q.rate,6.5);assert.equal(validMortgageRate(q,now),true);assert.throws(()=>parseMortgageRate('DATE,MORTGAGE30US\n2025-01-01,6\n2026-10-22,.',now));
});
test('house movement clears the central corridor and bedroom doorway while walls and furniture remain solid',()=>{
 let p={x:0,z:2.35};for(let i=0;i<40;i++)p=moveInHome(p,{x:0,z:-1},0,.05);assert.ok(p.z<-1);assert.equal(validHomePosition({x:1.9,z:1}),false);assert.equal(validHomePosition({x:1,z:-.25}),true);assert.equal(validHomePosition({x:4,z:0}),false);p={x:1,z:-.25};for(let i=0;i<30;i++)p=moveInHome(p,{x:0,z:1},0,.05);assert.ok(p.z<.1);
});
