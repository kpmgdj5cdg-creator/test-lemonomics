import * as THREE from 'three';
import {box,group,tree} from './models.js';
import {voxelText} from './voxel-text.js';
import {DEPARTMENT_STORE as D,STORE_SPACES,STORE_PARKED_SPACES,STORE_PARKING_BOUNDS as LOT,STORE_REAR_BOUNDS as REAR,STORE_SIDE_LANES as LANES} from './department-store-layout.js';
const owned=m=>{m.userData.owned=true;return m};
function car(parent,x,z,color,angle=0){const g=group(parent,x,.095,z);g.rotation.y=angle;g.name='shopster-parked-car';box(g,0,.4,0,1.48,.54,2.85,color);box(g,0,.87,-.04,1.23,.48,1.5,color);box(g,0,.88,.73,1.08,.32,.035,'#6193a1');box(g,0,.88,-.81,1.08,.32,.035,'#416c7d');for(const side of [-1,1]){box(g,side*.63,.89,0,.035,.3,1.3,'#416c7d');for(const z of [-.92,.92])box(g,side*.73,.26,z,.21,.48,.45,'#26313b');box(g,side*.48,.45,1.45,.25,.15,.035,'#f3dda0');box(g,side*.48,.45,-1.45,.25,.15,.035,'#ba3c43')}return g}
function cart(parent,x,z){const g=group(parent,x,.2,z);box(g,0,.25,0,.52,.055,.7,'#707c80');for(const side of [-1,1]){box(g,side*.25,.59,0,.04,.44,.66,'#adada3');for(const zz of [-.23,.23])box(g,side*.23,.09,zz,.1,.15,.13,'#303b42')}box(g,0,.59,-.33,.52,.44,.04,'#9ca6a3');for(const zz of [-.23,-.05,.13,.31])box(g,0,.61,zz,.52,.025,.025,'#c3c4b6');box(g,0,.84,-.48,.62,.075,.09,'#b82e39');return g}
export function buildDepartmentStore(parent){
 const X=offset=>D.x+offset;const root=group(parent,D.x,.12,D.z);root.name='shopster-exterior';const body=group(root),roof=group(root),front=D.depth/2;
 // Cream big-box facade, red wraparound stripe, tall parapet and service side.
 box(body,0,.1,0,D.width+.35,.2,D.depth+.35,'#b6b4a6');box(body,0,D.height/2+.2,0,D.width,D.height,D.depth,'#d9d4c6');
 for(const side of [-1,1]){box(body,side*(D.width/2+.035),1.55,0,.09,.3,D.depth,'#bb303c');box(body,side*(D.width/2+.045),.75,0,.1,1.18,D.depth,'#a9a89d')}
 box(body,0,1.55,front+.04,D.width,.3,.09,'#bb303c');box(body,0,.75,front+.06,D.width,1.15,.12,'#aaa99f');
 // Recessed red-framed entry glazing is ready for a later interior doorway.
 const glass=owned(new THREE.MeshStandardMaterial({color:'#7a6860',emissive:'#d38a50',emissiveIntensity:.1,roughness:.3,metalness:.1}));
 box(body,0,2.75,front+.16,10.6,5.25,.5,'#c42e3c');box(body,0,1.75,front+.45,9.2,3.05,.17,'#663b32');
 for(let i=0;i<8;i++){const x=-4.03+i*1.15;box(body,x,1.77,front+.56,1.04,2.75,.045,'#7a6860').material=glass;box(body,x,1.77,front+.61,.065,2.85,.05,'#c4343b');box(body,x,1.72,front+.65,1.1,.055,.04,'#df7e4b');box(body,x,2.65,front+.65,.95,.035,.025,'#f4b26b')}
 for(const x of [-1.72,-.57,.57,1.72])box(body,x,1.45,front+.7,.055,.48,.06,'#f6d7a0');
 box(body,0,3.3,front+1.04,11.2,.22,1.7,'#b92e3b');box(body,0,3.44,front+1.04,11.5,.14,1.85,'#ece2cd');
 box(body,0,4.55,front+.55,11.9,2.1,.72,'#bc2937');box(body,0,5.7,front+.55,12.1,.18,.8,'#efe8d7');
 const sign=voxelText(body,'SHOPSTER',.75,4.6,front+.96,.95,'#fff0dc');const signMaterial=owned(new THREE.MeshStandardMaterial({color:'#fff3dc',emissive:'#ffdfb4',emissiveIntensity:.02,roughness:.6}));sign.traverse(o=>{if(o.isMesh)o.material=signMaterial});
 const logo=group(body,-4.5,4.6,front+.98);box(logo,0,-.08,0,.95,.86,.13,'#fff0dc');for(const x of [-.22,.22])box(logo,x,.48,0,.1,.35,.12,'#fff0dc');box(logo,0,.64,0,.53,.1,.12,'#fff0dc');for(const x of [-.18,.18])box(logo,x,-.02,.09,.09,.1,.03,'#be2d3a');box(logo,0,-.25,.09,.28,.055,.03,'#be2d3a');
 logo.traverse(o=>{if(o.isMesh&&o.material.color.getHexString()==='fff0dc')o.material=signMaterial});
 for(const x of [-8.2,8.2]){box(body,x,3.45,front+.11,2,4.8,.2,'#eee5d5');const words=x<0?['HOME','STYLE','TECH','MORE']:['GOOD','BRIGHT','DAYS'];words.forEach((word,i)=>voxelText(body,word,x,4.85-i*.52,front+.24,.27,'#b6323e'))}
 for(const side of [-1,1])for(let i=0;i<4;i++)box(body,side*12,2.8+i*.75,front+.15,.12,.4,.04,'#d5b688');
 // Low-slope roof, raised coping, drainage and voxel HVAC equipment.
 box(roof,0,D.height+.25,0,D.width+.3,.25,D.depth+.3,'#ded9cd');for(const z of [-front,front])box(roof,0,D.height+.52,z,D.width+.45,.42,.2,'#efe9dc');for(const x of [-D.width/2,D.width/2])box(roof,x,D.height+.52,0,.2,.42,D.depth,'#efe9dc');
 for(const [x,z]of [[-9,-5],[0,-6],[9,-4],[-8,3],[7,3]]){box(roof,x,D.height+.66,z,1.8,.65,1.25,'#aeb0a9');box(roof,x,D.height+1.02,z,1.95,.1,1.4,'#d0cdc1');for(let k=0;k<6;k++)box(roof,x-.65+k*.26,D.height+.7,z+.64,.12,.42,.035,'#6e7980')}
 for(const side of [-1,1])box(body,side*(D.width/2+.08),2.6,-7,.13,4.7,.13,'#b4b6af');
 // Receiving bay and back-of-house exterior only.
 box(body,-9,1.3,-front-.13,5.3,2.4,.25,'#727b80');for(let i=0;i<9;i++)box(body,-9,.35+i*.25,-front-.28,5.05,.025,.04,'#9caaa9');box(body,-9,.19,-front-1.25,6.2,.3,2.7,'#8e9592');
 for(const x of [-12.1,-5.9])box(body,x,.65,-front-1.4,.14,.95,.14,'#e6bc44');box(body,10,1.3,-front-.12,1.1,2.3,.18,'#65747a');
 const site=group(parent);site.name='shopster-site';box(site,D.x,.095,D.z+front+1.1,32,.18,2.3,'#d8d7c7');box(site,D.x,.06,D.z-front-2.6,32,.12,4.5,'#6c7779');
 for(let i=0;i<6;i++)box(site,D.x-4+i*1.6,.69,D.z+front+1.65,.2,1.05,.2,'#c33941');
 // Connected drive lanes flank the building and join a smaller rear lot.
 for(const lane of LANES)box(site,lane.x,.055,(lane.minZ+lane.maxZ)/2,lane.width,.12,lane.maxZ-lane.minZ,'#46505a');
 box(site,(REAR.minX+REAR.maxX)/2,.055,(REAR.minZ+REAR.maxZ)/2,REAR.maxX-REAR.minX,.12,REAR.maxZ-REAR.minZ,'#46505a');
 for(const lane of LANES)for(let z=-3;z>-53;z-=5)box(site,lane.x,.135,z,.08,.015,1.8,'#e5bf40');
 // Forty yellow-lined bays, accessible blue pads and an uninterrupted center walk.
 box(site,(LOT.minX+LOT.maxX)/2,.055,(LOT.minZ+LOT.maxZ)/2,LOT.maxX-LOT.minX,.12,LOT.maxZ-LOT.minZ,'#46505a');
 for(const s of STORE_SPACES){if(s.accessible)box(site,s.x,.122,s.z,2.75,.014,3.75,'#326d9f');for(const dx of [-1.35,1.35])box(site,s.x+dx,.135,s.z,.065,.015,3.85,'#e5bf40');box(site,s.x,.135,s.z-1.95,2.75,.015,.065,'#e5bf40');if(s.accessible){voxelText(site,'P',s.x,.145,s.z,.45,'#fff1c9').rotation.x=-Math.PI/2;box(site,s.x,.15,s.z-.65,.75,.02,.07,'#fff1c9')}}
 STORE_PARKED_SPACES.forEach((s,i)=>car(site,s.x,s.z,['#b9464b','#427d9e','#d6c8a2','#5b8b72','#a58552'][i%5],i%3===0?Math.PI:0));
 box(site,D.x,.135,-12.6,1.8,.17,27.6,'#d6d5c4');for(let i=0;i<6;i++)box(site,D.x-2.2+i*.86,.151,-24.4,.4,.02,2.3,'#f3e5bf');
 // Cart corral beside the doors and landscape islands between parking rows.
 const corralX=D.x+9;for(const x of [corralX-2,corralX+2])box(site,x,.65,D.z+front+1.35,.065,1,1.25,'#8c999a');box(site,corralX,.95,D.z+front+.8,4.1,.08,.07,'#bf3440');for(let i=0;i<7;i++)cart(site,corralX-1.6+i*.5,D.z+front+1.35);
 for(const x of [X(-16.3),X(14.7)])for(const z of [-4.8,-15,-24.3]){box(site,x,.18,z,1.65,.28,2,'#d0d4c3');box(site,x,.35,z,1.4,.1,1.75,'#5b7d4b');tree(site,x,z,.75,.9)}
 for(const [x,z]of [[X(-8),-12.6],[X(9),-12.6],[X(-8),-25],[X(9),-25]]){box(site,x,.21,z,2.2,.32,1.15,'#d5d8c9');box(site,x,.39,z,1.95,.08,.9,'#6a8955');tree(site,x,z,.65,.9)}
 const lampMaterial=owned(new THREE.MeshStandardMaterial({color:'#f1db9e',emissive:'#ffd48e',emissiveIntensity:0})),lights=[];
 for(const [x,z]of [[X(-13),-1],[X(14),-1],[X(-13),-13],[X(14),-13],[X(-11),-24.5],[X(12),-24.5],...[-1,1].flatMap(side=>[-8,-24,-40,-55].map(z=>[X(side*22.5),z])),[X(-11),-61.8],[X(11),-61.8]]){box(site,x,.26,z,.65,.38,.65,'#d5b14e');box(site,x,2.45,z,.14,4.4,.14,'#52606a');box(site,x,4.72,z,.62,.18,.62,'#4f5d62');box(site,x,4.58,z,.46,.12,.46,'#f1db9e').material=lampMaterial}
 const lightSites=[[X(-4),3.2,D.z+front+1.3,7,18],[X(4),3.2,D.z+front+1.3,7,18],[D.x,4.6,-12,30,24],...[-1,1].flatMap(side=>[-10,-30,-49].map(z=>[X(side*20.5),4.6,z,20,17])),[D.x,4.6,-57,26,23]];
 for(const [x,y,z,power,range]of lightSites){const l=new THREE.PointLight('#ffdc9c',0,range,1.7);l.userData.nightPower=power;l.position.set(x,y,z);parent.add(l);lights.push(l)}
 let night=null;function setNight(value){if(value===night)return;night=value;signMaterial.emissiveIntensity=night?.9:.02;glass.emissiveIntensity=night?.4:.1;lampMaterial.emissiveIntensity=night?1.6:0;lights.forEach(l=>{l.intensity=night?l.userData.nightPower:0;l.visible=night})}setNight(false);
 return {root,site,sign,signMaterial,lights,setNight,spaces:STORE_SPACES.length,cars:STORE_PARKED_SPACES.length};
}
