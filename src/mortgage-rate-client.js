import {validMortgageRate} from './mortgage.js';
export class MortgageRateClient{
 constructor(){this.data=null;try{const q=JSON.parse(localStorage.getItem('lemonomics_mortgage_rate_v1'));if(validMortgageRate(q))this.data=q}catch{}this.loading=false;this.attempted=false;this.nextRefresh=0;}
 async refresh(onChange=()=>{},force=false){
  if(this.pending)return this.pending;
  if(!force&&Date.now()<this.nextRefresh)return;
  this.attempted=true;this.loading=true;onChange();
  this.pending=(async()=>{try{if(!['http:','https:'].includes(location.protocol))return;const r=await fetch('/api/mortgage-rate',{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error();const {data}=await r.json();if(validMortgageRate(data)&&(!this.data||data.asOf>=this.data.asOf)){this.data=data;try{localStorage.setItem('lemonomics_mortgage_rate_v1',JSON.stringify(data))}catch{}}}catch{}finally{if(!validMortgageRate(this.data))this.data=null;this.loading=false;this.nextRefresh=Date.now()+3600000;this.pending=null;onChange();}})();return this.pending;
 }
}
