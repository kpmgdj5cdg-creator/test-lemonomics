import {box,group,label,tree,bush,bench,lamp,fence} from './models.js';
import {planter,chalkboard} from './street-details.js';
import {voxelText} from './voxel-text.js';

function picnic(parent,x,z){
  const g=group(parent,x,.1,z);
  for(let i=0;i<4;i++)box(g,0,.94,-.39+i*.26,2.1,.11,.23,'#c48c4b');
  for(const px of [-.7,.7]){box(g,px,.48,0,.15,.9,.75,'#667b61');for(const pz of [-.85,.85])box(g,px,.25,pz,.15,.5,.25,'#667b61');}
  for(const pz of [-.85,.85])box(g,0,.55,pz,2.3,.13,.4,'#d1a265');
}
function gazebo(parent,x,z){
  const g=group(parent,x,.1,z);
  box(g,0,.15,0,5.6,.3,4.7,'#bdc8b2');box(g,0,.35,0,5.1,.15,4.2,'#e4cc97');
  for(let i=0;i<13;i++)box(g,-2.4+i*.4,.45,0,.37,.06,4,'#c6a16c');
  for(const px of [-2.25,2.25])for(const pz of [-1.8,1.8]){box(g,px,1.85,pz,.19,2.8,.19,'#fff1ce');box(g,px,3.1,pz,.38,.16,.38,'#eed8ab');}
  for(const pz of [-1.8,1.8])box(g,0,3.17,pz,4.9,.18,.2,'#e8cb95');
  for(let i=0;i<8;i++)box(g,0,3.34+i*.18,0,5.8-i*.44,.24,4.8-i*.47,i%2?'#268b8c':'#20787f');
  box(g,0,4.83,0,.52,.3,.52,'#f2cb69');
  // Open front, railings on the back and sides.
  for(let i=0;i<12;i++)box(g,-2.2+i*.4,1.02,-1.82,.1,1.05,.1,'#ffedc5');
  box(g,0,1.55,-1.82,4.7,.12,.16,'#ffedc5');
  for(const px of [-2.25,2.25]){for(let i=0;i<8;i++)box(g,px,1.02,-1.6+i*.45,.1,1.05,.1,'#ffedc5');box(g,px,1.55,0,.16,.12,3.6,'#ffedc5');}
  box(g,0,.15,2.5,2.5,.28,.8,'#d8c8a1');
}
function playground(parent,x,z){
  const g=group(parent,x,.1,z);
  box(g,0,.04,0,5.6,.1,4.4,'#d7b97d');
  for(const px of [-2,1.1])for(const pz of [-1,1]){const leg=box(g,px,1.5,pz,.13,3,.13,'#367a9c');leg.rotation.x=pz>0?-.13:.13;}
  box(g,-.45,3,0,3.6,.18,.17,'#f0ac47');
  for(const px of [-1.15,.15]){for(const chain of [-.26,.26])box(g,px+chain,1.88,0,.035,2.1,.035,'#778f89');box(g,px,.8,0,.72,.13,.5,'#df735b');}
  // A small slide and its block-built access steps.
  for(let i=0;i<6;i++)box(g,2.13,.2+i*.25,-1.6+i*.29,.7,.2,.37,'#68ada6');
  const slide=box(g,2.13,.9,1.05,.65,.11,2.2,'#edb84d');slide.rotation.x=.6;
  for(const xx of [1.77,2.49]){const edge=box(g,xx,1.02,1.05,.09,.2,2.2,'#e78045');edge.rotation.x=.6;}
}
export function buildPark(g,rival){
  box(g,0,-.23,0,150,.4,150,'#50a45c');
  const tiles=['#e7d5ae','#efdfbb','#d9c6a1'];
  // A connected footpath loop with six distant entrances, shared by traffic routes.
  for(const z of [1.05,7.1])for(let x=-35;x<35;x+=.8){box(g,x,.055,z,.78,.16,2.7,tiles[(Math.round(x*5)+300)%3]);for(const edge of [-1.4,1.4])box(g,x,.1,z+edge,.78,.14,.14,'#eee8cc');}
  for(const x of [-17,6.8])for(let z=-30;z<25;z+=.8){box(g,x,.055,z,2.7,.16,.78,tiles[(Math.round(z*5)+300)%3]);for(const edge of [-1.4,1.4])box(g,x+edge,.1,z,.14,.14,.78,'#eee8cc');}
  // Stepped pond banks and a small fountain are entirely modeled in 3D.
  const pond=group(g,-5,0,-7.5);
  box(pond,0,.01,0,7.6,.17,4.6,'#a7b99c');box(pond,0,.02,0,6.5,.18,5.8,'#a7b99c');
  box(pond,0,.12,0,7.15,.12,4.1,'#31a1b1');box(pond,0,.12,0,6.1,.12,5.3,'#31a1b1');
  box(pond,0,.2,0,5.4,.035,3.5,'#41b7c5');
  for(let i=0;i<12;i++){const x=-3.5+i*.64;for(const z of [-2.3,2.3])box(pond,x,.27,z,.58,.26,.38,'#d7dfca');}
  for(let i=0;i<7;i++)for(const x of [-3.8,3.8])box(pond,x,.27,-1.8+i*.6,.4,.26,.56,'#bdcbb6');
  box(pond,0,.38,0,1,.45,1,'#d7dfcc');box(pond,0,.85,0,.42,.7,.42,'#bbcec1');box(pond,0,1.25,0,1.1,.18,1.1,'#d8e5d5');box(pond,0,1.4,0,.65,.15,.65,'#6ecbd3');
  for(const x of [-.42,.42])for(const z of [-.42,.42])box(pond,x,.86,z,.08,.68,.08,'#9ce1dd');
  for(let i=0;i<7;i++)box(pond,-2.5+i*.75,.19,1.1+(i%2)*.35,.28,.03,.16,'#8cddce');
  gazebo(g,2,-9.5);playground(g,-12,-6.3);picnic(g,-11,10);picnic(g,11,-8.5);
  // Broad canopies frame the focal stand without blocking the pond or paths.
  for(const [x,z,s] of [[-14,-11,1.8],[-9,-13.1,1.7],[-.8,-15,1.6],[11,-13,1.7],[13,-3.9,1.45],[-14.5,-1.5,1.2],[2.2,11,1.45],[-12,12.5,1.45]])tree(g,x,z,s,Math.round(x)%2);
  planter(g,-8,-1.8,2.6);planter(g,1.4,-1.8,2.5);planter(g,12,4.2,3);
  bench(g,.8,-1.8);bench(g,-9,-3,Math.PI);bench(g,-4,9.5,Math.PI);bench(g,10.5,4.2,Math.PI);
  lamp(g,-10,.15);lamp(g,5.1,-3.8);lamp(g,5.1,6.7);lamp(g,-15.3,6.7);
  fence(g,-19,-13,23);fence(g,-19,-13,11,'z');
  for(let i=0;i<18;i++){const x=-14+i*.38;box(g,x,.22,-2.25,.22,.36,.2,'#267a43');box(g,x,.46,-2.25,.24,.21,.22,i%3===0?'#f4cf54':i%3===1?'#ed8a97':'#a49bdd');}
  // An entrance sign, bins and a bike rack give the park a clear identity.
  const sign=group(g,-10,-.05,-1.3);for(const x of [-1.5,1.5])box(sign,x,1,0,.16,2,.16,'#7e653d');box(sign,0,1.8,0,3.6,.9,.2,'#245d47');voxelText(sign,'MAPLE PARK',0,1.85,.17,.43,'#ffe7a2');
  for(const x of [-8.8,10.7]){box(g,x,.53,-.65,.52,1,.5,'#286d61');box(g,x,1.06,-.65,.6,.1,.58,'#214f47');}
  for(let i=0;i<4;i++){box(g,3.8+i*.48,.43,4.7,.08,.8,.08,'#a9bdb1');box(g,3.8+i*.48,.85,4.95,.08,.08,.6,'#a9bdb1');}
  chalkboard(g,-5.4,-.02);
  // Same stand anchors let upgrades, queues, and the future competitor keep working.
  box(g,rival.x,.07,rival.z,3.8,.1,3.3,'#a4bd8d');
  const plot=label(g,'ROOM TO GROW',rival.x,.14,rival.z,2.5,.45,{background:'#a4bd8d',color:'#42643e',size:70});plot.rotation.x=-Math.PI/2;
  return plot;
}
