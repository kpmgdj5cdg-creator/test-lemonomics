import * as THREE from 'three';
import {box,group,label,batch,bench,lamp} from './models.js';
import {palm,chalkboard} from './street-details.js';
import {voxelText} from './voxel-text.js';

function cabana(parent,x,z,{wall,roof,trim='#fff0cf'}){
  const g=group(parent,x,.05,z);
  box(g,0,.12,0,3.05,.24,2.7,'#b4925f');box(g,0,1.43,0,2.7,2.5,2.3,wall);
  for(let i=0;i<9;i++)box(g,-1.2+i*.3,1.44,1.18,.035,2.4,.03,trim);
  box(g,0,1.3,1.23,.94,2.2,.12,trim);box(g,0,1.3,1.31,.72,1.98,.04,'#275d70');
  for(const x of [-1.32,1.32])box(g,x,1.45,1.2,.12,2.5,.15,trim);
  for(let i=0;i<7;i++)box(g,0,2.75+i*.17,0,3.15,.22,2.7-i*.35,roof);
  box(g,0,.09,1.6,1.22,.16,.65,'#d4b889');
  box(g,1.4,1.5,.1,.09,.95,.85,trim);box(g,1.46,1.5,.1,.03,.75,.66,'#3d8ca1');
  return g;
}
function lifeguard(parent,x,z){
  const g=group(parent,x,0,z);
  for(const px of [-1.12,1.12])for(const pz of [-.85,.85])box(g,px,.66,pz,.18,1.35,.18,'#b68952');
  box(g,0,1.34,0,3.3,.2,2.65,'#d4b47d');box(g,0,2.4,-.24,2.5,2,1.8,'#f1e2be');
  for(const px of [-1.2,1.2])box(g,px,2.4,-.24,.1,1.94,1.85,'#e68a6b');
  box(g,0,2.6,.7,2.14,.7,.07,'#337b90');box(g,0,2.6,.75,.08,.76,.04,'#ffefc9');
  box(g,0,1.97,.72,2.42,.3,.09,'#df7852');voxelText(g,'RESCUE',0,1.99,.8,.29,'#fff1bf');
  for(let i=0;i<6;i++)box(g,0,3.5+i*.14,-.18,3.25,.19,2.7-i*.42,'#df7852');
  for(const px of [-1.5,1.5]){for(let i=0;i<5;i++)box(g,px,1.7,-1+i*.48,.07,.66,.07,'#fff0ce');box(g,px,2.05,0,.1,.09,2.4,'#fff0ce');}
  for(let i=0;i<5;i++)box(g,0,.15+i*.26,2.7-i*.28,.9,.14,.42,'#c6a16b');
  box(g,1.32,4.08,-.35,.07,2,.07,'#d8e2cc');box(g,1.72,4.74,-.35,.75,.42,.06,'#e76455');
  box(g,-1.3,2.3,.6,.38,.38,.1,'#eea354');box(g,-1.3,2.3,.67,.18,.18,.04,'#fff0cf');
}
function umbrella(parent,x,z,color){
  const g=group(parent,x,0,z);box(g,0,1.14,0,.075,2.28,.075,'#c6a06d');
  for(let level=0;level<4;level++){
    const size=2.5-level*.56;box(g,0,2.04+level*.16,0,size,.18,size,level%2?'#fff1d0':color);
  }
  // A pair of recliners with raised backs, rather than flat painted icons.
  for(const px of [-.78,.78]){
    box(g,px,.32,.85,.56,.14,1.2,'#fbefd0');const back=box(g,px,.62,.3,.56,.12,.72,color);back.rotation.x=-.6;
    for(const pz of [.4,1.25])box(g,px,.15,pz,.5,.28,.07,'#bd945e');
  }
}
function surfRack(parent,x,z){
  const g=group(parent,x,0,z);
  for(const px of [-.8,.8])box(g,px,.65,0,.12,1.3,.12,'#b68a54');box(g,0,1.1,0,1.9,.12,.12,'#c59c63');
  for(const [i,color] of ['#e98d77','#62b6b5','#e6bc53'].entries()){
    const board=group(g,-.58+i*.58,0,.2);board.rotation.z=(i-1)*.06;
    box(board,0,1.05,0,.43,1.65,.12,color);box(board,0,1.96,0,.29,.22,.12,color);box(board,0,2.1,0,.14,.1,.1,color);box(board,0,1.08,.075,.07,1.6,.02,'#fff0c8');
  }
}
function boat(parent,x,z){
  const g=group(parent,x,-.13,z);g.rotation.y=-.2;g.name='anchored-boat';
  box(g,0,.08,0,3.4,.42,1.45,'#e4a758');box(g,0,.35,0,3.55,.15,1.55,'#f5e2b2');
  box(g,1.72,.15,0,.38,.33,1.1,'#e4a758');box(g,1.99,.15,0,.2,.3,.65,'#e4a758');
  box(g,-.55,.83,0,1.25,.85,1.07,'#f8ebce');box(g,-.55,.92,.56,.98,.45,.04,'#337d97');
  box(g,-.55,1.33,0,1.48,.16,1.28,'#458fa1');box(g,-.55,1.7,0,.07,.67,.07,'#d3e0d2');
  for(const px of [-1.4,1.35])box(g,px,.65,.66,.06,.62,.06,'#dce3d0');box(g,0,.96,.66,2.8,.06,.06,'#dce3d0');
  // Merge before the environment is batched so the hull keeps its own transform.
  batch(g);return g;
}
export function waveHeight(x,z,time){
  const shore=Math.min(1,Math.max(0,(z-4)/4));
  if(!shore)return 0;
  return shore*(Math.sin(z*1.15-time*1.65+x*.14)*.095+Math.sin(x*.65+z*.48-time*.92)*.045);
}
function ocean(parent){
  const geometry=new THREE.PlaneGeometry(150,72,75,36);geometry.rotateX(-Math.PI/2);geometry.translate(0,0,40);
  const colors=[],p=geometry.attributes.position;
  for(let i=0;i<p.count;i++){const depth=Math.min(1,Math.max(0,(p.getZ(i)-5)/20)),c=new THREE.Color('#68c9bf').lerp(new THREE.Color('#1686ac'),depth);colors.push(c.r,c.g,c.b)}
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.38,metalness:.12,flatShading:true});material.userData.owned=true;
  const mesh=new THREE.Mesh(geometry,material);mesh.name='moving-ocean';mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
export function buildWaterfront(g,rival){
  // Sand ends at the shoreline; the ocean remains separate for weather and routing.
  box(g,0,-.24,-37.5,150,.48,83,'#efd6a2');
  box(g,0,-.43,40,150,.5,72,'#478b99');
  const surface=ocean(g);
  // Discrete sand patches and shell pebbles keep the beach geometric and quiet.
  for(let i=0;i<95;i++){
    const x=((i*79)%470)/10-23.5,z=-1-((i*97)%180)/10;
    box(g,x,.006,z,.35+(i%3)*.15,.014,.27,i%2?'#e6c993':'#f4dfb1');
  }
  for(const x of [-17,3.8,17])for(let z=-24;z<0;z+=.75)box(g,x,.006,z,1.25,.016,.72,'#e3c48f');
  // The stand and rival both occupy raised platforms beside the promenade.
  for(const x of [-3,rival.x]){
    box(g,x,.065,-.8,4.6,.18,3.9,'#a88252');for(let i=0;i<16;i++)box(g,x-2.15+i*.287,.162,-.8,.263,.02,3.8,i%2?'#cba56f':'#bf965f');
  }
  for(let x=-35;x<35;x+=.3)box(g,x,.1,1.05,.277,.17,2.2,Math.round((x+35)*10)%2?'#cba974':'#c19d65');
  for(const z of [-.12,2.22])box(g,0,.065,z,70,.14,.13,'#9c784d');
  // A long wooden pier provides a real pedestrian arrival route over the water.
  for(let z=1.2;z<23.6;z+=.3)box(g,7.4,.1,z,2.6,.17,.277,Math.round(z*10)%2?'#c7a16c':'#bd935d');
  for(let z=3;z<24;z+=1.5)for(const x of [6,8.8]){box(g,x,-.05,z,.18,2.3,.18,'#92704b');box(g,x,1.14,z,.25,.14,.25,'#e3c18b');}
  for(const x of [6,8.8]){box(g,x,1.04,13,.13,.13,21,'#d9ba86');box(g,x,.61,13,.09,.1,21,'#b58e5d');}
  for(const x of [-8.3,2.8])for(let i=0;i<3;i++)box(g,x,.12-i*.05,2.4+i*.26,1.3,.1,.32,'#bf9b65');
  lifeguard(g,-10,-6.6);
  cabana(g,-3.5,-10.2,{wall:'#4eafbd',roof:'#257f90'});cabana(g,.1,-10.2,{wall:'#ecae96',roof:'#c96e72'});
  umbrella(g,-5.3,-5.4,'#de8f8d');umbrella(g,9.4,-8.7,'#74b9b3');
  surfRack(g,5.4,-3.8);const anchoredBoat=boat(g,-6.5,12.8);
  // A stationary anchor buoy makes the fixed mooring clear without tying it to shore.
  box(g,-8.6,-.02,12.8,.26,.3,.26,'#eeb65a');
  for(const [x,z,s] of [[-14,-2.8,1.15],[-7,-13.8,1.2],[5.7,-9.3,1.1],[15,-5.4,1.1],[20,-12,1.3]])palm(g,x,z,s);
  // Dune grass, beach seating, pier lamps, and small working waterfront details.
  for(const [x,z] of [[-12,-2.9],[-1,-5.4],[10,-5.5],[19,-1]])for(let i=0;i<5;i++)box(g,x-.35+i*.18,.2+(i%2)*.08,z,.09,.38+(i%2)*.16,.1,'#799e58');
  box(g,.8,.03,-1.85,2.3,.18,1.2,'#b4925f');box(g,-11.8,.03,-1.7,1.2,.18,2.3,'#b4925f');
  bench(g,.8,-1.85);bench(g,-11.8,-1.7,Math.PI/2);lamp(g,-7,.02);lamp(g,9.2,1.9);lamp(g,8.35,10);
  for(const x of [-7.3,15.1]){box(g,x,.48,-.6,.52,.92,.5,'#559a98');box(g,x,.98,-.6,.59,.1,.58,'#387776');}
  const sign=group(g,-6.5,0,-2.25);for(const x of [-1.2,1.2])box(sign,x,.95,0,.13,1.9,.13,'#ad8552');box(sign,0,1.65,0,2.9,.72,.18,'#347f90');voxelText(sign,'MAPLE BAY',0,1.68,.16,.34,'#fff0c3');
  chalkboard(g,-5.4,-.02);
  const plot=label(g,'SEASIDE PITCH',rival.x,.191,-.8,2.5,.45,{background:'#cba974',color:'#685a3f',size:70});plot.rotation.x=-Math.PI/2;
  // Foam bars are merged per band so the surf needs only seven transforms.
  const surf=group(g);
  for(let row=0;row<7;row++){
    const band=group(surf,0,0,4.2+row*2.3);band.userData.baseZ=band.position.z;
    for(let i=0;i<37;i++)if((i+row)%4!==0)box(band,-28+i*1.6,-.035,((i*7)%5)*.12,.65+(i%3)*.3,.045,.13,row?'#a7e3d7':'#e8f3dc');
    batch(band);
    for(const mesh of band.children)if(mesh.isMesh)mesh.castShadow=false;
  }
  const result={plotLabel:plot,surf,surface,boat:anchoredBoat};animateWaterfront(result,0,false);return result;
}
export function animateWaterfront(waterfront,time,reduced){
  const t=reduced?0:time;
  if(waterfront.lastTime===t)return;waterfront.lastTime=t;
  const p=waterfront.surface.geometry.attributes.position;
  for(let i=0;i<p.count;i++)p.setY(i,-.095+waveHeight(p.getX(i),p.getZ(i),t));
  p.needsUpdate=true;waterfront.surface.geometry.computeVertexNormals();
  waterfront.surf.children.forEach((band,i)=>{band.position.z=band.userData.baseZ+Math.sin(t*.75+i)*.55;band.position.y=waveHeight(0,band.position.z,t)+.025;});
  const b=waterfront.boat,x=b.position.x,z=b.position.z;b.position.y=-.13+waveHeight(x,z,t);
  const forwardX=Math.sin(b.rotation.y),forwardZ=Math.cos(b.rotation.y),rightX=forwardZ,rightZ=-forwardX;
  b.rotation.x=Math.atan2(waveHeight(x-forwardX*.7,z-forwardZ*.7,t)-waveHeight(x+forwardX*.7,z+forwardZ*.7,t),1.4);
  b.rotation.z=Math.atan2(waveHeight(x+rightX*1.2,z+rightZ*1.2,t)-waveHeight(x-rightX*1.2,z-rightZ*1.2,t),2.4);
}
