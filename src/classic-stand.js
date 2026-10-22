import * as THREE from 'three';
import {box,group,batch,label} from './models.js';
import {createSpeaker} from './speaker.js';
import {voxelText} from './voxel-text.js';

export const CLASSIC_ROOF_COLORS=['#f5ca35','#fff0c5'];
const cream='#f5e6c9',yellow='#f5ca35',trim='#fff0d9';
// Fits the existing stand plot and front approach in all four environments.
// Upper walls, doors and sign belong to the removable cutaway shell.
export function buildClassicStand(g,roof,w,d,{shade=false,register=false}={}){
  const body=group(g);body.name='classic-kiosk-base';
  box(body,0,.12,0,w+.35,.24,d+.35,'#b2aca0');
  box(body,0,.29,0,w+.12,.1,d+.08,'#dfd3b9');
  for(const x of [-w/2+.08,w/2-.08]){
    box(body,x,.8,0,.16,.95,d,cream);
    box(body,x,.54,0,.18,.43,d,yellow);
    box(roof,x,2.1,0,.16,1.65,d,cream);
  }
  box(body,0,.8,-d/2+.06,w,.95,.15,cream);
  box(body,0,.54,-d/2+.045,w,.43,.18,yellow);
  box(roof,0,2.1,-d/2+.06,w,1.65,.15,cream);
  // Yellow service wall to the right of the glazed entrance.
  box(body,.95,.86,1.28,2.02,1.08,.16,yellow);
  box(body,.95,1.47,1.3,2.22,.14,.42,'#d8d0b9');
  box(body,.95,1.56,1.3,2.26,.045,.45,'#fff2d7');
  box(body,.95,.86,1.186,2.02,1.08,.02,'#f4e5b2');box(body,.95,1.595,1.12,2.1,.025,.17,'#8e6038');
  const facade=group(roof);facade.name='classic-glazed-entrance';
  for(const x of [-1.91,-.19])box(facade,x,1.57,1.31,.11,2.48,.16,trim);
  for(const y of [.38,2.78])box(facade,-1.05,y,1.31,1.83,.12,.16,trim);
  const doors=group(roof);doors.name='classic-double-doors';
  const leaves=[];
  for(const [hinge,direction] of [[-1.855,1],[-.245,-1]]){
    const leaf=group(doors,hinge,0,1.32);leaf.name=direction===1?'left-door':'right-door';
    const cx=direction*.4025;
    for(const x of [direction*.04,direction*.765])box(leaf,x,1.58,0,.08,2.28,.12,'#c6c6b8');
    for(const y of [.48,1.1,2.68])box(leaf,cx,y,0,.805,.10,.12,'#c6c6b8');
    const pane=box(leaf,cx,1.58,0,.69,2.1,.035,'#829eae');
    pane.material=new THREE.MeshStandardMaterial({color:'#a5d4df',transparent:true,opacity:.19,roughness:.1,metalness:.05,depthWrite:false});pane.material.userData.owned=true;pane.castShadow=false;pane.userData.glass=true;
    box(leaf,direction*.665,1.35,.09,.13,.2,.11,'#efd773');box(leaf,direction*.665,1.35,-.09,.13,.2,.11,'#efd773');
    leaves.push(leaf);
  }
  // The window is an actual opening, with a clear sightline to the operator.
  box(roof,-.09,2.12,1.28,.13,1.09,.18,trim);
  box(roof,1.98,2.12,1.28,.13,1.09,.18,trim);
  box(roof,.95,2.78,1.28,2.2,.21,.18,cream);
  const awning=group(roof);awning.name='classic-striped-window-awning';
  for(let i=0;i<8;i++){
    const x=-.15+(i+.5)*2.22/8,color=i%2?trim:yellow;
    const panel=box(awning,x,2.81,shade?1.93:1.68,2.22/8+.004,.12,shade?1.32:.82,color);panel.rotation.x=.13;
    box(awning,x,2.67,shade?2.56:2.06,2.22/8,.18,.08,color);
  }
  box(roof,0,3.01,0,w+.34,.22,d+.28,cream);
  box(roof,0,3.18,-.07,w+.43,.19,d+.37,yellow);
  for(const x of [-w/2-.14,w/2+.14])box(roof,x,3.32,-.07,.13,.24,d+.37,yellow);
  box(roof,0,3.32,-d/2-.18,w+.43,.24,.13,yellow);
  const sign=group(roof);sign.name='classic-cooler-cup-sign';
  box(sign,0,3.51,1.43,w+.5,.87,.25,yellow);
  box(sign,0,3.51,1.568,w+.21,.64,.035,'#fff1c9');
  voxelText(sign,'COOLER CUP',-.35,3.51,1.625,.36,'#bd8e23');
  const lemon=group(sign,1.75,3.51,1.68);lemon.name='classic-voxel-lemon';
  box(lemon,0,0,0,.4,.52,.14,'#ffda37');box(lemon,0,.29,0,.23,.13,.13,'#ffda37');box(lemon,0,-.29,0,.23,.13,.13,'#ffda37');
  for(const x of [-.23,.23])box(lemon,x,0,0,.1,.32,.12,'#ffda37');
  box(lemon,.02,.41,-.025,.09,.16,.09,'#6e8133');box(lemon,.15,.44,-.025,.22,.14,.1,'#367c39');
  box(lemon,-.06,.11,.08,.06,.23,.012,'#ffe872');
  const hit=new THREE.Mesh(new THREE.BoxGeometry(1.7,2.4,.15),new THREE.MeshBasicMaterial({visible:false}));hit.material.userData.owned=true;hit.position.set(-1.05,1.58,1.32);doors.add(hit);
  return {group:doors,left:leaves[0],right:leaves[1],amount:0,target:0};
}


export function classicStand(parent,state){
 const upgrades=state.upgrades||[],owns=id=>upgrades.includes(id),g=group(parent),roof=group(g),w=4.1,d=2.7;
 g.name='classic-stand';g.userData.style='classic';
 const doors=buildClassicStand(g,roof,w,d,{shade:owns('shade'),register:owns('register')});
 // Inner finishes are physical surfaces on the existing exterior building.
 for(let col=0;col<8;col++)for(let row=0;row<6;row++)box(g,-1.74+col*.497,.35,-1.12+row*.43,.49,.025,.422,(col+row)%3?'#c3c2bd':'#b8b9b7');
 for(const side of [-1,1])for(let z=0;z<7;z++)for(let y=0;y<7;y++)box(roof,side*1.875,.52+y*.345,-1.12+z*.36,.028,.34,.354,(z+y)%3?'#bfdc56':'#b3d04a');
 box(roof,0,2.86,0,3.92,.035,2.6,'#f3e9d7');box(roof,0,2.79,-.1,.54,.06,.28,'#fff8d9');
 const light=new THREE.PointLight('#fff1cc',3,6,2);light.position.set(0,2.55,0);roof.add(light);
 const cabinetWidth=owns('fridge')?3.05:3.85,cabinetX=owns('fridge')?-.4:0;
 box(g,cabinetX,.79,-1.05,cabinetWidth,.86,.5,'#805633');box(g,cabinetX,1.23,-1.04,cabinetWidth+.04,.12,.58,'#8f633c');
 for(let i=0;i<5;i++){const x=cabinetX-cabinetWidth/2+(i+.5)*cabinetWidth/5;box(g,x,.79,-.788,cabinetWidth/5-.04,.76,.035,i%2?'#956b44':'#a0754a');box(g,x,1.04,-.756,.11,.025,.035,'#c2a278')}
 // Cream back wall and a voxel notice board matching the reference room.
 box(roof,0,2.1,-1.202,3.87,1.62,.025,'#f4e5b2');
 box(roof,.52,2.23,-1.17,1.35,.75,.045,'#76502e');box(roof,.52,2.23,-1.139,1.24,.64,.025,'#ad7d42');
 for(const [x,y,color,width,height] of [[.08,2.37,'#f6d347',.22,.25],[.43,2.37,'#9c79b4',.24,.25],[.81,2.37,'#f4ead2',.28,.25],[.13,2.03,'#f5d342',.23,.27],[.48,2.03,'#eee9da',.16,.3],[.82,1.98,'#f8de36',.12,.12]]){box(roof,x,y,-1.112,width,height,.025,color);box(roof,x,y+height/2,-1.09,.045,.06,.015,'#c5bba2')}
 const equipment=group(g);equipment.userData.ids=[];equipment.userData.placements={};equipment.userData.bounds={};
 const install=(id,x,y,z,build)=>{if(!owns(id))return;const e=group(equipment,x,y,z);e.name=id;equipment.userData.ids.push(id);equipment.userData.placements[id]={x,y,z};build(e);const bounds=new THREE.Box3().setFromObject(e);equipment.userData.bounds[id]={min:bounds.min.toArray(),max:bounds.max.toArray()}};
 const silver='#c9d8cf',dark='#426665',yellow='#e9c64d';
 install('juicer',-1.65,1.3,-1.02,e=>{box(e,0,.05,0,.44,.09,.37,yellow);box(e,0,.16,0,.33,.18,.29,'#e8ba38');box(e,0,.3,0,.21,.1,.21,'#fff0c7');box(e,0,.39,0,.11,.09,.11,yellow)});
 install('powerjuicer',-1.07,1.3,-1.02,e=>{box(e,0,.19,0,.43,.38,.36,silver);box(e,0,.48,0,.3,.25,.29,yellow);box(e,0,.64,0,.37,.07,.34,dark);box(e,0,.25,.192,.17,.09,.025,'#638977')});
 install('icedispenser',-.49,1.3,-1.02,e=>{box(e,0,.25,0,.48,.5,.38,silver);box(e,0,.34,.202,.34,.16,.027,'#5b8d9b');box(e,0,.16,.203,.24,.13,.025,'#395d65');box(e,0,.53,0,.5,.06,.39,'#e4e6d5')});
 install('dispenser',.09,1.3,-1.02,e=>{box(e,0,.06,0,.46,.12,.39,dark);for(const x of [-.115,.115]){box(e,x,.32,0,.2,.39,.29,'#e6cc68');box(e,x,.54,0,.22,.06,.32,dark);box(e,x,.14,.2,.05,.08,.11,'#667f77')}});
 install('icemaker',.67,1.3,-1.02,e=>{box(e,0,.29,0,.48,.58,.43,silver);box(e,0,.36,.23,.35,.23,.03,'#689ca5');box(e,0,.13,.23,.32,.1,.035,'#335e65');box(e,0,.61,0,.5,.06,.44,'#edf0df')});
 install('fridge',1.56,.36,-.92,e=>{box(e,0,.81,0,.67,1.62,.69,silver);box(e,0,.82,.37,.61,1.5,.06,'#e7ecda');box(e,0,1.07,.414,.59,.028,.025,'#a1b4a7');box(e,-.19,.87,.43,.04,.26,.05,'#698e82')});
 // Right edge from the operator's side; keypad and drawer face into the room (-Z).
 install('register',.23,1.62,1.25,e=>{e.userData.facing='interior';box(e,0,.065,0,.42,.13,.32,dark);box(e,0,.24,.04,.34,.23,.12,'#35564e');box(e,0,.25,-.029,.25,.12,.014,'#b8dfb6');for(let row=0;row<3;row++)for(let col=0;col<3;col++)box(e,-.11+col*.105,.15,-.085-row*.045,.065,.025,.032,'#e6e3c6');box(e,0,.062,-.172,.34,.065,.02,'#7e9a88');box(e,0,.064,-.19,.12,.023,.025,'#d1c8a8')});
 install('lights',0,2.57,-1.14,e=>{box(e,0,0,0,1.7,.24,.055,'#325649');voxelText(e,'FRESH',0,0,.04,.16,'#ffe989')});
 let speaker=null;if(owns('music')){speaker=createSpeaker(g,w);equipment.userData.ids.push('music')}
 const stock=group(g);stock.name='stock';
 const price=label(g,`$${Number(state.price||2.25).toFixed(2)} / CUP`,.95,.87,1.375,1.5,.2,{size:58,background:'#fff1a8'});
 roof.remove(doors.group);g.remove(roof,equipment,stock);if(speaker)g.remove(speaker.group);
 batch(g);batch(roof);batch(equipment);roof.add(doors.group);g.add(roof,equipment,stock);if(speaker)g.add(speaker.group);
 return {group:g,roof,equipment,stock,price,width:w,style:'classic',avatarAnchor:{x:.95,y:.75,z:.42},doors,speaker,fridge:owns('fridge')};
}
