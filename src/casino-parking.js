import {box,group} from './models.js';
import {CASINO_CENTER} from './casino-model.js';
export const CASINO_PARKING=[{name:'front',minX:-35.7,maxX:-23.3,minZ:-10.7,maxZ:-.1,spaces:[-32.1,-27.2,-24.7],rowZ:-7.1},{name:'rear',minX:-35.7,maxX:-23.3,minZ:-27,maxZ:-18.5,spaces:[-34,-31.7,-29.4,-27.1,-24.8],rowZ:-24}];
function parkedCar(parent,x,z,color,angle=0){const g=group(parent,x,.085,z);g.rotation.y=angle;g.name='casino-parked-car';box(g,0,.42,0,1.45,.55,2.85,color);box(g,0,.87,-.05,1.22,.47,1.55,color);box(g,0,.88,.75,1.06,.32,.035,'#548391');box(g,0,.88,-.85,1.06,.32,.035,'#426a7a');for(const side of [-1,1]){box(g,side*.63,.89,-.05,.025,.3,1.35,'#426a7a');for(const p of [-.92,.92])box(g,side*.72,.27,p,.2,.48,.46,'#262d36');box(g,side*.47,.49,1.44,.25,.14,.035,'#e8db9a');box(g,side*.47,.49,-1.44,.25,.14,.035,'#ba4551')}box(g,0,.3,1.46,1.23,.12,.08,'#a3a6a2');return g}
export function buildCasinoParking(parent){const root=group(parent);root.name='casino-parking';let count=0;
 for(const lot of CASINO_PARKING){box(root,(lot.minX+lot.maxX)/2,.055,(lot.minZ+lot.maxZ)/2,lot.maxX-lot.minX,.12,lot.maxZ-lot.minZ,'#394149');
  for(const x of lot.spaces){for(const edge of [-1.07,1.07])box(root,x+edge,.124,lot.rowZ,.06,.012,3.95,'#e5d5a5');box(root,x,.125,lot.rowZ-2,2.16,.012,.06,'#e5d5a5');box(root,x,.2,lot.rowZ-1.63,1.25,.16,.15,'#bdb9a0')}
  lot.spaces.forEach((x,i)=>{if(lot.name==='front'&&i===2||lot.name==='rear'&&i===1)return;parkedCar(root,x,lot.rowZ,['#a44750','#527f98','#e0c27e','#5c8a75','#92789e'][count++%5])});
 }
 // West-side access lane links the rear lot to the street without crossing the entrance walk.
 box(root,-34.9,.059,-10.95,1.6,.12,21.7,'#394149');
 const front=CASINO_CENTER.z+5.45*.64,walkEnd=1.4;box(root,CASINO_CENTER.x,.13,(front+walkEnd)/2,1.8,.18,walkEnd-front,'#d8d3bb');
 for(let z=-3.5;z<0;z+=.55)box(root,-34.9,.13,z,1.1,.012,.2,'#d7c99e');
 root.userData.parkedCars=count;return root;
}
