import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {characterAppearance,EXPRESSIONS} from './character-appearance.js';
const geometry=new THREE.BoxGeometry(1,1,1),paint=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.82});
geometry.userData.characterShared=true;
const lipMaterial=new THREE.MeshStandardMaterial({color:'#633c35',roughness:.9}),lightLipMaterial=new THREE.MeshStandardMaterial({color:'#ca9782',roughness:.9}),cupMaterial=new THREE.MeshStandardMaterial({color:'#f6e7a3',roughness:.9});
const skinShade=c=>'#'+new THREE.Color(c).multiplyScalar(.84).getHexString();
// A part is one vertex-coloured draw call. Animated features stay separate and
// are protected from the scenery batcher. No canvas, textures or external assets.
export function createVoxelCharacter(parent,id=0,input={}){
 const a=characterAppearance(input.id??id,input),g=new THREE.Group();parent.add(g);g.name='voxel-character';g.userData.characterAppearance=a;
 const part=(parent,x=0,y=0,z=0)=>{const p=new THREE.Group();p.position.set(x,y,z);p.userData.characterPart=true;parent.add(p);return p};
 const cube=(p,x,y,z,w,h,d,color)=>{const mesh=new THREE.Mesh(geometry,paint);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.userData.characterDynamic=true;mesh.userData.paint=color;p.add(mesh);return mesh};
 const seal=p=>{const pieces=[];p.updateMatrix();for(const m of [...p.children])if(m.isMesh&&m.geometry===geometry){m.updateMatrix();const q=geometry.clone().applyMatrix4(m.matrix),c=new THREE.Color(m.userData.paint),colors=new Float32Array(q.attributes.position.count*3);for(let i=0;i<colors.length;i+=3){colors[i]=c.r;colors[i+1]=c.g;colors[i+2]=c.b}q.setAttribute('color',new THREE.BufferAttribute(colors,3));pieces.push(q);p.remove(m)}if(pieces.length){const mesh=new THREE.Mesh(mergeGeometries(pieces),paint);mesh.castShadow=true;mesh.receiveShadow=true;p.add(mesh);pieces.forEach(q=>q.dispose())}};
 const body=part(g),head=part(g),hair=part(g),legs=[part(g,-.115,.5),part(g,.115,.5)],arms=[part(g,-.29*a.body.shoulders,.89),part(g,.29*a.body.shoulders,.89)];
 const W=.42*a.body.width,skin=a.skin,shirt=a.shirt,dark=skinShade(shirt),hairDark=skinShade(a.hair);
 cube(body,0,.73,0,W,.4,.28,shirt);cube(body,0,.94,0,.13,.05,.14,skin);cube(body,0,.525,0,.4,.045,.275,a.pants);
 cube(head,0,1.1,-.005,.36*a.face.width,.36,.34,skin);cube(head,0,.955,.012,a.face.jaw==='tapered'?.27:a.face.jaw==='round'?.3:.34,.07,.3,skin);for(const s of [-1,1])cube(head,s*.186,1.07,0,.045,.09,.09,skin);
 cube(head,0,1.071,.187,a.face.nose==='wide'?.078:.045,a.face.nose==='long'?.085:.055,a.face.nose==='small'?.04:.065,skinShade(skin));
 for(const [i,l]of legs.entries()){cube(l,0,-.22,0,.15,.43,.16,a.pants);cube(l,0,-.41,.037,.17,.065,.25,a.shoes);cube(l,0,-.465,.04,.175,.02,.255,'#c0b9a9');cube(l,0,-.2,.084,.105,.025,.012,skinShade(a.pants));cube(l,0,-.07,-.086,.085,.075,.015,skinShade(a.pants));if(a.clothing==='uniform'||a.clothing==='jacket')cube(l,0,-.35,0,.16,.13,.18,a.shoes);if(a.clothing==='shorts'||a.clothing==='athletic'){cube(l,0,-.32,0,.152,.17,.162,skin);cube(l,0,-.37,.085,.155,.04,.012,'#e8dfce')}}
 arms.forEach(arm=>{cube(arm,0,-.14,0,.13,.25,.15,shirt);cube(arm,0,-.32,0,.13,.12,.15,skin);cube(arm,0,-.265,.015,.135,.035,.155,dark)});
 // Clothing changes silhouette as well as colour, without changing hip/limb pivots.
 if(['polo','uniform','button-down','jacket'].includes(a.clothing)){for(const s of [-1,1]){const c=cube(body,s*.065,.902,.154,.09,.055,.035,'#e1dac8');c.rotation.z=s*.24}for(const y of [.65,.74,.82])cube(body,0,y,.15,.022,.022,.02,'#eadfc9');cube(body,-.115,.78,.15,.09,.065,.025,dark)}
 if(a.clothing==='jacket'){for(const s of [-1,1])cube(body,s*.14,.73,.16,.14,.36,.04,dark);cube(body,0,.75,.151,.075,.3,.02,'#e4d3b0')}
 if(a.clothing==='hoodie'){cube(body,0,.9,-.115,W+.03,.16,.13,dark);cube(body,0,.64,.155,.24,.085,.035,dark);for(const s of [-1,1])cube(body,s*.045,.82,.155,.013,.13,.014,'#e5d9c1')}
 if(a.clothing==='dress'||a.clothing==='skirt'){cube(body,0,.49,0,W+.055,.21,.31,a.clothing==='skirt'?dark:shirt);cube(body,0,.38,0,W+.095,.05,.34,dark)}
 if(a.clothing==='tee'||a.clothing==='athletic'){for(const y of [.7,.76])cube(body,0,y,.148,W*.9,.025,.016,a.clothing==='athletic'?'#ede8cf':dark)}
 cube(body,0,.54,.149,.4,.028,.02,'#3d3834');cube(body,.025,.54,.163,.04,.032,.018,'#d3b46c');
 if(a.clothing==='uniform')cube(body,.11,.82,.162,.095,.055,.025,'#fff2d4');
 // Hair stays below the original 1.37-unit top. Staggered blocks give volume.
 const style=a.hairStyle;
 if(style!=='bald'){
  if(style!=='balding'&&style!=='buzz')cube(hair,0,1.303,-.028,.39,.105,.37,a.hair);
  if(style==='buzz'){cube(hair,0,1.29,-.02,.374,.055,.35,a.hair)}
  else if(style==='balding'){for(const s of [-1,1])cube(hair,s*.176,1.205,-.055,.055,.16,.3,a.hair);cube(hair,0,1.205,-.158,.36,.16,.055,a.hair)}
  else{cube(hair,0,1.2,-.158,.385,.22,.075,hairDark);for(const s of [-1,1])cube(hair,s*.174,1.205,-.03,.05,.18,.27,a.hair);
   for(let i=0;i<5;i++){const x=-.15+i*.075,y=style==='spiky'?1.326+(i%2)*.014:1.319-(i%3)*.012;cube(hair,x,y,-.025+(i%2)*.025,.08,.06,.3,i%2?a.hair:hairDark)}
   if(['short','side-part','medium','wavy','curly'].includes(style))for(let i=0;i<4;i++)cube(hair,-.145+i*.08,1.243-(i%3)*.018,.155,.085,.085,.055,i%2?a.hair:hairDark);
   if(['medium','long','ponytail','bun'].includes(style)){const len=style==='long'?.4:.24;for(const s of [-1,1])cube(hair,s*.181,1.12,-.035,.07,len,.29,a.hair);cube(hair,0,1.08,-.18,.38,len,.08,hairDark)}
   if(style==='curly'||style==='wavy')for(const s of [-1,1])for(let j=0;j<4;j++)cube(hair,s*(.18+(j%2)*.012),1.29-j*.05,-.08+j*.05,.075,.075,.1,j%2?hairDark:a.hair);
   if(style==='side-part'){cube(hair,-.09,1.29,.15,.19,.12,.09,a.hair);cube(hair,.12,1.3,.13,.075,.075,.08,hairDark)}
   if(style==='ponytail')for(let i=0;i<3;i++)cube(hair,0,1.2-i*.09,-.245,.14,.11,.13,i%2?hairDark:a.hair);
   if(style==='bun'){cube(hair,0,1.27,-.23,.19,.16,.15,a.hair);cube(hair,0,1.28,-.32,.13,.11,.055,hairDark)}
  }
 }
 if(a.accessories.hat){cube(hair,0,1.313,-.015,.4,.1,.37,'#947344');cube(hair,0,1.28,.17,.43,.025,.16,'#bd9654')}
 if(a.accessories.facialHair){const beard=a.accessories.facialHair;if(beard==='moustache')cube(head,0,1.04,.181,.12,.023,.025,a.hair);else if(beard==='goatee')cube(head,0,.969,.174,.085,.06,.025,a.hair);else{cube(head,0,.969,.173,.23,.035,.024,a.hair);for(const s of [-1,1])cube(head,s*.105,1.002,.175,.035,.075,.024,a.hair)}}
 if(a.accessories.glasses){for(const s of [-1,1]){for(const y of [1.09,1.155])cube(head,s*a.face.eyeSpacing,y,.193,.108,.012,.018,'#353a40');for(const x of [-.05,.05])cube(head,s*a.face.eyeSpacing+x,1.122,.193,.012,.07,.018,'#353a40')}cube(head,0,1.125,.195,.075,.012,.018,'#353a40')}
 const eyes=part(g),brows=[part(g),part(g)],mouth=part(g);eyes.userData.faceDetail=true;mouth.userData.faceDetail=true;
 for(const s of [-1,1]){cube(eyes,s*a.face.eyeSpacing,1.12,.174,.064,a.face.eyeSize+.012,.022,'#f3e6d1');cube(eyes,s*a.face.eyeSpacing,1.118,.19,a.face.eyeSize,a.face.eyeSize,.012,'#262e32');cube(eyes,s*a.face.eyeSpacing-.007,1.126,.199,.009,.009,.007,'#fff9df')}
 brows.forEach((b,i)=>{b.position.set((i?1:-1)*a.face.eyeSpacing,1.18,.183);cube(b,0,0,0,.073,a.face.browThickness,.025,a.face.browColor)});
 const lips=[];for(let i=0;i<3;i++)lips.push(cube(mouth,(i-1)*.034,1.015,.184,.036,.016,.022,'#633c35'));
 const cup=cube(g,.37,.66,.17,.14,.2,.14,'#f6e7a3');cup.visible=false;
 for(const p of [body,head,hair,...legs,...arms,eyes,...brows])seal(p);
 // Lip cubes need an independently coloured reusable material, and must survive batching.
 const tone=new THREE.Color(skin);for(const m of lips)m.material=tone.r+tone.g+tone.b<.65?lightLipMaterial:lipMaterial;
 // Cup uses its own merged vertex colour mesh so it remains identical to old API.
 cup.material=cupMaterial;
 const headPivot=new THREE.Group();headPivot.position.y=1.09;g.add(headPivot);for(const p of [head,hair,eyes,...brows,mouth]){g.remove(p);p.position.y-=1.09;headPivot.add(p)}
 let expression=a.defaultExpression,talking=false,gesture='none',motion='idle',blink=1,gaze=0,energy=1;
 const rig={group:g,legs,arms,cup,appearance:a,slots:{head,body,hair,legs,arms},face:{eyes,brows,mouth,pivot:headPivot},
 setExpression(value){if(EXPRESSIONS.includes(value))expression=value;return rig},
 setTalking(value){talking=!!value;return rig},
 setAnimation(state={}){if(state.expression)rig.setExpression(state.expression);if(state.talking!==undefined)talking=!!state.talking;if(state.gesture)gesture=state.gesture;if(state.motion)motion=state.motion;if(Number.isFinite(state.gaze))gaze=Math.max(-.3,Math.min(.3,state.gaze));if(Number.isFinite(state.energy))energy=Math.max(.2,Math.min(1,state.energy));return rig},
 turnTo(yaw,dt=.016){const delta=Math.atan2(Math.sin(yaw-g.rotation.y),Math.cos(yaw-g.rotation.y));g.rotation.y+=delta*(1-Math.exp(-Math.min(.2,dt)*12));return rig},
 update(time,{moving=false,reducedMotion=false,animateLimbs=true,distance=0}={}){
  const subtle=!reducedMotion,phase=time+(a.seed%1000)/100,ex=expression==='talking'?'neutral':expression,speaking=talking||expression==='talking';
  // Detail LOD removes facial draws at overview distance, not world scale.
  eyes.visible=mouth.visible=distance<24;brows.forEach(b=>b.visible=distance<24);
  blink=subtle&&phase% (4+(a.seed%7)*.3)<.13?.06:1;eyes.scale.y=blink;eyes.position.y=1.12*(1-blink)-1.09;
  body.position.y=subtle&&!moving?Math.sin(phase*1.8)*.003*energy:0;
  headPivot.rotation.y=subtle?gaze:0;headPivot.rotation.z=subtle?(1-energy)*.025:0;
  const angle={angry:.22,sad:-.18,concerned:-.26,happy:-.04,surprised:0}[ex]||0;
  brows.forEach((b,i)=>{b.rotation.z=(i?1:-1)*angle;b.position.y=1.18-1.09+(ex==='surprised'?.025:ex==='angry'?-.012:0)});
  lips.forEach((m,i)=>{const edge=i!==1;m.position.y=1.015+(ex==='happy'&&edge?.013:(ex==='sad'||ex==='concerned')&&edge?-.014:0);m.scale.y=ex==='surprised'?(edge?.028:.044):speaking&&subtle?(i===1?.02+Math.abs(Math.sin(time*11))*.025:.016):.016;m.scale.x=ex==='surprised'?.022:.036});
  if(animateLimbs){for(let i=0;i<2;i++){legs[i].rotation.x=moving&&subtle?Math.sin(time*8+i*Math.PI)*.4:motion==='sitting'?-Math.PI/2:0;arms[i].rotation.x=moving&&subtle?-Math.sin(time*8+i*Math.PI)*.3:0}if(gesture==='wave'&&subtle){arms[1].rotation.z=-1.8+Math.sin(time*5)*.12}else arms[1].rotation.z=0;if(gesture==='explain'&&subtle)arms[0].rotation.x=-.45+Math.sin(time*3)*.12}
  g.userData.expression=expression;g.userData.talking=speaking;g.userData.blink=blink;
 },get state(){return {expression,talking,gesture,motion}}};
 rig.update(0,{reducedMotion:true});return rig;
}
