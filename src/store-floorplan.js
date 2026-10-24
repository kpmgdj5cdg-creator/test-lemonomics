import {DEPARTMENT_STORE as D} from './department-store-layout.js';
import {blocked} from './player-movement.js';
export const STORE_ROOM_BOUNDS={minX:-14.6,maxX:14.6,minZ:-10.1,maxZ:10.05};
export const STORE_CHECKOUTS=[-9,-5.4,-1.8,1.8,5.4,9].map((x,i)=>({x,z:6,number:i+1,staffed:i<2}));
export const STORE_FIXTURES=[
 ...[-11.65,11.65].flatMap(x=>[1.2,3.15].map(z=>({x,z,width:4.5,depth:.65,kind:x<0?'sports':'grocery'}))),
 ...[-6.4,-4].map(x=>({x,z:1.8,width:.7,depth:2.7,kind:'seasonal'})),
 ...[-.7,1.5].map(x=>({x,z:1.8,width:1.3,depth:1.9,kind:'general'})),
 ...[5.3,7.5].map(x=>({x,z:1.8,width:1.2,depth:2.3,kind:'decor'})),
 ...STORE_CHECKOUTS.map(s=>({...s,width:1.25,depth:1.6,kind:'checkout'})),
 ...[-10.8,10.8].map(x=>({x,z:9.55,width:4.2,depth:.8,kind:'carts'}))
];
export const STORE_REAR_FIXTURES=[
 ...[-1.25,-3.05].flatMap(z=>[-11.65,11.65].map(x=>({x,z,width:4.5,depth:.65,kind:x<0?'toys':'household'}))),
 ...[-11.65,11.65].map(x=>({x,z:-5.15,width:4.5,depth:.65,kind:x<0?'homegoods':'beauty'})),
 ...[-6.4,-4].map(x=>({x,z:-3.55,width:.7,depth:3,kind:'electronics'})),
 ...[-.6,1.8].map(x=>({x,z:-3.55,width:.9,depth:2.5,kind:'clothing'})),
 ...[5.3,7.5].map(x=>({x,z:-3.55,width:.7,depth:3,kind:'shoes'}))
];
export const STORE_STAFF_ROOMS=[
 {id:'receiving',name:'RECEIVING',minX:-14.7,maxX:-8,doorX:-10.2},
 {id:'stockroom',name:'STOCK ROOM',minX:-8,maxX:6,doorX:-2},
 {id:'restrooms',name:'RESTROOMS',minX:6,maxX:9.6,doorX:7.8},
 {id:'breakroom',name:'BREAK ROOM',minX:9.6,maxX:14.7,doorX:11.9}
];
export const STORE_STAFF_DOORS=STORE_STAFF_ROOMS.map(r=>({id:r.id,x:r.doorX,z:-7,width:1.8}));
export const STORE_ROOM_WALLS=[...STORE_STAFF_ROOMS.flatMap(r=>[{minX:r.minX,maxX:r.doorX-.9,minZ:-7.1,maxZ:-6.9},{minX:r.doorX+.9,maxX:r.maxX,minZ:-7.1,maxZ:-6.9}]),...[-8,6,9.6].map(x=>({minX:x-.1,maxX:x+.1,minZ:-10.4,maxZ:-7}))];
export const STORE_BACKROOM_FIXTURES=[
 {x:-14.2,z:-8.8,width:.65,depth:2.2,kind:'receiving-rack'},
 {x:-13,z:-7.9,width:1.5,depth:1.15,kind:'pallet'},
 {x:-8.55,z:-9.15,width:.6,depth:1.1,kind:'pallet-jack'},
 {x:9.98,z:-7.45,width:.48,depth:.45,kind:'water-cooler'},
 {x:14.45,z:-9.25,width:.48,depth:.6,kind:'vending'},
 ...[-5,2].map(x=>({x,z:-9.85,width:5.6,depth:.65,kind:'stock-rack'})),
 ...[-5,2].map(x=>({x,z:-7.65,width:3.6,depth:.55,kind:'stock-rack'})),
 ...[6.85,8.75].map(x=>({x,z:-9.7,width:.7,depth:.85,kind:'toilet'})),
 {x:6.35,z:-8,width:.55,depth:1,kind:'sink'},
 {x:7.8,z:-9.55,width:.08,depth:1.45,kind:'stall-wall'},
 {x:10.45,z:-9.92,width:1.35,depth:.6,kind:'lockers'},
 {x:13,z:-9.92,width:2.9,depth:.65,kind:'break-counter'},
 ...[10.65,13.3].map(x=>({x,z:-8.25,width:.85,depth:.7,kind:'break-table'})),
 ...[10.65,13.3].flatMap(x=>[-.7,.7].map(dx=>({x:x+dx,z:-8.25,width:.42,depth:.5,kind:'chair'})))
];
export const STORE_COLUMNS=[-8.3,8.3].flatMap(x=>[.45,9.8].map(z=>({x,z})));
export const STORE_ROOM_SOLIDS=[...STORE_COLUMNS.map(p=>({minX:p.x-.14,maxX:p.x+.14,minZ:p.z-.14,maxZ:p.z+.14})),...STORE_ROOM_WALLS,...[...STORE_FIXTURES,...STORE_REAR_FIXTURES,...STORE_BACKROOM_FIXTURES].map(f=>({minX:f.x-f.width/2,maxX:f.x+f.width/2,minZ:f.z-f.depth/2,maxZ:f.z+f.depth/2}))];
export const storeWorld=(x,z)=>({x:D.x+x,z:D.z+z});
export const validStorePosition=(p,radius=.23)=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&!blocked(p.x,p.z,STORE_ROOM_SOLIDS,STORE_ROOM_BOUNDS,radius);
export function moveInStore(p,input,yaw,dt){const length=Math.hypot(input.x,input.z);if(!length)return {...p};const distance=3.3*Math.min(.05,dt)/length,result={...p};for(const [axis,delta]of [['x',(input.x*Math.cos(yaw)+input.z*Math.sin(yaw))*distance],['z',(-input.x*Math.sin(yaw)+input.z*Math.cos(yaw))*distance]]){const next={...result,[axis]:result[axis]+delta};if(validStorePosition(next))result[axis]=next[axis]}return result;}
// A shared aisle grid keeps shoppers and carts out of display/checkout fixtures.
const STEP=.35,MIN_X=-14,MIN_Z=-9.65,COLS=81,ROWS=56;
const point=n=>({x:MIN_X+n%COLS*STEP,z:MIN_Z+Math.floor(n/COLS)*STEP});
const cell=p=>Math.max(0,Math.min(ROWS-1,Math.round((p.z-MIN_Z)/STEP)))*COLS+Math.max(0,Math.min(COLS-1,Math.round((p.x-MIN_X)/STEP)));
export function storeShopperPath(start,end,cart=false,staff=false){
 const radius=cart?.62:.27,clear=p=>validStorePosition(p,radius)&&(staff||p.z>=-6.45);if(!clear(start)||!clear(end))return [];
 const anchor=p=>{const n=cell(p),cx=n%COLS,cz=Math.floor(n/COLS),options=[];for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){const x=cx+dx,z=cz+dz;if(x<0||x>=COLS||z<0||z>=ROWS)continue;const id=z*COLS+x,q=point(id),distance=Math.hypot(q.x-p.x,q.z-p.z);if(!clear(q))continue;let safe=true;for(let t=0;t<=1;t+=.1)if(!clear({x:p.x+(q.x-p.x)*t,z:p.z+(q.z-p.z)*t})){safe=false;break}if(safe)options.push({id,distance})}return options.sort((a,b)=>a.distance-b.distance)[0]?.id};
 const first=anchor(start),last=anchor(end);if(first===undefined||last===undefined)return [];const queue=[first],parents=new Map([[first,-1]]);
 for(let head=0;head<queue.length&&!parents.has(last);head++){const n=queue[head],x=n%COLS,z=Math.floor(n/COLS);for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=z+dz,next=b*COLS+a;if(a<0||a>=COLS||b<0||b>=ROWS||parents.has(next)||!clear(point(next)))continue;parents.set(next,n);queue.push(next)}}
 if(!parents.has(last))return [];const path=[];for(let n=last;n!==-1;n=parents.get(n))path.push(point(n));path.reverse();path.push({...end});return path;
}
export const STORE_BROWSE_STOPS=[...[-13,-11,-8.5,-6.4,-4,-1.8,0,2.2,4.6,6.8,9,11.5,13.3].map((x,i)=>({id:i,x,z:4.35,facing:Math.PI})),...[-13,-10.8,-7.2,-3.6,0,3.6,7.2,10.8,13].map((x,i)=>({id:13+i,x,z:8.15,facing:0})),...[-8.2,-2.4,3.6,9].map((x,i)=>({id:22+i,x,z:1.7,facing:i%2?Math.PI/2:-Math.PI/2}))];

// Stops stay on the public side of the employee rooms.
STORE_BROWSE_STOPS.push(...[-13,-10.8,-8.35,-5.3,-2.2,.5,3.7,6.4,8.8,11.5,13.3].map((x,i)=>({id:26+i,x,z:-.45,facing:Math.PI})),...[-8.3,-2.4,3.6,9].map((x,i)=>({id:37+i,x,z:-3.6,facing:i%2?Math.PI/2:-Math.PI/2})),...[-13,-10.7,-8.4,-5.5,-2.2,.5,3.7,6.4,9,11.5,13.3].map((x,i)=>({id:41+i,x,z:-6.15,facing:0})));
export const STORE_BACK_WORKERS=[{id:'warehouse',position:{x:3.7,z:-8.65},stops:[{x:3.7,z:-8.65},{x:-5.5,z:-8.65},{x:-2,z:-8.65}]},{id:'receiving',position:{x:-9.4,z:-8.7},stops:[{x:-9.4,z:-8.7},{x:-11.1,z:-8.9},{x:-10.2,z:-7.9}]}];
