import {isCrypto} from './funds.js';
import {round} from './business.js';
import {portfolioTotals,ensurePortfolio,holdingPrice,quoteTrade,executeTrade,SHARE_SCALE} from './investments.js';
export const HOUSE_PRICE=400000,DOWN_PAYMENT=8000,MORTGAGE_PERIOD=10,MORTGAGE_MONTHS=360;
export function validMortgageRate(q,now=new Date()){
 if(!q||!Number.isFinite(q.rate)||q.rate<=0||q.rate>25||!/^\d{4}-\d{2}-\d{2}$/.test(q.asOf))return false;
 const date=new Date(q.asOf+'T12:00:00Z'),age=now-date;
 return Number.isFinite(+date)&&date.toISOString().slice(0,10)===q.asOf&&q.asOf<=now.toISOString().slice(0,10)&&age<=35*86400000;
}
export function monthlyPayment(principal,annualRate,months=MORTGAGE_MONTHS){const r=annualRate/1200;return round(r?principal*r/(1-Math.pow(1+r,-months)):principal/months)}
export function downPaymentAssets(state,market){
 let amount=round(state.cash+state.bank.checking);
 if(state.bank.loans.some(l=>l.secured&&l.balance>0))return amount;
 const p=ensurePortfolio(state.bank);amount+=(p.legacyCents||0)/100;
 for(const [symbol,pos]of Object.entries(p.positions)){const gross=Math.round(pos.units/SHARE_SCALE*(holdingPrice(p,market,symbol)||0)*100);amount+=Math.max(0,gross-Math.max(1,Math.round(gross*.005)))/100}
 return round(amount);
}
function liquidFunds(state,amount,desc,category){
 if(round(state.cash+state.bank.checking)<amount)throw Error('Not enough cash and checking available.');
 const bankPart=Math.min(state.bank.checking,amount),cashPart=round(amount-bankPart);
 state.bank.checking=round(state.bank.checking-bankPart);state.cash=round(state.cash-cashPart);
 state.ledger.push({day:state.day,desc,category,cash:-cashPart,bankChange:-bankPart});return state.ledger.at(-1);
}
function raiseDownPayment(s,market,now){
 let missing=round(DOWN_PAYMENT-s.cash-s.bank.checking);if(missing<=0)return;
 if(s.bank.loans.some(l=>l.secured&&l.balance>0))throw Error('Pledged investments cannot fund a down payment. Repay the secured loan first.');
 const p=ensurePortfolio(s.bank),legacy=Math.min(p.legacyCents||0,Math.round(missing*100));
 if(legacy){p.legacyCents-=legacy;s.bank.checking=round(s.bank.checking+legacy/100);s.ledger.push({day:s.day,desc:'Investment balance released for house down payment',category:'investment transfer',cash:0,bankChange:legacy/100,investmentChange:-legacy/100});missing=round(missing-legacy/100)}
 for(const [symbol,pos]of Object.entries(p.positions)){
  if(missing<=0)break;
  const price=holdingPrice(p,market,symbol),net=u=>{const g=Math.round(u/SHARE_SCALE*price*100);return g-Math.max(1,Math.round(g*.005))};
  let lo=1,hi=pos.units;if(net(hi)<=0)continue;
  if(net(hi)>=Math.round(missing*100)){while(lo<hi){const mid=Math.floor((lo+hi)/2);if(net(mid)>=Math.round(missing*100))hi=mid;else lo=mid+1}}
  const request={symbol,side:'sell',mode:'shares',amount:(hi/SHARE_SCALE).toFixed(6),...(isCrypto(symbol)?{marketMode:'live'}:{})},q=quoteTrade(s.bank,market,request,now);
  executeTrade(s,market,request,q.signature,now);missing=round(DOWN_PAYMENT-s.cash-s.bank.checking);
 }
 if(missing>0)throw Error('Your available investments do not cover the down payment and trading fees.');
}
export function purchaseHouse(state,{mortgage=false,quote=null,market=null,now=new Date()}={}){
 if(state.upgrades.includes('house'))throw Error('You already own this house.');
 const s=structuredClone(state);
 if(mortgage){
  if(s.bank.creditScore<=660)throw Error('A credit score above 660 is required.');
  if(!validMortgageRate(quote,now))throw Error('Refresh the mortgage rate before applying.');
  if(downPaymentAssets(s,market)<DOWN_PAYMENT)throw Error('You need $8,000 available for the down payment, including any investment sale fees.');
  raiseDownPayment(s,market,now);
  const row=liquidFunds(s,DOWN_PAYMENT,'House down payment (2%)','house purchase');
  const principal=HOUSE_PRICE-DOWN_PAYMENT;row.loanChange=principal;
  s.bank.mortgage={principal,balance:principal,accruedInterest:0,rate:quote.rate,rateDate:quote.asOf,rateSource:quote.source||'Freddie Mac PMMS via FRED',payment:monthlyPayment(principal,quote.rate),months:360,paid:0,nextDue:s.day+MORTGAGE_PERIOD,originDay:s.day,accruedThrough:s.day,missedDue:[]};
 }else liquidFunds(s,HOUSE_PRICE,'Purchased house outright','house purchase');
 s.upgrades.push('house');s.equipmentCosts??={};s.equipmentCosts.house=HOUSE_PRICE;
 s.bank.investments=portfolioTotals(s.bank,market).valueCents/100;
 Object.assign(state,s);return state.bank.mortgage;
}
export function accrueMortgage(state){
 const m=state.bank.mortgage;if(!m||m.balance<=0)return;
 for(let due=m.accruedThrough+MORTGAGE_PERIOD;due<=state.day;due+=MORTGAGE_PERIOD){
  const interest=round(m.principal*m.rate/1200);m.accruedInterest=round(m.accruedInterest+interest);m.balance=round(m.principal+m.accruedInterest);m.accruedThrough=due;
  state.ledger.push({day:due,desc:'Mortgage monthly interest',category:'mortgage interest',cash:0,expense:interest,loanChange:interest});
 }
 for(let due=m.nextDue;due<state.day;due+=MORTGAGE_PERIOD){if(m.missedDue.includes(due))continue;m.missedDue.push(due);state.bank.missed++;state.bank.creditEstablished=true;state.bank.creditScore=Math.max(300,state.bank.creditScore-35);state.ledger.push({day:state.day,desc:'Missed mortgage payment due Day '+due,category:'credit',cash:0})}
}
export function mortgagePayoff(state){const m=state.bank.mortgage;if(!m?.balance)return 0;return round(m.balance+round(m.principal*m.rate/1200*Math.max(0,state.day-m.accruedThrough)/MORTGAGE_PERIOD))}
export function payMortgage(state,full=false){
 const s=structuredClone(state);accrueMortgage(s);const m=s.bank.mortgage;if(!m||m.balance<=0)throw Error('No mortgage payment is outstanding.');
 if(!full&&s.day<m.nextDue)throw Error('Your next mortgage payment is due Day '+m.nextDue+'.');
 const amount=full?mortgagePayoff(s):Math.min(m.balance,m.paid>=359?m.balance:m.payment);
 const row=liquidFunds(s,amount,full?'Mortgage paid in full':'Mortgage installment','mortgage payment');row.loanChange=-amount;
 if(full){const extra=round(amount-m.balance);if(extra)s.ledger.push({day:s.day,desc:'Mortgage interest through payoff day',category:'mortgage interest',expense:extra,cash:0,loanChange:extra});m.principal=0;m.accruedInterest=0;m.balance=0;}
 else{const interest=Math.min(amount,m.accruedInterest);m.accruedInterest=round(m.accruedInterest-interest);m.principal=round(m.principal-(amount-interest));m.balance=round(m.principal+m.accruedInterest);m.paid++;}
 if(s.day<=m.nextDue){s.bank.onTime++;s.bank.creditEstablished=true;s.bank.creditScore=Math.min(850,s.bank.creditScore+12)}
 m.nextDue+=MORTGAGE_PERIOD;Object.assign(state,s);return amount;
}
