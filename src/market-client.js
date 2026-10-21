import snapshot from './data/market-snapshot.json';
import {validateMarket} from './market-data.js';
export class MarketClient{
  constructor(){
    this.data=null;this.loading=false;this.error='';this.attempted=false;this.nextRefresh=0;
    for(const candidate of [snapshot,this.readCache()])try{const data=validateMarket(candidate);if(!this.data||data.asOf>this.data.asOf||(data.asOf===this.data.asOf&&data.fetchedAt>this.data.fetchedAt))this.data=data}catch{}
  }
  readCache(){try{return JSON.parse(localStorage.getItem('lemonadeLane_market_v1'))}catch{return null}}
  async refresh(onChange=()=>{},force=false){
    if(this.pending){await this.pending;onChange();return;}
    if(!force&&Date.now()<this.nextRefresh){onChange();return;}
    this.attempted=true;
    if(!['http:','https:'].includes(location.protocol)){
      this.error=this.data?'Offline: showing the saved closing prices.':'No closing prices are bundled yet. Open the hosted game to load prices.';onChange();return;
    }
    this.loading=true;this.error='';onChange();
    this.pending=(async()=>{try{
      const response=await fetch('/api/market',{signal:AbortSignal.timeout(20000),cache:'no-store'});
      if(!response.ok)throw new Error('The price service is unavailable.');
      const result=await response.json(),data=validateMarket(result.data);
      if(this.data&&data.asOf<this.data.asOf)throw new Error('The price service returned an older snapshot.');
      if(!this.data||data.asOf>this.data.asOf||data.fetchedAt>=this.data.fetchedAt)this.data=data;
      try{localStorage.setItem('lemonadeLane_market_v1',JSON.stringify(this.data))}catch{}
      if(result.status==='stale')this.error='The feed has not supplied the latest close yet.';
    }catch(error){this.error=this.data?'Could not refresh. Showing saved prices.':'Closing prices are unavailable. Please try again later.';}
    finally{this.loading=false;this.nextRefresh=Date.now()+2*60*1000;}})();
    try{await this.pending}finally{this.pending=null;onChange()}
  }
}
