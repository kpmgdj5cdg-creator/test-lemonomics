export const STAND_STYLES=['classic','lemonstand','castle'];
export function equippedStand(state){
 const selected=state.equippedStand;
 if(selected==='starter')return selected;
 if(STAND_STYLES.includes(selected)&&state.upgrades?.includes(selected))return selected;
 return [...STAND_STYLES].reverse().find(id=>state.upgrades?.includes(id))||'starter';
}
export function activeUpgrades(state){return (state.upgrades||[]).filter(id=>id!=='house'&&(STAND_STYLES.includes(id)?id===equippedStand(state):!state.unequippedUpgrades?.includes(id)))}
export function equipUpgrade(state,id,equipped){
 if(id!=='starter'&&!state.upgrades?.includes(id))throw Error('Purchase this upgrade first.');
 if(id==='house')return;
 if(id==='starter'||STAND_STYLES.includes(id))state.equippedStand=equipped?id:'starter';
 else{state.unequippedUpgrades=(state.unequippedUpgrades||[]).filter(x=>x!==id);if(!equipped)state.unequippedUpgrades.push(id)}
}
