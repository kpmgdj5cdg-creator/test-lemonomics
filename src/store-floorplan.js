import {DEPARTMENT_STORE as D,STORE_BACK_Z,STORE_EMPLOYEE_EXTENSION,employeeRoomZ,storePlanPosition,storePlanZ} from './department-store-layout.js';
import {blocked} from './player-movement.js';
export const STORE_ROOM_BOUNDS={minX:-19.25,maxX:19.25,minZ:STORE_BACK_Z+.4,maxZ:10.05};
export const STORE_CHECKOUTS=[-8.5,-5.1,-1.7,1.7,5.1,8.5].map((x,i)=>({x,z:3,number:i+1,staffed:i<2})).map(storePlanPosition);
function widenShelf(f){if(['sports','grocery','toys','household','homegoods','beauty'].includes(f.kind))return {...f,depth:f.depth*2};if(['seasonal','electronics','shoes'].includes(f.kind))return {...f,width:f.width*2};return f;}
export const STORE_FIXTURES=[
 ...[-11.65,11.65].flatMap(x=>[-1.5,-4.5,-7.5].map(z=>({x,z,width:4.5,depth:.65,kind:x<0?'sports':'grocery'}))),
 ...[-6.4,-4].flatMap(x=>[-3.5,-8].map(z=>({x,z,width:.7,depth:3.2,kind:'seasonal'}))),
 ...[-.7,1.5].flatMap(x=>[-3.5,-8].map(z=>({x,z,width:1.3,depth:2.4,kind:'general'}))),
 ...[5.3,7.5].flatMap(x=>[-3.5,-8].map(z=>({x,z,width:1.2,depth:2.8,kind:'decor'}))),
 ...[-10.8,10.8].map(x=>({x,z:9.55,width:4.2,depth:.8,kind:'carts'}))
].map(storePlanPosition).map(widenShelf);
STORE_FIXTURES.push(...STORE_CHECKOUTS.map(s=>({...s,width:1.25,depth:1.6,kind:'checkout'})));
export const STORE_REAR_FIXTURES=[
 ...[-12,-15,-18].flatMap(z=>[-11.65,11.65].map(x=>({x,z,width:4.5,depth:.65,kind:x<0?'toys':'household'}))),
 ...[-11.65,11.65].flatMap(x=>[-22,-25].map(z=>({x,z,width:4.5,depth:.65,kind:x<0?'homegoods':'beauty'}))),
 ...[-6.4,-4].flatMap(x=>[-15,-22].map(z=>({x,z,width:.7,depth:5.4,kind:'electronics'}))),
 ...[-.6,1.8].flatMap(x=>[-15,-22].map(z=>({x,z,width:.9,depth:4.5,kind:'clothing'}))),
 ...[5.3,7.5].flatMap(x=>[-15,-22].map(z=>({x,z,width:.7,depth:5.4,kind:'shoes'})))
].map(storePlanPosition).map(widenShelf);
// Each endcap has its own collision box; aisle planning includes its full projection.
export const STORE_ENDCAPS=[...STORE_FIXTURES,...STORE_REAR_FIXTURES].filter(f=>['sports','grocery','seasonal','toys','household','homegoods','beauty','electronics','shoes'].includes(f.kind)).flatMap(f=>[-1,1].map(side=>{const vertical=['seasonal','electronics','shoes'].includes(f.kind);return {kind:'endcap',x:f.x+(vertical?0:side*(f.width/2+.25)),z:f.z+(vertical?side*(f.depth/2+.25):0),width:vertical?f.width:.5,depth:vertical?.5:f.depth,vertical,side}}));
export const STORE_STAFF_ROOMS=[
 {id:'receiving',name:'RECEIVING',minX:-14.7,maxX:-8,doorX:-10.2},
 {id:'stockroom',name:'STOCK ROOM',minX:-8,maxX:6,doorX:-2},
 {id:'restrooms',name:'RESTROOMS',minX:6,maxX:9.6,doorX:7.8},
 {id:'breakroom',name:'BREAK ROOM',minX:9.6,maxX:14.7,doorX:11.9}
].map(r=>({...r,minX:r.minX*1.3,maxX:r.maxX*1.3,doorX:r.doorX*1.3}));
export const STORE_STAFF_DOORS=STORE_STAFF_ROOMS.map(r=>({id:r.id,x:r.doorX,z:storePlanZ(-28),width:1.8}));
export const STORE_ROOM_WALLS=[...STORE_STAFF_ROOMS.flatMap(r=>[{minX:r.minX,maxX:r.doorX-.9,minZ:storePlanZ(-28)-.1,maxZ:storePlanZ(-28)+.1},{minX:r.doorX+.9,maxX:r.maxX,minZ:storePlanZ(-28)-.1,maxZ:storePlanZ(-28)+.1}]),...[-8,6,9.6].map(x=>({minX:x*1.3-.1,maxX:x*1.3+.1,minZ:STORE_BACK_Z+.1,maxZ:storePlanZ(-28)}))];
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
].map(f=>{const z=f.z-21,backAnchored=z< -30.5;return {...f,z:backAnchored?z-STORE_EMPLOYEE_EXTENSION:employeeRoomZ(z),depth:f.kind==='receiving-rack'?f.depth*1.66:f.depth}});
// A third dining table uses the added break-room floor space.
STORE_BACKROOM_FIXTURES.push({x:11.9,z:-31.6,width:.85,depth:.7,kind:'break-table'},...[-.7,.7].map(dx=>({x:11.9+dx,z:-31.6,width:.42,depth:.5,kind:'chair'})));
for(const f of STORE_BACKROOM_FIXTURES)Object.assign(f,storePlanPosition(f));
export const STORE_COLUMNS=[-8.3,8.3].flatMap(x=>[9.8,.2,-9.8,-19.6].map(z=>storePlanPosition({x,z})));
export const STORE_ROOM_SOLIDS=[...STORE_COLUMNS.map(p=>({minX:p.x-.14,maxX:p.x+.14,minZ:p.z-.14,maxZ:p.z+.14})),...STORE_ROOM_WALLS,...[...STORE_FIXTURES,...STORE_REAR_FIXTURES,...STORE_ENDCAPS,...STORE_BACKROOM_FIXTURES].map(f=>({minX:f.x-f.width/2,maxX:f.x+f.width/2,minZ:f.z-f.depth/2,maxZ:f.z+f.depth/2}))];
export const storeWorld=(x,z)=>({x:D.x+x,z:D.z+z});
export const validStorePosition=(p,radius=.23)=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&!blocked(p.x,p.z,STORE_ROOM_SOLIDS,STORE_ROOM_BOUNDS,radius);
export function moveInStore(p,input,yaw,dt){const length=Math.hypot(input.x,input.z);if(!length)return {...p};const distance=3.3*Math.min(.05,dt)/length,result={...p};for(const [axis,delta]of [['x',(input.x*Math.cos(yaw)+input.z*Math.sin(yaw))*distance],['z',(-input.x*Math.sin(yaw)+input.z*Math.cos(yaw))*distance]]){const next={...result,[axis]:result[axis]+delta};if(validStorePosition(next))result[axis]=next[axis]}return result;}
// A shared aisle grid keeps shoppers and carts out of display/checkout fixtures.
const STEP=.35,MIN_X=-18.9,MIN_Z=STORE_BACK_Z+.7,COLS=109,ROWS=Math.ceil((10.05-MIN_Z)/STEP)+1;
const point=n=>({x:MIN_X+n%COLS*STEP,z:MIN_Z+Math.floor(n/COLS)*STEP});
const cell=p=>Math.max(0,Math.min(ROWS-1,Math.round((p.z-MIN_Z)/STEP)))*COLS+Math.max(0,Math.min(COLS-1,Math.round((p.x-MIN_X)/STEP)));
export function storeShopperPath(start,end,cart=false,staff=false){
 const radius=cart?.62:.27,clear=p=>validStorePosition(p,radius)&&(staff||p.z>=storePlanZ(-27.45));if(!clear(start)||!clear(end))return [];
 const anchor=p=>{const n=cell(p),cx=n%COLS,cz=Math.floor(n/COLS),options=[];for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){const x=cx+dx,z=cz+dz;if(x<0||x>=COLS||z<0||z>=ROWS)continue;const id=z*COLS+x,q=point(id),distance=Math.hypot(q.x-p.x,q.z-p.z);if(!clear(q))continue;let safe=true;for(let t=0;t<=1;t+=.1)if(!clear({x:p.x+(q.x-p.x)*t,z:p.z+(q.z-p.z)*t})){safe=false;break}if(safe)options.push({id,distance})}return options.sort((a,b)=>a.distance-b.distance)[0]?.id};
 const first=anchor(start),last=anchor(end);if(first===undefined||last===undefined)return [];const queue=[first],parents=new Map([[first,-1]]);
 for(let head=0;head<queue.length&&!parents.has(last);head++){const n=queue[head],x=n%COLS,z=Math.floor(n/COLS);for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=z+dz,next=b*COLS+a;if(a<0||a>=COLS||b<0||b>=ROWS||parents.has(next)||!clear(point(next)))continue;parents.set(next,n);queue.push(next)}}
 if(!parents.has(last))return [];const path=[];for(let n=last;n!==-1;n=parents.get(n))path.push(point(n));path.reverse();path.push({...end});return path;
}
export const STORE_BROWSE_STOPS=[];
for(const z of [6.4,.1,-10.5,-26.6])for(const x of [-13,-10.8,-8.4,-5.3,-2.2,.5,3.7,6.4,9,11.5,13.3])STORE_BROWSE_STOPS.push({id:STORE_BROWSE_STOPS.length,x,z,facing:z===6.4?0:Math.PI});
for(const z of [-4,-7.8,-15.5,-21.8])for(const x of [-8.25,-2.4,3.6,9])STORE_BROWSE_STOPS.push({id:STORE_BROWSE_STOPS.length,x,z,facing:Math.PI/2});
for(const stop of STORE_BROWSE_STOPS)Object.assign(stop,storePlanPosition(stop));
export const STORE_BACK_WORKERS=[{id:'warehouse',position:{x:3.7,z:-29.65},stops:[{x:3.7,z:-29.65},{x:-5.5,z:-29.65},{x:-2,z:-29.65}]},{id:'receiving',position:{x:-9.4,z:-29.7},stops:[{x:-9.4,z:-29.7},{x:-11.1,z:-29.9},{x:-10.2,z:-28.9}]}].map(w=>({...w,position:storePlanPosition({...w.position,z:employeeRoomZ(w.position.z)}),stops:w.stops.map(p=>storePlanPosition({...p,z:employeeRoomZ(p.z)}))}));
export function restoredStorePosition(view){let p=view?.position;if(p&&Number.isFinite(p.z)){p={...p};if(!view.layoutVersion&&p.z< -7)p.z-=21;if((view.layoutVersion||0)<3&&p.z< -28)p.z=employeeRoomZ(p.z);if((view.layoutVersion||0)<4)p=storePlanPosition(p);}return validStorePosition(p)?{...p}:{x:0,z:9.25};}
