import {SYMBOLS} from '../src/funds.js';
import {marketDay,validateMarket,validateFund} from '../src/market-data.js';

export function parseYahoo(symbol,payload,today){
  const r=payload.chart?.result?.[0];if(!r||r.meta?.currency!=='USD')throw new Error(symbol+': provider returned no USD data.');
  const dates=r.timestamp||[],closes=r.indicators?.quote?.[0]?.close||[],adjusted=r.indicators?.adjclose?.[0]?.adjclose||closes;
  const history=dates.flatMap((timestamp,i)=>{const date=marketDay(new Date(timestamp*1000));return date<today&&Number.isFinite(closes[i])&&closes[i]>0&&Number.isFinite(adjusted[i])&&adjusted[i]>0?[[date,+closes[i].toFixed(6),+adjusted[i].toFixed(6)]]:[]});
  const events=[];
  for(const e of Object.values(r.events?.splits||{})){const date=marketDay(new Date(e.date*1000));if(date<today)events.push({date,type:'split',value:e.numerator/e.denominator});}
  for(const e of Object.values(r.events?.dividends||{})){const date=marketDay(new Date(e.date*1000));if(date<today)events.push({date,type:'dividend',value:e.amount});}
  if(history.length<2)throw new Error(symbol+': provider returned insufficient history.');return {history,events};
}
export async function downloadFund(symbol,{fetcher=fetch,now=new Date()}={}){
  if(!SYMBOLS.includes(symbol))throw new Error('Unknown fund.');
  const today=marketDay(now),start=new Date(today+'T00:00:00Z');start.setUTCFullYear(start.getUTCFullYear()-5);start.setUTCDate(start.getUTCDate()-12);
  const params=new URLSearchParams({period1:String(Math.floor(start.getTime()/1000)),period2:String(Math.floor(now.getTime()/1000)),interval:'1d',events:'div,splits'});
  const response=await fetcher('https://query1.finance.yahoo.com/v8/finance/chart/'+symbol+'?'+params,{headers:{'User-Agent':'LemonadeLane/1.0 personal educational game'},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error('Market provider returned HTTP '+response.status+' for '+symbol+'.');
  const parsed=parseYahoo(symbol,await response.json(),today);
  return validateFund(parsed,parsed.history.at(-1)[0],symbol);
}
export async function downloadMarket({fetcher=fetch,now=new Date()}={}){
  const funds=Object.fromEntries(await Promise.all(SYMBOLS.map(async symbol=>[symbol,await downloadFund(symbol,{fetcher,now})])));
  // Holidays or a lagging individual fund must never mix execution dates.
  const dates=Object.fromEntries(SYMBOLS.map(s=>[s,new Set(funds[s].history.map(p=>p[0]))]));
  const common=funds[SYMBOLS[0]].history.map(p=>p[0]).filter(date=>SYMBOLS.every(s=>dates[s].has(date)));
  const asOf=common.at(-1);if(!asOf)throw new Error('No common completed trading session was returned.');
  for(const s of SYMBOLS){funds[s].history=funds[s].history.filter(p=>p[0]<=asOf);funds[s].events=funds[s].events.filter(e=>e.date<=asOf);}
  return validateMarket({version:1,asOf,fetchedAt:now.toISOString(),source:'Yahoo Finance · daily closes and adjusted fund history',funds},now);
}
