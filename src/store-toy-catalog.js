// Numbering follows the supplied endcap view. Face a points toward electronics
// (+Z); face b points into the next aisle (-Z). Only 1a is merchandised.
export const TOY_AISLES=[-1.5*1.3,-4.5*1.3,-7.5*1.3,-12*1.3].map((z,i)=>({number:i+1,x:-11.65*1.3,z,width:4.5,depth:1.3,a:1,b:-1}));
export const TOY_SHELF_1=TOY_AISLES[0];
export const isToyGameShelf=f=>Math.abs(f.x-TOY_SHELF_1.x)<1e-8&&Math.abs(f.z-TOY_SHELF_1.z)<1e-8;
export const GAME_PLATFORMS=[{name:'PlayStation',color:'#3267b0'},{name:'Nintendo',color:'#ce3d48'},{name:'Xbox',color:'#4b9b60'}];
export const GAME_TITLES=['Star Quest','Turbo Kart','Block City','Pixel Pets','Moon Base','River Run','Robo Rally','Sky Farm','Space Ball','Dino Park','Hero Trail','Snow Racer'];
export const GAME_SHELF_LEVELS=[.4,.98,1.56,2.14,2.72,3.3];
export const GAME_SLOTS=GAME_PLATFORMS.flatMap((platform,bay)=>GAME_SHELF_LEVELS.flatMap((y,row)=>Array.from({length:5},(_,column)=>{
 const index=bay*30+row*5+column,game=(row*3+column+bay*4)%GAME_TITLES.length;
 return {id:'toy-1a-'+index,index,bay,row,column,game,title:GAME_TITLES[game],platform:platform.name,color:platform.color,initialStock:(index+row+bay)%11!==4&&index%17!==8,x:2.13-bay*1.42-.17-column*.27,y:y+.25,z:-.6};
})));
const slots=new Map(GAME_SLOTS.map(s=>[s.id,s]));
export const gameSlot=id=>slots.get(id);
export function normalizeToyCart(saved){return {version:1,items:[...new Set(Array.isArray(saved?.items)?saved.items:[])].filter(id=>slots.get(id)?.initialStock)}}
export function addToyGame(saved,id){const cart=normalizeToyCart(saved),slot=slots.get(id);if(!slot?.initialStock||cart.items.includes(id))return {cart,added:false};return {cart:{version:1,items:[...cart.items,id]},added:true}}
export function returnToyGame(saved,id){const cart=normalizeToyCart(saved);return {version:1,items:cart.items.filter(item=>item!==id)}}
export const toySlotAvailable=(saved,id)=>!!slots.get(id)?.initialStock&&!normalizeToyCart(saved).items.includes(id);
