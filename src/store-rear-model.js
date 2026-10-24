import {storeFloorTiles} from './store-floor-finish.js';
import {STORE_BACK_Z,STORE_EMPLOYEE_EXTENSION as EXT,employeeRoomZ,storePlanZ} from './department-store-layout.js';
import * as THREE from 'three';
import {box,group} from './models.js';
import {storeProducts,storeCeilingSpeaker,storeEndcap} from './store-front-model.js';
import {STORE_REAR_FIXTURES,STORE_BACKROOM_FIXTURES,STORE_ROOM_WALLS,STORE_STAFF_DOORS,STORE_ENDCAPS} from './store-floorplan.js';
const palette=['#d6544e','#e2b95b','#72a4b4','#ab83ae','#7caa7c'];
function rack(parent,f){const g=group(parent,f.x,0,f.z);if(f.kind==='electronics'||f.kind==='shoes')g.rotation.y=Math.PI/2;const w=['electronics','shoes'].includes(f.kind)?f.depth:f.width,d=['electronics','shoes'].includes(f.kind)?f.width:f.depth;storeProducts(g,0,0,w,d,f.kind);if(f.kind==='electronics')for(let i=0;i<3;i++){const x=-w/2+.45+i*(w-.9)/2;box(g,x,3.8,0,.62,.4,.14,'#313e47');box(g,x,3.8,d/2+.02,.51,.29,.025,'#83a8b1')}}
function clothes(parent,f){const g=group(parent,f.x,0,f.z);for(const z of [-f.depth/2,f.depth/2]){box(g,0,.33,z,.85,.08,.3,'#889491');box(g,0,1.15,z,.07,1.6,.07,'#a9b2ad')}box(g,0,1.91,0,.08,.07,f.depth,'#9caaa6');for(let i=0;i<Math.floor(f.depth/.35);i++){const z=-f.depth/2+.2+i*.35;box(g,0,1.53,z,.65,.57,.12,palette[i%5]);for(const side of [-1,1])box(g,side*.38,1.69,z,.19,.23,.12,palette[i%5]);box(g,0,1.88,z,.26,.04,.04,'#e3ccb0')}}
function warehouseRack(parent,f){const g=group(parent,f.x,0,f.z);for(const x of [-f.width/2,f.width/2])box(g,x,1.5,0,.09,2.6,f.depth,'#798b8c');for(const y of [.42,1.3,2.2]){box(g,0,y,0,f.width,.09,f.depth,'#a8afaa');for(let i=0;i<Math.floor(f.width/.65);i++){const x=-f.width/2+.36+i*.65;box(g,x,y+.24,0,.52,.42,f.depth*.85,'#b89163');box(g,x,y+.25,f.depth/2,.19,.11,.012,'#eee0ba');box(g,x,y+.46,0,.055,.015,f.depth*.8,'#d5b989')}}}
function employeeFixture(parent,f){const g=group(parent,f.x,0,f.z);switch(f.kind){
 case 'stock-rack':case 'receiving-rack':if(f.width<f.depth){g.rotation.y=Math.PI/2;warehouseRack(g,{...f,x:0,z:0,width:f.depth,depth:f.width})}else warehouseRack(g,{...f,x:0,z:0});break;
 case 'pallet':for(const y of [.33,.46])for(const x of [-.55,0,.55])box(g,x,y,0,.18,.1,1.1,'#ae8758');for(const x of [-.38,.38]){box(g,x,.88,0,.65,.7,.85,'#b9966b');box(g,x,.9,.435,.22,.17,.012,'#e9dabb');box(g,x,1.24,0,.07,.012,.85,'#dbbc89')}break;
 case 'toilet':box(g,0,.47,0,.43,.35,.55,'#dddcd4');box(g,0,.7,.08,.56,.13,.65,'#f5eee1');box(g,0,.78,.1,.32,.025,.35,'#849898');box(g,0,.94,-.28,.54,.6,.17,'#ede8dc');box(g,.16,1.2,-.17,.08,.025,.04,'#8d9b9b');break;
 case 'sink':box(g,0,.62,0,.5,.65,.95,'#b2bab2');box(g,0,1,0,.59,.13,1.04,'#eee9dd');for(const z of [-.25,.25]){box(g,0,1.075,z,.35,.025,.3,'#7a989e');box(g,-.16,1.2,z,.045,.23,.045,'#a5b6b6')}box(g,-.25,1.7,0,.035,.85,.9,'#718b93');break;
 case 'stall-wall':box(g,0,1.52,0,f.width,2.45,f.depth,'#c2c6bd');break;
 case 'lockers':for(let i=0;i<3;i++){const x=-.45+i*.45;box(g,x,1.34,0,.43,2.05,.58,'#8f9b9d');for(let k=0;k<4;k++)box(g,x,2.12-k*.07,.305,.23,.025,.015,'#64757c');box(g,x+.11,1.42,.31,.04,.18,.035,'#485b65')}break;
 case 'break-counter':box(g,0,.74,0,f.width,.95,.6,'#b72d3c');box(g,0,1.28,0,f.width+.05,.13,.7,'#d6d4c7');for(const x of [-1,0,1])box(g,x,.76,.31,.025,.86,.02,'#8f2935');box(g,-.8,1.6,0,.78,.52,.48,'#9fa6a3');box(g,-.8,1.61,.25,.54,.32,.03,'#344650');box(g,.5,1.59,0,.38,.53,.35,'#3c4b51');box(g,.5,1.88,0,.44,.13,.37,'#bd2937');box(g,.5,1.51,.2,.2,.25,.1,'#c2b8a1');break;
 case 'break-table':box(g,0,.69,0,.12,.75,.12,'#59696e');box(g,0,.34,0,.55,.08,.48,'#59696e');box(g,0,1.1,0,.88,.14,.74,'#d3d1c5');box(g,0,1.24,0,.16,.18,.17,'#858e8c');break;
 case 'chair':box(g,0,.65,0,.43,.1,.46,'#be303c');box(g,0,.91,-.2,.43,.54,.08,'#c63b44');for(const x of [-.16,.16])for(const z of [-.16,.16])box(g,x,.47,z,.055,.4,.055,'#5c6c70');break;
 }}
export function buildStoreRear(root){
 const rearDepth=-10.5-STORE_BACK_Z,rearCenter=(-10.5+STORE_BACK_Z)/2;const fixtures=group(root),ceiling=group(root);fixtures.name='shopster-rear-interior';ceiling.name='shopster-rear-ceiling';
 const floorTile=storeFloorTiles(fixtures);box(fixtures,0,.2,rearCenter,38.7,.16,rearDepth,'#d5d0bf');for(let x=-19;x<20;x++)for(let z=STORE_BACK_Z+.25;z< -10.5;z++)floorTile(x,z,(Math.round(x+z*4)%3===0)?'#d7d1c4':'#e5ded0');
 for(const x of [-19.33,19.33]){box(fixtures,x,3.625,rearCenter,.12,6.95,rearDepth,'#e7e0d1');box(fixtures,x,6.145,rearCenter,.14,.75,rearDepth,'#bc3038');box(fixtures,x,.43,rearCenter,.13,.25,rearDepth,'#8c928e')}
 box(fixtures,0,3.625,STORE_BACK_Z+.15,38.7,6.95,.12,'#e7e0d1');box(fixtures,0,6.145,STORE_BACK_Z+.24,38.6,.75,.08,'#bc3038');
 for(const w of STORE_ROOM_WALLS){box(fixtures,(w.minX+w.maxX)/2,3.675,(w.minZ+w.maxZ)/2,w.maxX-w.minX,6.95,w.maxZ-w.minZ,'#e3ddcf');box(fixtures,(w.minX+w.maxX)/2,6.145,(w.minZ+w.maxZ)/2,w.maxX-w.minX+.015,.75,w.maxZ-w.minZ+.015,'#bb303c')}
 const staffDoors=[];for(const d of STORE_STAFF_DOORS){box(fixtures,d.x,5.175,d.z,1.8,3.85,.2,'#e3ddcf');for(const side of [-1,1])box(fixtures,d.x+side*.91,1.76,d.z,.08,2.95,.28,'#79888b');box(fixtures,d.x,3.22,d.z,1.95,.1,.28,'#79888b');const hinge=group(root,d.x-.86,0,d.z);box(hinge,.86,1.76,0,1.68,2.85,.09,'#7f9195');box(hinge,.86,2.18,.065,.48,.65,.025,'#b0c6c5');box(hinge,1.5,1.5,.1,.08,.2,.06,'#e7d2a0');staffDoors.push({...d,hinge});}

 for(const f of STORE_REAR_FIXTURES)if(f.kind==='clothing')clothes(fixtures,f);else rack(fixtures,f);
 for(const f of STORE_ENDCAPS.filter(f=>f.z< -10.5))storeEndcap(fixtures,f);
 for(const f of STORE_BACKROOM_FIXTURES)employeeFixture(fixtures,f);
 const backProps=group(fixtures);const propZ=z=>storePlanZ(z< -10?z-21-EXT:employeeRoomZ(z-21));const backBox=(x,y,z,...dimensions)=>box(backProps,x*1.3,y,propZ(z),...dimensions);
 // Receiving roller shutter matches the exterior loading dock; pallet jack stays against the wall.
 backBox(-11.2,1.6,-10.25,5.2,2.5,.08,'#8b999b');for(let k=0;k<11;k++)backBox(-11.2,.42+k*.23,-10.19,5.05,.025,.025,'#b0b8b2');for(const x of [-13.9,-8.5])backBox(x,.8,-10.03,.12,1,.12,'#e1b948');
 const jack=group(backProps,-8.55*1.3,.28,propZ(-9.15));for(const x of [-.22,.22])box(jack,x,.15,.1,.12,.15,.95,'#dfb742');box(jack,0,.6,-.35,.07,1,.07,'#5c6f75');box(jack,0,1.11,-.35,.5,.08,.09,'#4c5e66');
 // Corkboard, a clock, vending machines and water cooler finish the employee area.
 backBox(11.9,2.7,-10.22,1.15,.75,.08,'#9f7c50');for(let i=0;i<5;i++)backBox(11.5+i*.18,2.7+(i%2)*.12,-10.15,.15,.28,.02,palette[i]);backBox(14.65,2.65,-8.7,.08,.55,.55,'#bb303c');backBox(14.59,2.65,-8.7,.03,.43,.43,'#e9e5d5');backBox(14.56,2.7,-8.7,.02,.17,.04,'#53666e');
 const vending=group(backProps,14.45*1.3,0,propZ(-9.25));vending.rotation.y=-Math.PI/2;box(vending,0,1.35,0,.6,2,.48,'#bb303c');box(vending,0,1.52,.26,.45,1.2,.025,'#4c6d7a');for(let i=0;i<8;i++)box(vending,-.12+(i%2)*.24,1.1+Math.floor(i/2)*.26,.285,.12,.17,.04,palette[i%5]);
 backBox(9.98,.75,-7.45,.48,.9,.45,'#dedbcf');backBox(9.98,1.45,-7.45,.34,.5,.32,'#86b6c4');
 box(ceiling,0,7.225,rearCenter,38.6,.14,rearDepth,'#b9b4ab');const glow=new THREE.MeshStandardMaterial({color:'#fff9e9',emissive:'#fff4d7',emissiveIntensity:.9});glow.userData.owned=true;for(let x=-16;x<=16;x+=4)for(const z of [-11.7,-16.7,-21.7,-26.7,-31.7,-36.7,-40.5]){box(ceiling,x,7.105,z,1.4,.12,1.1,'#d8d3c5');box(ceiling,x,7.025,z,1.25,.045,.95,'#fff9e9').material=glow}
 for(const x of [-16,16])for(const z of [-22,-39])storeCeilingSpeaker(ceiling,x,z);
 const lights=[];for(const x of [-14,0,14])for(const z of [-22,storePlanZ(employeeRoomZ(-29))]){const l=new THREE.PointLight('#fff0d6',38,22,1.6);l.position.set(x,6.095,z);l.visible=false;root.add(l);lights.push(l)}
 return {fixtures,ceiling,lights,staffDoors};
}
