import {DEMAND_CONFIG} from './demand-config.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function weatherCategory(weather,config=DEMAND_CONFIG){
 const snowy=/snow/i.test(weather?.name||'')||/snow/i.test(weather?.condition||'');
 return snowy||weather?.temp<=config.weather.coldMax?'cold':weather?.temp>=config.weather.hotMin?'hot':'average';
}
export function recipeCategory(quality,config=DEMAND_CONFIG){return quality>=config.quality.best?'best':quality>=config.quality.better?'better':'good'}
export function curveFactor(price,category='average',config=DEMAND_CONFIG){
 if(!Number.isFinite(price)||price<0)throw Error('Price must be a non-negative number.');
 const points=config.curves[category];if(!points)throw Error('Unknown weather demand category.');
 if(price>=points.at(-1)[0])return 0;
 if(price<=points[0][0])return points[0][1];
 const i=points.findIndex(([p])=>p>=price),[a,x]=points[i-1],[b,y]=points[i];return x+(y-x)*(price-a)/(b-a);
}
export function demandFor({price,weather,location='neighborhood',quality=1,upgrades=[]},config=DEMAND_CONFIG){
 const category=weatherCategory(weather,config),tier=recipeCategory(quality,config),baseFactor=curveFactor(price,category,config);
 const place=config.locations[config.aliases[location]||location]??config.locations.neighborhood;
 const locationSensitivity=typeof place==='number'?place:place[tier];
 // Recognition comes from purchases, including former stand styles. It never
 // creates free equipment, inventory, traffic or a second additive price bonus.
 const brandReduction=Math.min(config.brand.cap,[...new Set(upgrades)].reduce((sum,id)=>sum+(config.brand.reductions[id]||0),0));
 const sensitivity=locationSensitivity*(1-brandReduction),cutoff=config.curves[category].at(-1)[0];
 const factor=baseFactor===0?0:Math.max(0,1+(baseFactor-1)*sensitivity);
 const qualityModifier=config.quality.intercept+config.quality.slope*clamp(quality,0,1);
 return {version:config.version,price,expectedPrice:config.expectedPrice,category,tier,quality,qualityModifier,baseFactor,factor,locationSensitivity,brandReduction,sensitivity,cutoff,probability:clamp(config.baselineConversion*factor*qualityModifier,0,1)};
}
// Called once per real visitor; queueing and service remain the game's authority.
export function customerDecision(probability,rivalChance,random=Math.random,competitionFirst=true){
 if(competitionFirst){if(random()<rivalChance)return 'rival';return random()<probability?'interested':'pass'}
 // Old saved sales days keep their frozen probability and original draw order.
 if(random()>=probability)return 'pass';return random()<rivalChance?'rival':'interested';
}
export function pricingFeedback(demand){
 if(!demand||demand.version!==1)return '';
 const {price,expectedPrice,category,brandReduction,factor,baseFactor,probability,locationSensitivity}=demand;
 const priceText='$'+price.toFixed(2),expected='$'+expectedPrice.toFixed(2);
 if(baseFactor===0)return `Your price was ${priceText}. It was too high for customers in this weather, so nobody wanted to buy. Try a lower price next time.`;
 let text=price>expectedPrice?`Your price was ${priceText}, above the usual ${expected}. Fewer visitors wanted to buy, but each sale earned more money.`:price<expectedPrice?`Your price was ${priceText}, below the usual ${expected}. More visitors wanted to buy, but each cup earned less money. A discount does not always mean more profit.`:`Your price matched the usual ${expected}. Taste, waiting time and available lemonade still affected sales.`;
 if(price>expectedPrice&&category==='hot')text+=' The heat made customers more willing to pay extra.';
 if(price>expectedPrice&&category==='cold')text+=' Cold weather made customers more careful about higher prices.';
 if(price>expectedPrice&&brandReduction>0&&factor>Math.max(0,1+(baseFactor-1)*locationSensitivity)&&probability>0)text+=' Your familiar upgrades helped customers feel more comfortable paying extra.';
 return text;
}
