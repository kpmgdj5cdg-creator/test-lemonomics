import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { voxelText } from './voxel-text.js';
import {classicStand} from './classic-stand.js';
import {createSpeaker} from './speaker.js';

const materials=new Map();
export function material(color){
  if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.85,metalness:0}));
  return materials.get(color);
}
const cube=new THREE.BoxGeometry(1,1,1);
export function box(parent,x,y,z,w,h,d,color){
  const m=new THREE.Mesh(cube,material(color));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
export function group(parent,x=0,y=0,z=0){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g}
export function label(parent,text,x,y,z,w,h,{background='#fff6cc',color='#385438',size=60}={}){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=Math.round(768*h/w);
  const c=canvas.getContext('2d');c.fillStyle=background;c.fillRect(0,0,canvas.width,canvas.height);c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';c.font=`800 ${size}px Trebuchet MS, sans-serif`;
  const lines=text.split('\n');lines.forEach((line,i)=>c.fillText(line,384,canvas.height/2+(i-(lines.length-1)/2)*size*1.25,720));
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:texture,roughness:.9}));m.position.set(x,y,z);parent.add(m);return m;
}
/** Merge static cubes by material to keep draw calls low on integrated graphics. */
export function batch(parent){
  parent.updateMatrixWorld(true);const inverse=parent.matrixWorld.clone().invert(),sets=new Map(),remove=[];
  parent.traverse(o=>{if(o.isMesh&&o.geometry===cube){const g=cube.clone();g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld));if(!sets.has(o.material))sets.set(o.material,[]);sets.get(o.material).push(g);remove.push(o)}});
  remove.forEach(m=>m.removeFromParent());
  for(const [mat,parts] of sets){const mesh=new THREE.Mesh(mergeGeometries(parts),mat);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);parts.forEach(g=>g.dispose())}
}
export function disposeGroup(g){g.traverse(o=>{if(o.isMesh){if(o.geometry!==cube)o.geometry.dispose();if(o.material.map){o.material.map.dispose();o.material.dispose()}else if(o.material.userData.owned)o.material.dispose()}});g.removeFromParent()}

export function tree(parent,x,z,scale=1,variant=0){
  const g=group(parent,x,.12,z);g.scale.setScalar(scale);
  box(g,0,1.15,0,.37,2.3,.37,'#997350');box(g,.33,1.5,0,.8,.24,.23,'#997350');
  const colors=variant?['#438d42','#246535','#68a548']:['#217449','#2a9853','#54af58'];
  box(g,0,2.6,0,1.8,1.4,1.65,colors[0]);box(g,-.62,2.35,.12,.95,.9,1.3,colors[1]);box(g,.55,2.9,-.1,1.1,1.15,1.25,colors[1]);box(g,-.12,3.35,-.12,1.25,.55,1.15,colors[2]);box(g,.15,2.65,.8,1.45,.85,.5,colors[0]);
  box(g,0,.08,0,.75,.16,.75,'#799a54');
}
export function bush(parent,x,z,w=1.3){box(parent,x,.5,z,w,.75,.8,'#23794b');box(parent,x-.15,.92,z,w*.72,.25,.65,'#3d9a52')}
export function fence(parent,x,z,length,axis='x'){
  const g=group(parent,x,.12,z);if(axis==='z')g.rotation.y=-Math.PI/2;
  for(let i=0;i<=length;i+=.5)box(g,i,.64,0,.13,1.15,.14,'#f5ead0');
  for(const y of [.34,.84])box(g,length/2,y,-.04,length,.12,.13,'#e5d7b7');
}
export function house(parent,x,z,{wall='#e2b894',roof='#678e82',width=4.4}={}){
  const g=group(parent,x,.12,z);
  box(g,0,.12,0,width+.3,.24,3.8,'#acbca4');box(g,0,1.6,0,width,3.0,3.4,wall);box(g,0,.4,1.72,width,.22,.12,'#fff3dc');
  // Layered pitched roofs retain a crisp voxel silhouette.
  for(let i=0;i<8;i++)box(g,0,3.2+i*.19,0,width+.65,.23,3.95-i*.46,roof);
  box(g,width*.3,4.0,-.6,.45,1.4,.5,'#a48c79');box(g,width*.3,4.72,-.6,.58,.14,.6,'#cfbaa0');
  const window=(wx,wy)=>{box(g,wx,wy,1.735,.95,1.05,.13,'#f4ecd4');box(g,wx,wy,1.81,.75,.84,.06,'#276c88');box(g,wx-.16,wy+.03,1.85,.1,.71,.02,'#68b5c3');box(g,wx,wy,1.86,.055,.85,.03,'#fbefcf');box(g,wx,wy,1.87,.77,.05,.03,'#fbefcf');box(g,wx,wy-.57,1.82,1.1,.12,.32,'#f2e4c1')};
  window(-width*.29,1.8);window(width*.29,1.8);
  box(g,0,1.0,1.76,.8,1.8,.15,'#668778');box(g,.23,1,1.87,.07,.07,.05,'#eac66a');box(g,0,.15,2,.95,.22,.65,'#d9c9a7');box(g,0,2.2,2.0,1.4,.15,.95,roof);
  for(const px of [-.58,.58])box(g,px,1.2,2.3,.1,2.1,.1,'#f0e6c9');
  // Side window on visible right wall.
  box(g,width/2+.03,1.8,.3,.08,1.1,1.1,'#f8e9cf');box(g,width/2+.08,1.8,.3,.05,.9,.9,'#89b5b8');box(g,width/2+.12,1.8,.3,.04,.94,.06,'#f8e9cf');
  for(const xx of [-width*.29,width*.29]){box(g,xx,1.09,1.91,1,.2,.35,'#b28d69');for(let j=0;j<4;j++){box(g,xx-.36+j*.24,1.27,1.93,.18,.2,.18,'#799754');box(g,xx-.36+j*.24,1.4,1.93,.13,.12,.12,j%2?'#f1ce70':'#e49c83')}}
  return g;
}
export function bench(parent,x,z,angle=0){const g=group(parent,x,.12,z);g.rotation.y=angle;for(let i=0;i<3;i++){box(g,0,.62,-.22+i*.22,1.9,.12,.17,'#b88c5c');box(g,0,1+i*.19,-.4,1.9,.14,.1,'#b88c5c')}for(const a of [-.65,.65]){box(g,a,.33,0,.12,.65,.65,'#536956');box(g,a,.95,-.45,.1,1,.1,'#536956')}}
export function lamp(parent,x,z){box(parent,x,1.8,z,.11,3.6,.11,'#506352');box(parent,x,.25,z,.3,.5,.3,'#506352');box(parent,x,3.7,z,.48,.12,.48,'#4b5c4c');box(parent,x,3.45,z,.32,.44,.32,'#fff1b5');box(parent,x,3.16,z,.43,.12,.43,'#4b5c4c');box(parent,x,3.84,z,.23,.15,.23,'#4b5c4c')}

export function stand(parent,state,{rival=false}={}){
  const s=state.upgrades||[],owns=id=>s.includes(id),premium=owns('classic')||owns('lemonstand')||owns('castle');
  if(!rival&&owns('classic')&&!owns('lemonstand')&&!owns('castle'))return classicStand(parent,state);
  const g=group(parent),style=rival?'rival':owns('castle')?'castle':owns('lemonstand')?'lemon':'starter';
  const w=owns('castle')?4.8:premium?4.1:3.5,d=2.7;
  box(g,0,.12,0,w+.35,.24,d+.35,'#98794f');for(let i=0;i<12;i++)box(g,-w/2+w/24+i*w/12,.27,0,w/12-.025,.12,d,'#c69c64');
  const timber=rival?'#2879a2':premium?'#d18a36':'#bd7c35';
  // The walls and counter stay physical in cutaway view.
  box(g,0,.75,-d/2,w,1.05,.13,timber);
  for(const x of [-w/2+.1,w/2-.1])for(const z of [-d/2+.1,d/2-.1])box(g,x,1.57,z,.14,2.55,.14,'#795f41');
  box(g,0,.87,1.07,w-.1,1.05,.16,timber);for(let i=0;i<12;i++)box(g,-w/2+.2+i*(w-.4)/11,.87,1.17,.035,.99,.02,'#9d774b');
  box(g,0,1.44,1.03,w+.22,.17,.74,'#efd6a0');box(g,0,1.54,1.03,w+.3,.06,.8,'#f8e4b8');
  const shelfOffset=owns('fridge')?-.4:0,shelfWidth=w-.3-(owns('fridge')?.8:0);
  box(g,shelfOffset,1.04,-1.05,shelfWidth,.14,.5,'#edcf94');box(g,shelfOffset,.68,-1.09,shelfWidth-.1,.12,.43,'#c09b64');
  // Physical prep workspace, even before buying powered equipment.
  box(g,-.15,1.14,-.93,.55,.045,.3,'#9c784b');
  box(g,-.02,1.18,-.92,.31,.025,.04,'#d5d9c4');box(g,-.23,1.18,-.92,.15,.04,.06,'#6f7d60');
  box(g,.51,1.14,-1.0,.46,.07,.36,'#b2c3b8');box(g,.51,1.18,-1,.31,.01,.22,'#6e8980');box(g,.51,1.38,-1.19,.05,.35,.05,'#9aaea3');box(g,.51,1.54,-1.1,.05,.05,.2,'#9aaea3');
  box(g,-1.0,1.94,-1.32,.72,.65,.06,'#87734c');label(g,'TODAY\nFRESHLY SQUEEZED',-1,1.94,-1.28,.63,.55,{background:'#3e5c45',color:'#f7e5ab',size:61});
  for(const x of [-.42,.42]){box(g,x,.63,1.0,.66,.6,.06,'#c5a16a');box(g,x,.8,.955,.18,.04,.03,'#7e7755')}
  box(g,0,.98,1.19,w*.86,.55,.08,rival?'#edf4de':'#fff0b7');
  voxelText(g,rival?'COOL CUP':'LEMONADE',0,.98,1.25,w*.77/6.7,rival?'#216089':'#265841');
  const price=label(g,`$${Number(state.price||2.25).toFixed(2)} / CUP`,0,.61,1.19,1.5,.2,{size:58,background:rival?'#e0eff2':'#fff1a8'});
  // Empty pitcher is a basic utensil, not free inventory.
  box(g,-.77,1.81,1.05,.35,.48,.34,'#bbd6cc');box(g,-.77,2.07,1.05,.38,.07,.36,'#f2e6c8');box(g,-.54,1.83,1.05,.12,.3,.12,'#bbd6cc');
  const roof=group(g);const stripe=rival?'#248cc0':premium?'#f6b61c':'#f2bc25';
  for(let i=0;i<10;i++){const x=-w/2-.25+(i+.5)*(w+.5)/10;for(const z of [-.77,.77]){const m=box(roof,x,2.99-Math.abs(z)*.18,z,(w+.5)/10+.01,.13,1.61,i%2?'#fff0c5':stripe);m.rotation.x=z>0?.18:-.18}box(roof,x,2.68,1.57,(w+.5)/10,.27,.1,i%2?'#fff0c5':stripe)}
  // Chunky freestanding lettering and a sculpted lemon distinguish the new voxel build.
  box(roof,0,3.27,-.1,w+.25,.62,.23,rival?'#16527a':'#17573f');
  voxelText(roof,rival?'COOL CUP':'LEMONADE',0,3.29,.08,(w-.2)/6.7,rival?'#f0b7d2':'#ffe36b');
  box(roof,0,3.88,-.1,.65,.38,.35,'#ffcd2c');box(roof,-.36,3.88,-.1,.14,.2,.24,'#edaa15');box(roof,.36,3.88,-.1,.14,.2,.24,'#ffdb3b');box(roof,.12,4.15,-.1,.34,.14,.16,'#3b9147');
  if(premium){box(roof,0,3.17,0,w*.65,.55,.16,'#f9e5ad');label(roof,'LEMONADE',0,3.17,.09,w*.6,.4,{background:'#f9e5ad',size:74})}
  if(owns('lemonstand')){box(roof,0,3.75,0,.8,.64,.35,'#f3cc3d');box(roof,.42,4.08,0,.38,.12,.2,'#70934b')}
  if(owns('shade')){for(const x of [-w/2,w/2])box(g,x,2.4,2.1,.1,1.4,.1,'#7b7351');for(let i=0;i<8;i++)box(roof,-w/2+(i+.5)*w/8,2.78,2.15,w/8,.11,1.2,i%2?'#fff1c4':'#e8ba43')}
  if(owns('castle')){for(const x of [-w/2,w/2]){box(g,x,1.5,0,.5,2.8,2.4,'#c1c7a2');box(roof,x,3.15,0,.7,.25,2.6,'#dbe0b9');for(let z=-1;z<=1;z+=.5)box(roof,x,3.43,z,.7,.35,.26,'#dbe0b9')}}
  const equipment=group(g);equipment.userData.ids=[];
  const equip=(id,build)=>{if(owns(id)){const item=group(equipment);item.name=id;build(item);equipment.userData.ids.push(id)}};
  equip('juicer',e=>{box(e,-1.1,1.3,-.9,.38,.44,.35,'#e3c15a');box(e,-1.1,1.58,-.9,.18,.16,.18,'#eee5cc');box(e,-1.1,1.69,-.9,.08,.1,.08,'#d9ac38')});
  equip('powerjuicer',e=>{box(e,-.5,1.35,-.95,.42,.53,.38,'#c5d5c6');box(e,-.5,1.75,-.95,.28,.3,.3,'#e9cb54');box(e,-.5,1.97,-.95,.35,.1,.35,'#708475');box(e,-.5,1.4,-.72,.09,.1,.05,'#577c5a')});
  equip('register',e=>{box(e,1.1,1.7,1.02,.52,.26,.4,'#66877a');box(e,1.1,1.91,1.02,.44,.18,.15,'#3e6154');box(e,1.1,1.94,1.11,.31,.09,.02,'#cbdeac');for(let j=0;j<3;j++)box(e,.96+j*.13,1.85,1.2,.07,.03,.07,'#f6e6bf')});
  equip('fridge',e=>{box(e,w/2-.49,1.07,-.75,.65,1.48,.68,'#d4e4da');box(e,w/2-.49,1.09,-.39,.6,1.36,.06,'#e8eedc');box(e,w/2-.49,1.4,-.345,.59,.035,.03,'#9db8aa');box(e,w/2-.68,1.13,-.32,.045,.28,.05,'#678f83')});
  for(const id of ['icedispenser','icemaker'])equip(id,e=>{const x=id==='icemaker'?-w/2+.48:.25;box(e,x,.87,-.42,.62,1.04,.53,'#c5dbd4');box(e,x,1.22,-.13,.45,.28,.04,'#618b92');box(e,x,1.43,-.4,.66,.1,.58,'#e9ead9');label(e,id==='icemaker'?'ICE':'CHILL',x,.86,-.145,.4,.17,{background:'#c5dbd4',color:'#3c6f79',size:72})});
  equip('dispenser',e=>{box(e,.14,1.7,1,.45,.28,.42,'#6c8b75');box(e,.14,2.03,1,.4,.44,.36,'#e8cf68');box(e,.14,2.28,1,.45,.08,.4,'#547863');box(e,.14,1.73,1.25,.07,.08,.12,'#536e60')});
  let speaker=null;if(owns('music')){speaker=createSpeaker(g,w);equipment.userData.ids.push('music')}
  equip('lights',e=>{box(e,0,2.37,-1.29,2.3,.39,.1,'#355847');label(e,'F R E S H',0,2.37,-1.22,2.1,.28,{background:'#355847',color:'#fcde64',size:78});for(const x of [-w/2+.1,w/2-.1])box(e,x,2.12,1.32,.045,.85,.035,'#ffe989')});
  const stock=group(g);stock.name='stock';
  g.remove(roof,equipment,stock);if(speaker)g.remove(speaker.group);batch(g);batch(roof);batch(equipment);g.add(roof,equipment,stock);if(speaker)g.add(speaker.group);
  return {group:g,roof,equipment,stock,price,width:w,style,avatarAnchor:{x:0,y:.75,z:.42},speaker};
}

export function character(parent,index=0,appearance={}){
  const g=group(parent),skins=['#d4a078','#a66f51','#eac39c','#bd885f'],shirts=['#e6ae64','#749fad','#bb8191','#789b77','#edce75'];
  const skin=appearance.skin||skins[index%4],shirt=appearance.shirt||shirts[index%5],hair=appearance.hair||(index%3?'#6b513b':'#b58b56'),pants=appearance.pants||'#586c6d',shoes=appearance.shoes||'#f0e8d0';
  const slots={head:group(g),body:group(g),hair:group(g)};
  box(slots.head,0,1.09,0,.36,.38,.35,skin);box(slots.hair,0,1.3,-.03,.39,.14,.37,hair);box(slots.body,0,.73,0,.42,.4,.28,shirt);
  if(appearance.type==='female'){
    // A long bob and a small tie distinguish the selectable female rig. The
    // independent clothing slots and walking limbs stay compatible with wardrobes.
    box(slots.hair,0,1.07,-.16,.41,.47,.15,hair);
    for(const x of [-.19,.19])box(slots.hair,x,1.08,-.035,.08,.4,.3,hair);
    box(slots.hair,.24,1.14,-.07,.08,.09,.11,'#f2cc4d');
  }
  const legs=[group(g,-.115,.5,0),group(g,.115,.5,0)];legs.forEach(l=>{box(l,0,-.22,0,.15,.43,.16,pants);box(l,0,-.43,.04,.17,.09,.25,shoes)});
  const arms=[group(g,-.29,.89,0),group(g,.29,.89,0)];arms.forEach(a=>{box(a,0,-.15,0,.13,.27,.15,shirt);box(a,0,-.32,0,.13,.12,.15,skin)});
  for(const x of [-.1,.1])box(g,x,1.12,.181,.04,.04,.015,'#3b4435');
  const cup=box(g,.37,.66,.17,.14,.2,.14,'#f6e7a3');cup.visible=false;
  return {group:g,legs,arms,cup,slots:{...slots,legs,arms}};
}
