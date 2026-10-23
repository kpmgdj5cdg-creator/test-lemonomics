import * as THREE from 'three';
import {box,group,label,batch,character} from './models.js';
import {voxelText} from './voxel-text.js';
import {drawSlotScreen} from './casino-screen.js';
export const CASINO_CENTER={x:-29.5,z:-10.2},CASINO_ANGLE=0;
export const CASINO_BOUNDS={minX:-5.65,maxX:5.65,minZ:-4.7,maxZ:4.75};
export const CASINO_SOLIDS=[{minX:-6,maxX:-4.05,minZ:-4.9,maxZ:3.85},{minX:4.05,maxX:6,minZ:-4.9,maxZ:3.85},{minX:-6,maxX:6,minZ:-5,maxZ:-3.45},{minX:-3.52,maxX:-.95,minZ:-2.25,maxZ:1.65},{minX:.95,maxX:3.52,minZ:-2.25,maxZ:1.65}];
export function casinoWorld(x,z){return {x:CASINO_CENTER.x+x*Math.cos(CASINO_ANGLE)+z*Math.sin(CASINO_ANGLE),z:CASINO_CENTER.z-x*Math.sin(CASINO_ANGLE)+z*Math.cos(CASINO_ANGLE)};}
export const CASINO_FRONT=casinoWorld(0,5.8);
function seat(parent,x,z){box(parent,x,.45,z,.48,.13,.45,'#b8273d');for(const dx of [-.16,.16])box(parent,x+dx,.23,z,.07,.4,.3,'#735039');}
function slot(parent,x,z,angle,stake,index){
 const g=group(parent,x,0,z);g.rotation.y=angle;g.name='casino-slot-'+index;g.scale.y=1.18;
 box(g,0,.78,0,.98,1.5,.55,'#28354a');box(g,0,1.6,0,1.08,.18,.65,'#b82038');box(g,0,1.86,0,.62,.35,.2,'#bf2439');label(g,'$'+stake.toFixed(2),0,1.87,.12,.54,.25,{background:'#e4b546',color:'#842233',size:190});
 box(g,0,1.28,.31,.88,.62,.08,'#d5af54');const panel=label(g,'',0,1.28,.365,.79,.43,{background:'#f7f1cd',color:'#6a3444',size:100});
 drawSlotScreen(panel.material.map.image,[0,1,3]);panel.material.map.needsUpdate=true;panel.material.emissive.set('#ffffff');panel.material.emissiveMap=panel.material.map;panel.material.emissiveIntensity=.35;
 for(const dx of [-.135,.135])box(g,dx,1.28,.375,.018,.44,.02,'#75524a');box(g,0,1.28,.385,.81,.014,.02,'#bf3d3e');
 const console=box(g,0,.91,.41,.96,.15,.52,'#a72641');console.rotation.x=.16;for(const dx of [-.27,0,.27])box(g,dx,1.01,.48,.15,.05,.17,'#f5d45a');box(g,0,.55,.3,.62,.19,.04,'#101c2a');seat(g,0,.92);
 batch(g);return {group:g,stake,panel,index};
}
function dealer(parent,x,z,female=false){const a=character(parent,2,{type:female?'female':'male',shirt:'#fff3da',pants:'#252936',hair:'#3b2d2a'});a.group.position.set(x,.2,z);a.group.scale.setScalar(1.35);a.group.name='casino-dealer';box(a.group,0,.74,.157,.28,.32,.04,'#222735');for(const dx of [-.06,.06])box(a.group,dx,.94,.174,.09,.06,.035,'#b6263c');box(a.group,0,.93,.2,.045,.05,.02,'#f5c759');batch(a.group);return a;}
function table(parent,x,kind){const g=group(parent,x,0,-.3);g.name='casino-'+kind;
 box(g,0,.55,0,1.65,1.0,1.45,'#452b25');box(g,0,1.13,0,2.85,.22,2.0,'#6f4029');box(g,0,1.27,0,2.65,.10,1.8,kind==='holdem'?'#19725a':'#29674a');
 for(const dx of [-1.35,1.35])box(g,dx,1.33,0,.18,.16,2.04,'#2b292b');for(const dz of [-.96,.96])box(g,0,1.33,dz,2.75,.16,.16,'#2b292b');
 if(kind==='holdem'){
  for(let i=0;i<5;i++){box(g,-.7+i*.35,1.34,0,.25,.025,.37,'#e6ead1');box(g,-.7+i*.35,1.36,0,.07,.01,.1,i%2?'#af2940':'#282f36')}
  for(const dx of [-.85,.85])for(let i=0;i<4;i++)box(g,dx,1.36+i*.035,-.61,.15,.035,.15,i%2?'#e9bb4c':'#a92a39');
 }else{
  const wheel=group(g,-.55,1.38,0);for(let i=0;i<37;i++){const a=i/37*Math.PI*2;const m=box(wheel,Math.sin(a)*.49,.015,Math.cos(a)*.49,.075,.07,.15,i===0?'#237e55':i%2?'#b82d39':'#272b32');m.rotation.y=a;}box(wheel,0,.13,0,.14,.3,.14,'#f3ce6d');box(wheel,.43,.12,0,.08,.08,.08,'#fffceb');batch(wheel);
  for(let i=0;i<12;i++)box(g,.34+(i%3)*.24,1.34,-.53+Math.floor(i/3)*.31,.2,.025,.25,i%2?'#b32b3d':'#232d36');
  g.userData.wheel=wheel;
 }
 for(const dx of [-.7,.7])seat(parent,x+dx,1.24);batch(g);return g;
}
export function buildCasino(parent){
 const root=group(parent,CASINO_CENTER.x,.12,CASINO_CENTER.z);root.rotation.y=CASINO_ANGLE;root.name='downtown-casino';
 const body=group(root),roof=group(root),doors=group(root),props=group(root),targets=[];
 box(body,0,.05,0,12.2,.16,10.2,'#82443b');box(body,0,.17,0,11.7,.10,9.7,'#a91735');
 for(const x of [-5.3,5.3])box(body,x,.235,0,.07,.015,9.2,'#e9b750');box(body,0,.235,4.2,10.6,.015,.07,'#e9b750');
 for(const x of [-6,6]){box(body,x,1.9,0,.22,3.6,10,'#e3d4b9');box(body,x,2.95,0,.25,.22,10,'#bd263c');box(body,x,.52,0,.25,.54,10,'#a8283b')}
 box(body,0,1.9,-5,12.1,3.6,.22,'#e6d9bb');box(body,0,3,-4.87,11.8,.21,.08,'#cfaa50');
 // Real front window and door openings keep the actual street visible inside.
 for(const [a,b]of [[-6,-5.45],[-2.1,-1.28],[1.28,2.1],[5.45,6]])box(body,(a+b)/2,1.85,5,b-a,3.6,.22,'#e9ddc5');
 box(body,0,3.28,5,12,.72,.22,'#eee1c9');for(const x of [-3.8,3.8]){box(body,x,.53,5,3.3,.74,.23,'#b22a3d');for(const y of [.94,2.91])box(body,x,y,5,3.5,.1,.28,'#403535');for(const dx of [-1.7,1.7])box(body,x+dx,1.93,5,.1,2.05,.28,'#403535');}
 const glassMat=new THREE.MeshStandardMaterial({color:'#b4cfd1',transparent:true,opacity:.10,depthWrite:false});glassMat.userData.owned=true;
 function glass(parent,x,y,z,w,h){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,.025),glassMat);m.position.set(x,y,z);parent.add(m);return m;}
 for(const x of [-3.8,3.8])glass(body,x,1.92,5,3.25,1.86);
 const hinges=[];for(const side of [-1,1]){const h=group(doors,side*1.18,0,5),leaf=group(h,-side*.57,0,0);for(const x of [-.57,.57])box(leaf,x,1.55,0,.09,2.64,.11,'#413532');for(const y of [.25,2.87])box(leaf,0,y,0,1.22,.1,.12,'#413532');glass(leaf,0,1.56,0,1.04,2.5);box(leaf,-side*.38,1.44,.11,.055,.56,.09,'#efc359');batch(h);hinges.push(h);}
 box(body,0,.13,5.35,2.8,.15,.75,'#bb2d40');
 box(roof,0,3.65,0,12.6,.28,10.55,'#b42239');box(roof,0,3.8,0,12.7,.14,10.65,'#e3b549');box(roof,0,3.98,0,12.3,.25,10.3,'#aa1e36');
 box(roof,0,4.45,5.13,8.2,1.6,.38,'#9f1e35');for(const x of [-4.1,4.1])box(roof,x,4.45,5.36,.12,1.7,.12,'#f8cf65');for(const y of [3.63,5.29])box(roof,0,y,5.36,8.3,.12,.12,'#f8cf65');voxelText(roof,'CASINO',0,4.44,5.39,1.1,'#ffe084');
 box(roof,0,5.45,5.13,2.6,.7,.38,'#9f1e35');box(roof,0,5.63,5.4,.17,.17,.12,'#ffe084');box(roof,0,5.46,5.4,.47,.18,.12,'#ffe084');box(roof,0,5.29,5.4,.73,.19,.12,'#ffe084');box(roof,0,5.10,5.4,.15,.22,.12,'#ffe084');
 box(roof,0,3.25,5.7,3.2,.28,1.1,'#a11c35');
 // Warm ceiling recesses and practical lights remain on at night.
 box(roof,0,3.56,0,11.7,.12,9.7,'#e3cfaa');box(roof,0,3.47,0,7.4,.16,6.6,'#a32138');
 for(const [x,z]of [[0,3],[0,-2.8],[-4,0],[4,0]]){box(roof,x,3.36,z,.84,.16,.75,'#d9a446');box(roof,x,3.25,z,.65,.12,.55,'#fff1b5')}
 for(const x of [-2.8,2.8]){const light=new THREE.PointLight('#ffe1a4',7,10,1.4);light.position.set(x,2.9,0);root.add(light);}
 let index=0;const slots=[];for(const [x,angle,stake]of [[-5.25,Math.PI/2,.25],[5.25,-Math.PI/2,1]])for(const z of [-2.8,-.9,1,2.9])slots.push(slot(props,x,z,angle,stake,index++));
 for(const x of [-3.6,-1.2,1.2,3.6])slots.push(slot(props,x,-4.45,0,5,index++));
 for(const machine of slots)targets.push({kind:'slots',stake:machine.stake,index:machine.index,object:machine.group});
 const holdem=table(props,-2.4,'holdem'),roulette=table(props,2.4,'roulette');holdem.scale.x=roulette.scale.x=.82;holdem.position.x=-2.25;roulette.position.x=2.25;targets.push({kind:'holdem',object:holdem},{kind:'roulette',object:roulette});
 dealer(props,-2.4,-1.88);dealer(props,2.4,-1.88,true);
 batch(body);batch(roof);
 return {root,body,roof,doors,hinges,targets,slots,roulette,doorAmount:0};
}
