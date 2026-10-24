import {DEPARTMENT_STORE as D} from './department-store-layout.js';
import {blocked} from './player-movement.js';
export const STORE_ROOM_BOUNDS={minX:-14.6,maxX:14.6,minZ:.15,maxZ:10.05};
export const STORE_CHECKOUTS=[-9,-5.4,-1.8,1.8,5.4,9].map((x,i)=>({x,z:6,number:i+1,staffed:i<2}));
export const STORE_FIXTURES=[
 ...[-11.65,11.65].flatMap(x=>[1.2,3.15].map(z=>({x,z,width:4.5,depth:.65,kind:x<0?'sports':'grocery'}))),
 ...[-6.4,-4].map(x=>({x,z:1.8,width:.7,depth:2.7,kind:'seasonal'})),
 ...[-.7,1.5].map(x=>({x,z:1.8,width:1.3,depth:1.9,kind:'general'})),
 ...[5.3,7.5].map(x=>({x,z:1.8,width:1.2,depth:2.3,kind:'decor'})),
 ...STORE_CHECKOUTS.map(s=>({...s,width:1.25,depth:1.6,kind:'checkout'})),
 ...[-10.8,10.8].map(x=>({x,z:9.55,width:4.2,depth:.8,kind:'carts'}))
];
export const STORE_COLUMNS=[-8.3,8.3].flatMap(x=>[.45,9.8].map(z=>({x,z})));
export const STORE_ROOM_SOLIDS=[...STORE_COLUMNS.map(p=>({minX:p.x-.14,maxX:p.x+.14,minZ:p.z-.14,maxZ:p.z+.14})),...STORE_FIXTURES.map(f=>({minX:f.x-f.width/2,maxX:f.x+f.width/2,minZ:f.z-f.depth/2,maxZ:f.z+f.depth/2}))];
export const storeWorld=(x,z)=>({x:D.x+x,z:D.z+z});
export const validStorePosition=(p,radius=.23)=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&!blocked(p.x,p.z,STORE_ROOM_SOLIDS,STORE_ROOM_BOUNDS,radius);
export function moveInStore(p,input,yaw,dt){const length=Math.hypot(input.x,input.z);if(!length)return {...p};const distance=3.3*Math.min(.05,dt)/length,result={...p};for(const [axis,delta]of [['x',(input.x*Math.cos(yaw)+input.z*Math.sin(yaw))*distance],['z',(-input.x*Math.sin(yaw)+input.z*Math.cos(yaw))*distance]]){const next={...result,[axis]:result[axis]+delta};if(validStorePosition(next))result[axis]=next[axis]}return result;}
// A shared aisle grid keeps shoppers and carts out of display/checkout fixtures.
const STEP=.35,MIN_X=-14,MIN_Z=.85,COLS=81,ROWS=25;
const point=n=>({x:MIN_X+n%COLS*STEP,z:MIN_Z+Math.floor(n/COLS)*STEP});
const cell=p=>Math.max(0,Math.min(ROWS-1,Math.round((p.z-MIN_Z)/STEP)))*COLS+Math.max(0,Math.min(COLS-1,Math.round((p.x-MIN_X)/STEP)));
export function storeShopperPath(start,end,cart=false){
 const radius=cart?.62:.27,clear=p=>validStorePosition(p,radius);if(!clear(start)||!clear(end))return [];
 const first=cell(start),last=cell(end),queue=[first],parents=new Map([[first,-1]]);
 for(let head=0;head<queue.length&&!parents.has(last);head++){const n=queue[head],x=n%COLS,z=Math.floor(n/COLS);for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=z+dz,next=b*COLS+a;if(a<0||a>=COLS||b<0||b>=ROWS||parents.has(next)||!clear(point(next)))continue;parents.set(next,n);queue.push(next)}}
 if(!parents.has(last))return [];const path=[];for(let n=last;n!==-1;n=parents.get(n))path.push(point(n));path.reverse();path.push({...end});return path;
}
export const STORE_BROWSE_STOPS=[...[-13,-11,-8.5,-6.4,-4,-1.8,0,2.2,4.6,6.8,9,11.5,13.3].map((x,i)=>({id:i,x,z:4.35,facing:Math.PI})),...[-13,-10.8,-7.2,-3.6,0,3.6,7.2,10.8,13].map((x,i)=>({id:13+i,x,z:8.15,facing:0})),...[-8.2,-2.4,3.6,9].map((x,i)=>({id:22+i,x,z:1.7,facing:i%2?Math.PI/2:-Math.PI/2}))];
