import {isCrypto} from './funds.js';
import {tradeQuote} from './live-market-data.js';
import {quoteTrade,executeTrade,SHARE_SCALE} from './investments.js';
import {marketFresh,quotePrice} from './market-data.js';
import {round} from './business.js';

// Liquidation uses verified closes and the same trade/basis ledger as ordinary sales.
// The full-payoff path lets a borrower exit even when checking is empty.
export function settleCollateral(state,loan,market,now=new Date(),{full=false,collection=true}={}){
  if(!marketFresh(market,now))return null;
  const payment=full?loan.balance:Math.min(loan.balance,round(loan.total/5));
  const fee=collection?round(Math.max(1,payment*.01)):0,target=round(payment+fee);
  let raised=0,waitingForBitcoin=false;loan.settling=true;
  try{
    const legacy=state.bank.portfolio?.legacyCents||0;
    if(legacy){
      const amount=Math.min(legacy/100,target);
      state.bank.portfolio.legacyCents-=Math.round(amount*100);
      state.bank.checking=round(state.bank.checking+amount);raised=amount;
      state.ledger.push({day:state.day,desc:'Released legacy collateral for loan repayment',category:'investment transfer',cash:0,bankChange:amount,investmentChange:-amount});
    }
    for(const [symbol,position] of Object.entries(state.bank.portfolio?.positions||{})){
      if(raised>=target)break;
      let price=quotePrice(market,symbol);if(isCrypto(symbol)){try{price=tradeQuote(market?.liveQuotes,symbol,now).price}catch{waitingForBitcoin=true;continue}}
      const needed=Math.round((target-raised)*100);
      const net=units=>{const gross=Math.round(units/SHARE_SCALE*price*100);return gross-Math.max(1,Math.round(gross*.005))};
      // Find the smallest whole microshare count that covers the remaining payment,
      // including rounded fees. If collateral is insufficient, sell the full position.
      let low=1,high=position.units;
      if(net(high)>=needed){while(low<high){const mid=Math.floor((low+high)/2);if(net(mid)>=needed)high=mid;else low=mid+1}}
      const units=high;
      if(Math.round(units/SHARE_SCALE*price*100)<1)continue;
      const request={symbol,side:'sell',mode:'shares',amount:(units/SHARE_SCALE).toFixed(6),...(isCrypto(symbol)?{marketMode:'live'}:{})};
      const q=quoteTrade(state.bank,market,request,now);
      executeTrade(state,market,request,q.signature,now);
      raised=round(raised+q.totalCents/100);
    }
  }finally{loan.settling=false}
  loan.collateralDue=waitingForBitcoin;
  if(!raised)return waitingForBitcoin?'Refresh Investments for a fresh Bitcoin quote before selling pledged Bitcoin. Unpaid loan balance is still due.':'No marketable collateral remains. Unpaid loan balance is still due.';
  const charge=Math.min(raised,fee),paid=Math.min(payment,round(raised-charge));
  state.bank.checking=round(state.bank.checking-charge-paid);
  loan.balance=round(loan.balance-paid);
  if(charge)state.ledger.push({day:state.day,desc:'Collateral collection fee for loan #'+loan.id,category:'collateral fee',cash:0,bankChange:-charge,expense:charge});
  if(paid){
    state.ledger.push({day:state.day,desc:'Collateral repayment for loan #'+loan.id,category:'loan payment',cash:0,bankChange:-paid,loanChange:-paid});loan.paid++;
    if(!full)loan.nextDue+=5;
    if(full&&!collection&&loan.balance===0){state.bank.onTime++;state.bank.creditEstablished=true;state.bank.creditScore=Math.min(850,state.bank.creditScore+12)}
  }
  return (collection?'Overdue loan:':'Loan repayment:')+' investments sold to pay $'+paid.toFixed(2)+(charge?' plus $'+charge.toFixed(2)+' collection fee':'')+' and normal trading fees.';
}
