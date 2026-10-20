/** Recipes in the existing simulation are specified per ten cups. */
export function availableCups(inventory,recipe,freeIce=false){
  let capacity=Number(inventory.cups);
  if(!Number.isFinite(capacity)||capacity<=0)return 0;
  for(const key of ['lemons','sugar','ice']){
    if(key==='ice'&&freeIce)continue;
    const needed=Number(recipe[key])/10,stock=Number(inventory[key]);
    if(!Number.isFinite(needed)||needed<0)return 0;
    if(needed===0)continue;
    if(!Number.isFinite(stock)||stock<=0)return 0;
    capacity=Math.min(capacity,stock/needed);
  }
  return Math.max(0,Math.floor(capacity+1e-7));
}
