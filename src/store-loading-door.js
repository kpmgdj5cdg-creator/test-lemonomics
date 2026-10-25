import * as THREE from 'three';
import {box,group,batch} from './models.js';
import {STORE_BACK_Z,STORE_DOCK_HEIGHT} from './department-store-layout.js';
// Slats follow an upright track, a curved elbow and an overhead return.
// Workday permission defaults closed until the future employment flow supplies both flags.
export function loadingDoorPath(distance){const straight=6.05,radius=.5,arc=radius*Math.PI/2;if(distance<=straight)return {y:.35+distance,z:STORE_BACK_Z+.04,angle:0};if(distance<straight+arc){const a=(distance-straight)/radius;return {y:6.4+radius*Math.sin(a),z:STORE_BACK_Z+.04+radius*(1-Math.cos(a)),angle:-a}}return {y:6.9,z:STORE_BACK_Z+.54+distance-straight-arc,angle:-Math.PI/2};}
export function buildStoreLoadingDoor(root){
 const frame=group(root),moving=group(root);frame.name='shopster-dock-tracks';moving.name='shopster-roll-up-door';const x=-14.56,height=STORE_DOCK_HEIGHT,count=13,slats=[];
 for(const side of [-1,1]){for(let d=0;d<9;d+=.2){const p=loadingDoorPath(d),rail=box(frame,x+side*2.7,p.y,p.z,.1,.23,.1,'#65787e');rail.rotation.x=p.angle}box(frame,x+side*2.75,1.7,STORE_BACK_Z,.18,3.2,.3,'#b4bdb7')}
 box(frame,x,3.35,STORE_BACK_Z,5.7,.18,.3,'#8c999b');box(frame,x+3.05,1.45,STORE_BACK_Z+.22,.22,.42,.12,'#c7b55e');
 for(let i=0;i<count;i++){const slat=group(moving);box(slat,0,0,0,5.2,height/count-.012,.13,i%2?'#98a7a7':'#8b999b');box(slat,0,height/count/2-.017,.08,5.15,.025,.02,'#bdc4bc');if(i===0)box(slat,0,-height/count/2+.015,.01,5.25,.055,.18,'#4f6067');batch(slat);slats.push(slat)}
 let amount=0;
 const door={frame,moving,slats,height,amount:0,authorized:false,update(dt,{employed=false,workdayStarting=false}={}){this.authorized=employed===true&&workdayStarting===true;const target=this.authorized?1:0;amount=THREE.MathUtils.damp(amount,target,3,Math.max(0,Math.min(dt,.1)));if(Math.abs(amount-target)<.0001)amount=target;this.amount=amount;slats.forEach((slat,i)=>{const p=loadingDoorPath((i+.5)*height/count+amount*6.05);slat.position.set(x,p.y,p.z);slat.rotation.x=p.angle})}};
 door.update(0);batch(frame);return door;
}
