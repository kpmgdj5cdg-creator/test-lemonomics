import {CASINO_BOUNDS,CASINO_SOLIDS} from './casino-model.js';
import {blocked} from './player-movement.js';
import {character,group,batch} from './models.js';

// Two permanent dealers + four visitors = six NPCs total. All money and
// simulation randomness are independent of this cosmetic population.
export const MAX_CASINO_PATRONS=4;
export const patronDwell=random=>8+random()*8;
const clear=p=>!blocked(p.x,p.z,CASINO_SOLIDS,CASINO_BOUNDS,.14);
const STEP=.2,MIN_X=-3.8,MIN_Z=-3.2,COLS=39,ROWS=40;
const point=n=>({x:MIN_X+(n%COLS)*STEP,z:MIN_Z+Math.floor(n/COLS)*STEP});
const cell=p=>Math.max(0,Math.min(ROWS-1,Math.round((p.z-MIN_Z)/STEP)))*COLS+Math.max(0,Math.min(COLS-1,Math.round((p.x-MIN_X)/STEP)));
export function casinoPatronPath(start,end){
 if(!clear(start)||!clear(end))return [];
 const first=cell(start),last=cell(end),queue=[first],parents=new Map([[first,-1]]);
 for(let head=0;head<queue.length&&!parents.has(last);head++){
  const n=queue[head],x=n%COLS,z=Math.floor(n/COLS);
  for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=z+dz,next=b*COLS+a;if(a<0||a>=COLS||b<0||b>=ROWS||parents.has(next)||!clear(point(next)))continue;parents.set(next,n);queue.push(next)}
 }
 if(!parents.has(last))return [];
 const path=[];for(let n=last;n!==-1;n=parents.get(n))path.push(point(n));path.reverse();path.push({...end});return path;
}
export function casinoMachineStops(slots){return slots.map(m=>({id:m.index,x:m.group.position.x+Math.sin(m.group.rotation.y)*1.45,z:m.group.position.z+Math.cos(m.group.rotation.y)*1.45,facing:m.group.rotation.y+Math.PI}))}
export class CasinoPatronSchedule{
 constructor(stops,{random,seed=0x6c656d6f}={}){
  this.seed=seed;this.random=random||(()=>{let x=this.seed;x^=x<<13;x^=x>>>17;x^=x<<5;this.seed=x;return (x>>>0)/4294967296});this.stops=stops;this.time=0;this.serial=0;this.actors=[];this.arrivals=[];this.departures=0;
  for(const id of [0,5,9,3]){const stop=stops.find(s=>s.id===id);if(!stop)continue;const a=this.spawn(stop,true);const count=this.actors.length;a.departNext=count===4;a.until=3+(count-1)*2+this.random()*2;a.visits=Array.from({length:count},(_,i)=>(id-count+1+i+stops.length)%stops.length)}
 }
 available(actor){return this.stops.filter(s=>!this.actors.some(a=>a!==actor&&a.machine===s.id)&&!actor?.visits.includes(s.id))}
 spawn(stop,initial=false){const position=initial?{x:stop.x,z:stop.z}:{x:.6,z:6.2},a={id:++this.serial,position,machine:stop.id,visits:initial?[stop.id]:[],mode:initial?'playing':'walking',facing:stop.facing,path:initial?[]:[{x:.6,z:4.35},...casinoPatronPath({x:.6,z:4.35},stop)],until:this.time+patronDwell(this.random),nextSpin:this.time+2+this.random()*7};this.actors.push(a);return a}
 step(dt,travelDt=dt){
  this.time+=dt;
  for(const a of [...this.actors]){
   if(a.mode==='playing'&&this.time>=a.until){
    if(a.visits.length>=4&&(a.departNext||this.random()<.8)){a.mode='leaving';a.machine=null;a.path=[...casinoPatronPath(a.position,{x:.6,z:4.35}),{x:.6,z:6.2}]}
    else{if(a.visits.length>=4)a.visits=[a.machine];const options=this.available(a),next=options[Math.floor(this.random()*options.length)];if(next){a.machine=next.id;a.path=casinoPatronPath(a.position,next);a.mode='walking'}}
   }
   if(a.mode==='playing')continue;
   let distance=travelDt*1.8;
   while(a.path.length&&distance>0){const p=a.path[0],dx=p.x-a.position.x,dz=p.z-a.position.z,d=Math.hypot(dx,dz);if(d>.001)a.facing=Math.atan2(dx,dz);if(d<=distance){a.position={x:p.x,z:p.z};a.path.shift();distance-=d}else{a.position.x+=dx/d*distance;a.position.z+=dz/d*distance;distance=0}}
   if(!a.path.length){if(a.mode==='leaving'){this.actors.splice(this.actors.indexOf(a),1);this.departures++;this.arrivals.push(this.time+2+this.random()*3)}else{a.mode='playing';a.visits.push(a.machine);a.facing=this.stops.find(s=>s.id===a.machine).facing;a.until=this.time+patronDwell(this.random)}}
  }
  this.arrivals.sort((a,b)=>a-b);
  while(this.arrivals[0]<=this.time&&this.actors.length<MAX_CASINO_PATRONS){const free=this.available();if(!free.length)break;this.arrivals.shift();this.spawn(free[Math.floor(this.random()*free.length)])}
 }
}
export class CasinoCrowd{
 constructor(casino){this.casino=casino;this.root=group(casino.root);this.root.name='casino-patrons';this.schedule=new CasinoPatronSchedule(casinoMachineStops(casino.slots),{seed:(Date.now()>>>0)||1});this.rigs=new Map();this.update(0,0);this.pause()}
 update(dt,time,viewer=null){
  const elapsed=this.lastTime===undefined?dt:Math.max(0,Math.min(2,time-this.lastTime));this.lastTime=time;this.schedule.step(elapsed,Math.min(.25,dt));
  const ids=new Set(this.schedule.actors.map(a=>a.id));for(const [id,rig]of this.rigs)if(!ids.has(id)){rig.group.removeFromParent();rig.group.traverse(o=>{if(o.isMesh&&o.geometry.userData.patronBatch)o.geometry.dispose()});this.rigs.delete(id)}
  for(const a of this.schedule.actors){let rig=this.rigs.get(a.id);if(!rig){rig=character(this.root,a.id,{type:a.id%2?'female':'male',pants:['#334158','#5a453d','#3e4c44'][a.id%3]});rig.group.name='casino-patron-'+a.id;rig.group.scale.setScalar(1.22);
    // Batch each articulated part separately; preserve arms and legs for motion.
    for(const part of Object.values(rig.slots).flat())if(part?.isObject3D){batch(part);part.traverse(o=>{if(o.isMesh)o.geometry.userData.patronBatch=true})}
    this.rigs.set(a.id,rig)}
   rig.group.visible=!viewer||Math.hypot(a.position.x-viewer.x,a.position.z-viewer.z)>.65;const walking=a.mode!=='playing';rig.group.position.set(a.position.x,.23,a.position.z);rig.group.rotation.y=a.facing;rig.legs.forEach((l,i)=>l.rotation.x=walking?Math.sin(time*8+i*Math.PI)*.42:0);rig.arms.forEach((arm,i)=>arm.rotation.x=walking?Math.sin(time*8+i*Math.PI)*-.3:i===1?-.55+Math.sin(time*2+a.id)*.10:0);
   if(!walking&&this.schedule.time>=a.nextSpin){const machine=this.casino.slots.find(m=>m.index===a.machine);if(machine&&!machine.spin)machine.spin={time,reels:[a.id%5,(a.id+2)%5,(a.id+3)%5]};a.nextSpin=this.schedule.time+5+this.schedule.random()*9}
  }
 }
 pause(){this.lastTime=undefined}
 get doorActive(){return this.schedule.actors.some(a=>a.mode==='leaving'||a.mode==='walking'&&a.visits.length===0)}
 summary(){return this.schedule.actors.map(a=>({id:a.id,machine:a.machine,mode:a.mode,position:a.position,visits:a.visits.length}))}
}
