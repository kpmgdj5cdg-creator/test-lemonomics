import {SYMBOLS} from './funds.js';
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const marketDateFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'});
export function marketDay(now=new Date()){return marketDateFormatter.format(now)}
function iso(date){return date.toISOString().slice(0,10)}
function nth(year,month,weekday,n){const d=new Date(Date.UTC(year,month,1));d.setUTCDate(1+(weekday-d.getUTCDay()+7)%7+(n-1)*7);return iso(d)}
function observed(year,month,day,newYear=false){const d=new Date(Date.UTC(year,month,day));if(d.getUTCDay()===0)d.setUTCDate(day+1);if(d.getUTCDay()===6&&!newYear)d.setUTCDate(day-1);return iso(d)}
function goodFriday(year){
  const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),day=(h+l-7*m+114)%31+1;
  return iso(new Date(Date.UTC(year,month-1,day-2)));
}
export function holidays(year){
  const memorial=new Date(Date.UTC(year,5,0));while(memorial.getUTCDay()!==1)memorial.setUTCDate(memorial.getUTCDate()-1);
  return new Set([observed(year,0,1,true),nth(year,0,1,3),nth(year,1,1,3),goodFriday(year),iso(memorial),...(year>=2022?[observed(year,5,19)]:[]),observed(year,6,4),nth(year,8,1,1),nth(year,10,4,4),observed(year,11,25),'2025-01-09','2018-12-05']);
}
export function previousSession(now=new Date()){
  const d=new Date(marketDay(now)+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-1);
  while([0,6].includes(d.getUTCDay())||holidays(d.getUTCFullYear()).has(iso(d)))d.setUTCDate(d.getUTCDate()-1);
  return iso(d);
}
export function validateFund(fund,asOf,symbol,checked=new Map()){
  const isDate=s=>{if(!checked.has(s))checked.set(s,validDate(s));return checked.get(s)};
if(!fund||!Array.isArray(fund.history)||fund.history.length<1)throw new Error('Closing prices are missing for '+symbol+'.');
    const seen=new Set();const history=fund.history.map(p=>{
      if(!Array.isArray(p)||!isDate(p[0])||p[0]>asOf||seen.has(p[0])||!Number.isFinite(p[1])||p[1]<=0||!Number.isFinite(p[2]??p[1])||(p[2]??p[1])<=0)throw new Error('Invalid price history for '+symbol+'.');
      seen.add(p[0]);return [p[0],p[1],p[2]??p[1]];
    }).sort((a,b)=>a[0].localeCompare(b[0]));
    if(history.at(-1)[0]!==asOf)throw new Error('All funds must share the same closing-price date.');
    const events=(fund.events||[]).map(e=>{
      if(!['split','dividend'].includes(e.type)||!isDate(e.date)||e.date>asOf||!Number.isFinite(e.value)||e.value<=0)throw new Error('Invalid fund event.');
      return {type:e.type,date:e.date,value:e.value};
    }).sort((a,b)=>a.date.localeCompare(b.date)||(a.type==='split'?-1:1));
  return {history,events};
}
export function validateMarket(input,now=new Date()){
  if(!input||input.version!==1||!input.funds||!validDate(input.asOf)||input.asOf>=marketDay(now))throw new Error('Market data must contain a prior trading day’s closing prices.');
  const result={version:1,asOf:input.asOf,fetchedAt:input.fetchedAt||'',source:String(input.source||'Market data').slice(0,180),funds:{}},checked=new Map();
  for(const symbol of SYMBOLS)result.funds[symbol]=validateFund(input.funds[symbol],input.asOf,symbol,checked);
  return result;
}
export function quotePrice(market,symbol){return market?.funds?.[symbol]?.history.at(-1)?.[1]??null}
export function marketFresh(market,now=new Date()){return market?.asOf===previousSession(now)}
export function rangeStart(range,end){
  const d=new Date(end+'T12:00:00Z');
  if(range==='1W')d.setUTCDate(d.getUTCDate()-7);
  else if(range==='1M'||range==='3M'){const day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()-(range==='3M'?3:1));d.setUTCDate(Math.min(day,new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate()));}
  else if(range==='YTD')return end.slice(0,4)+'-01-01';
  else {const month=d.getUTCMonth();d.setUTCFullYear(d.getUTCFullYear()-(range==='5Y'?5:1));if(d.getUTCMonth()!==month)d.setUTCDate(0);}
  return iso(d);
}
export function fundSeries(market,symbol,range){
  const all=market?.funds?.[symbol]?.history||[];if(!all.length)return [];
  const start=rangeStart(range,market.asOf),prior=all.filter(p=>p[0]<=start).at(-1),points=all.filter(p=>p[0]>=start);
  if(prior&&points[0]?.[0]!==prior[0])points.unshift(prior);
  const base=points[0]?.[2];return points.map(p=>({date:p[0],value:(p[2]/base-1)*100,price:p[1]}));
}
