import * as THREE from 'three';
import {box,group,batch,character} from './models.js';
import {voxelText,glyphs} from './voxel-text.js';
import {STORE_FIXTURES,STORE_CHECKOUTS,STORE_COLUMNS} from './store-floorplan.js';
// Checkout numbers use the same extruded pixel construction as world signs.
Object.assign(glyphs,{'1':['010','110','010','010','010','010','111'],'2':['11110','00011','00011','01110','11000','11000','11111'],'3':['11110','00011','00011','01110','00011','00011','11110'],'4':['11011','11011','11011','11111','00011','00011','00011'],'5':['11111','11000','11000','11110','00011','00011','11110'],'6':['01111','11000','11000','11110','11011','11011','01110']});
const colors=['#e9bb49','#d45143','#77a2b4','#a49d5b','#a979a0','#58a49b'];
export function storeCart(parent,x=0,z=0,loaded=false){const g=group(parent,x,0,z);g.name='shopster-shopping-cart';box(g,0,.26,0,.57,.055,.72,'#718189');for(const side of [-1,1]){for(const zz of [-.24,.24])box(g,side*.25,.1,zz,.09,.16,.13,'#37414a');for(let k=0;k<4;k++)box(g,side*.28,.47+k*.095,0,.035,.025,.68,'#9daeb1');for(const zz of [-.32,0,.32])box(g,side*.28,.59,zz,.025,.4,.025,'#aeb9b7')}for(const zz of [-.34,.34])for(let k=0;k<4;k++)box(g,0,.47+k*.095,zz,.55,.025,.03,'#aeb9b7');for(const side of [-1,1])box(g,side*.25,.74,-.46,.035,.3,.035,'#97a8ac');box(g,0,.87,-.46,.6,.065,.075,'#bd303e');if(loaded)for(let i=0;i<3;i++)box(g,-.16+i*.16,.48+i%2*.07,.04,.14,.22,.22,colors[i]);batch(g);return g;}
export function storeProducts(parent,x,z,width,depth,kind){
 const shelf=group(parent,x,0,z);shelf.name='shopster-'+kind;box(shelf,0,.16,0,width,.26,depth,'#a5aaa7');
 for(const side of [-1,1])box(shelf,side*(width/2-.04),1.04,0,.08,1.7,depth,'#c9cdca');box(shelf,0,1.04,0,width,1.75,.09,'#aab4b1');
 for(const y of [.4,.9,1.4]){box(shelf,0,y,0,width,.075,depth,'#d1d6d1');box(shelf,0,y-.02,depth/2+.02,width,.1,.035,'#f4eee0');const n=Math.max(2,Math.floor(width/.3));for(let i=0;i<n;i++){const xx=-width/2+.18+i*(width-.36)/Math.max(1,n-1),color=colors[(i+Math.floor(y*5))%colors.length];for(const side of [-1,1]){const item=box(shelf,xx,y+.19,side*(depth/2-.13),.18,.29,.19,color);if(kind==='sports'&&i%3===0)item.scale.y*=1.3;box(shelf,xx,y+.23,side*(depth/2-.025),.07,.07,.014,'#f2e0b2')}}}
}
function display(parent,f){if(f.kind==='sports'||f.kind==='grocery'){storeProducts(parent,f.x,f.z,f.width,f.depth,f.kind);return}if(f.kind==='seasonal'){const g=group(parent,f.x,0,f.z);g.rotation.y=Math.PI/2;storeProducts(g,0,0,f.depth,f.width,'seasonal');return}const g=group(parent,f.x,0,f.z);box(g,0,.48,0,f.width,.8,f.depth,'#aeb4b1');box(g,0,.92,0,f.width+.1,.12,f.depth+.1,'#e3ded0');for(let i=0;i<4;i++){const z=-f.depth/2+.28+i*(f.depth-.5)/3;if(f.kind==='decor'){box(g,0,1.14,z,.35,.35,.35,i%2?'#ccb481':'#93a599');box(g,0,1.41,z,.46,.18,.46,'#f1d8a9')}else{box(g,0,1.17,z,.58,.4,.32,colors[i]);box(g,0,1.2,z+.165,.23,.12,.012,'#f1e1b5')}}}
export function storeCeilingSpeaker(parent,x,z){const g=group(parent,x,5.48,z);g.name='shopster-ceiling-speaker';box(g,0,0,0,.62,.14,.54,'#d6d4c8');box(g,0,-.085,0,.46,.035,.39,'#677675');for(let i=0;i<6;i++)box(g,-.19+i*.076,-.11,0,.025,.02,.34,'#39494d');return g;}
export function buildStoreFront(root){
 const fixtures=group(root);fixtures.name='shopster-front-interior';const ceiling=group(root);ceiling.name='shopster-ceiling';
 box(fixtures,0,.2,0,29.7,.16,21,'#d5d0bf');for(let x=-14;x<15;x+=1)for(let z=-10.25;z<10.5;z+=1)box(fixtures,x,.287,z,.985,.012,.985,(Math.round(x+z*4)%3===0)?'#d7d1c4':'#e5ded0');
 for(const x of [-14.83,14.83]){box(fixtures,x,2.9,0,.12,5.5,21,'#e7e0d1');box(fixtures,x,4.7,0,.14,.75,21,'#bc3038');box(fixtures,x,.43,0,.13,.25,21,'#8c928e')}
 for(const f of STORE_FIXTURES.filter(f=>!['checkout','carts'].includes(f.kind)))display(fixtures,f);
 for(const lane of STORE_CHECKOUTS){const g=group(fixtures,lane.x,0,lane.z);g.name='shopster-checkout-'+lane.number;box(g,0,.66,0,1.2,.96,1.6,'#bc2939');box(g,0,.23,0,1.25,.16,1.65,'#747c7c');box(g,0,1.2,0,1.3,.14,1.72,'#c7c9bc');box(g,0,1.29,-.4,1.04,.055,.65,'#424e54');box(g,-.2,1.48,.37,.45,.32,.1,'#333e48');box(g,-.2,1.48,.43,.34,.22,.025,'#689395');box(g,.24,1.3,.35,.3,.045,.22,'#545d5e');box(g,.4,2.5,.1,.07,2.45,.07,'#657477');box(g,.4,3.8,.1,.56,1.1,.2,'#bd2c3a');voxelText(g,String(lane.number),.4,3.85,.23,.55,'#fff4da');const reverse=voxelText(g,String(lane.number),.4,3.85,-.03,.55,'#fff4da');reverse.rotation.y=Math.PI;
 // Candy/endcap rack on the aisle-facing side.
 for(const y of [.55,.85]){box(g,0,y,.86,1.12,.065,.22,'#b2b9b2');for(let k=0;k<5;k++)box(g,-.42+k*.21,y+.12,.86,.15,.18,.16,colors[k])}}
 for(const x of [-10.8,10.8]){box(fixtures,x,.36,9.55,4.3,.1,.95,'#a4aeaa');for(const dx of [-2.08,2.08])box(fixtures,x+dx,.64,9.55,.055,.65,.95,'#a7b1af');for(let i=0;i<6;i++)storeCart(fixtures,x-1.5+i*.6,9.55)}
 for(const {x,z} of STORE_COLUMNS){box(fixtures,x,2.95,z,.28,5.3,.28,'#e0dacd');box(fixtures,x,5.55,z,.58,.2,.58,'#dfd9cc')}
 box(ceiling,0,5.78,0,29.6,.14,21,'#b9b4ab');const glow=new THREE.MeshStandardMaterial({color:'#fff9e9',emissive:'#fff4d7',emissiveIntensity:.9,roughness:.6});glow.userData.owned=true;
 for(let x=-12;x<=12;x+=4)for(const z of [8.3,3.3,-1.7,-6.7]){box(ceiling,x,5.66,z,1.4,.12,1.1,'#d8d3c5');box(ceiling,x,5.58,z,1.25,.045,.95,'#fff9e9').material=glow}
 for(const x of [-12,12])for(const z of [5,-6])storeCeilingSpeaker(ceiling,x,z);
 const lights=[];for(const x of [-10,0,10])for(const z of [5,-5]){const light=new THREE.PointLight('#fff0d6',28,18,1.6);light.position.set(x,4.65,z);light.visible=false;root.add(light);lights.push(light)}
 return {fixtures,ceiling,lights};
}
export function storeStaff(parent,index,cashier=false){const rig=character(parent,index,{type:index%2?'female':'male',shirt:'#bd303e',pants:'#b4a181',shoes:'#3b4247'});rig.group.name=cashier?'shopster-cashier':'shopster-floor-worker';rig.group.scale.setScalar(1.15);box(rig.slots.body,.09,.82,.154,.11,.07,.025,'#fff0c8');rig.cup.removeFromParent();for(const part of Object.values(rig.slots).flat())if(part?.isObject3D)batch(part);return rig;}
