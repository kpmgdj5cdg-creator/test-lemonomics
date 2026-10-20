import {box,group,label} from './models.js';
import {voxelText} from './voxel-text.js';

export function palm(parent,x,z,scale=1){
  const g=group(parent,x,.1,z);g.scale.setScalar(scale);
  box(g,0,.13,0,1.9,.26,1.9,'#eef2dc');box(g,0,.28,0,1.55,.12,1.55,'#294f43');
  for(let i=0;i<9;i++)box(g,Math.sin(i*.14)*.14,.48+i*.36,0,.31,.37,.33,i%2?'#ae753d':'#966037');
  for(let arm=0;arm<7;arm++){const leaf=group(g,.14,3.7,0);leaf.rotation.y=arm*Math.PI*2/7;
    for(let j=0;j<5;j++){const width=(j===0?.42:j===4?.3:.68);box(leaf,0,-j*j*.055,.22+j*.34,width,.15,.44,j<2?'#278c54':'#156744');}
  }box(g,.12,3.63,0,.44,.35,.44,'#4e7b38');
}
export function planter(parent,x,z,length=2.5){box(parent,x,.23,z,length,.46,.9,'#e9efdd');box(parent,x,.48,z,length-.22,.08,.66,'#234c3c');for(let i=0;i<length/.35;i++)box(parent,x-length/2+.28+i*.34,.72,z,.38,.46,.55,i%2?'#2c9355':'#26854a')}
export function market(parent,x,z){
  const g=group(parent,x,.15,z),w=5.4;
  box(g,0,.12,0,5.8,.25,4.3,'#c4d0b9');box(g,0,2,0,w,3.9,3.8,'#126cba');box(g,0,.5,1.94,w,.5,.15,'#184a8b');
  box(g,0,4.02,0,w+.4,.24,4.1,'#f9ead9');box(g,0,4.24,-1.8,w+.4,.3,.23,'#1777bb');
  for(const a of [-w/2,w/2])box(g,a,4.24,0,.22,.3,3.8,'#1777bb');
  box(g,0,4.25,1.9,w+.55,.7,.27,'#174674');
  voxelText(g,'MAPLE MARKET',0,4.35,2.08,.44,'#f498bb');
  for(const wx of [-1.7,1.7]){box(g,wx,1.9,1.97,1.38,1.95,.16,'#f4efe0');box(g,wx,1.9,2.07,1.12,1.65,.04,'#12496c');box(g,wx-.27,2.03,2.1,.13,1.26,.02,'#348fa8');box(g,wx,1.9,2.12,.06,1.67,.04,'#c2dcd3');box(g,wx,1.9,2.12,1.15,.07,.04,'#c2dcd3');}
  box(g,0,1.39,1.99,.96,2.5,.16,'#f1ebdb');box(g,0,1.45,2.1,.75,2.16,.05,'#204c65');box(g,0,1.7,2.14,.6,1.42,.02,'#469cab');box(g,.27,1.3,2.17,.05,.21,.05,'#f2b960');
  for(let i=0;i<12;i++){const a=box(g,-2.7+(i+.5)*.45,3.08,2.33,.45,.13,.9,i%2?'#fff3db':'#236c90');a.rotation.x=.16;box(g,-2.7+(i+.5)*.45,2.9,2.78,.45,.24,.08,i%2?'#fff3db':'#236c90');}
  // Rooftop air conditioner, louvered side wall, parcel stack, and a shop bench.
  box(g,.9,4.45,-.5,1.2,.7,.95,'#d0d7cb');for(let i=0;i<5;i++)box(g,.45+i*.21,4.81,-.5,.09,.02,.7,'#4e6e6c');
  for(let i=0;i<5;i++)box(g,2.73,1.8+i*.17,.2,.08,.08,1.2,'#0d518d');
  for(let i=0;i<3;i++){box(g,-2.3+(i%2)*.65,.3+Math.floor(i/2)*.56,2.95,.58,.56,.55,'#b98347');box(g,-2.3+(i%2)*.65,.59+Math.floor(i/2)*.56,2.95,.12,.02,.55,'#dfbc82');}
  box(g,1.85,.63,2.97,1.38,.14,.52,'#dfb66c');for(const xx of [1.35,2.35])box(g,xx,.34,2.97,.12,.58,.42,'#314d46');
  return g;
}
export function chalkboard(parent,x,z){
  const g=group(parent,x,.12,z);for(const a of [-.38,.38])box(g,a,.65,0,.09,1.3,.12,'#ab703d');box(g,0,.89,0,.92,.91,.13,'#c49959');
  label(g,'FRESH\nLEMONADE\nMADE WITH LOVE',0,.9,.08,.75,.74,{background:'#214940',color:'#f8e6a9',size:75});
  const rear=box(g,0,.55,-.37,.84,1.1,.07,'#7c5737');rear.rotation.x=.35;
}
