import * as THREE from 'three';
import {box,group,batch} from './models.js';
export const HOME_LOT={x:26.4,z:-5.8},HOME_CENTER={x:26.4,z:-6.8},HOME_FRONT={x:26.4,z:-3.8};
export const HOME_BOUNDS={minX:-3.28,maxX:3.28,minZ:-2.85,maxZ:2.85};
export const HOME_SOLIDS=[
 {minX:.7,maxX:.86,minZ:.12,maxZ:3},
 {minX:1.45,maxX:3.45,minZ:-.83,maxZ:-.67},
 {minX:1.16,maxX:3.3,minZ:-2.85,maxZ:-2.27},
 {minX:1.16,maxX:1.65,minZ:-2.28,maxZ:-1.32},
 {minX:2.85,maxX:3.3,minZ:-2.28,maxZ:-1.32},
 {minX:1.1,maxX:2.7,minZ:.2,maxZ:1.95},
 {minX:2.55,maxX:3.25,minZ:2.22,maxZ:2.78},
 {minX:-3.1,maxX:-1.4,minZ:.45,maxZ:1.3},
 {minX:-3.1,maxX:-2.1,minZ:2.28,maxZ:2.85},
 {minX:-2.6,maxX:-1.4,minZ:-2.28,maxZ:-1.08},
 {minX:-3.04,maxX:-2.67,minZ:-1.95,maxZ:-1.4},
 {minX:-1.33,maxX:-.96,minZ:-1.95,maxZ:-1.4},
];
export function buildPlayerHome(parent){
 const g=group(parent,0,.12,-1),body=group(g),roof=group(g),glass=group(g),doors=group(g);
 g.userData.kind='house';g.userData.purchasable=true;g.name='purchasable-house';
 const cream='#e4d7bd',trim='#f1e8d1';
 box(body,0,.08,0,7,.2,6.25,'#adb7a4');
 for(let row=0;row<26;row++)for(let col=0;col<6;col++){const z=-2.9+(col+.5)*.97;box(body,-3.25+(row+.5)*.25,.22,z,.243,.06,.955,['#ba8b58','#c99966','#d3aa78'][(row+col)%3]);}
 // Separate wall bands leave real openings to the shared outdoor scene.
 function wall(axis,at,start,end,holes=[]){
  const draw=(a,b,y,h,color)=>{if(b<=a)return;axis==='x'?box(body,(a+b)/2,y,at,b-a,h,.18,color):box(body,at,y,(a+b)/2,.18,h,b-a,color)};
  draw(start,end,.685,.83,cream);draw(start,end,2.835,.61,cream);
  let cursor=start;for(const hole of holes.sort((a,b)=>a[0]-b[0])){draw(cursor,hole[0],1.815,1.43,cream);cursor=hole[1];}draw(cursor,end,1.815,1.43,cream);
  // Door openings also replace the lower band.
 }
 // Front wall: living window, front door and bedroom window.
 function frontSegments(z,segments){for(const [a,b,bottom,top]of segments)box(body,(a+b)/2,(bottom+top)/2,z,b-a,top-bottom,.18,cream)}
 frontSegments(3,[[-3.45,-2.8,.27,3.14],[-1.25,-.55,.27,3.14],[.55,1.5,.27,3.14],[2.9,3.45,.27,3.14],[-2.8,-1.25,.27,1.1],[-2.8,-1.25,2.53,3.14],[-.55,.55,2.65,3.14],[1.5,2.9,.27,1.1],[1.5,2.9,2.53,3.14]]);
 frontSegments(-3,[[-3.45,-1.15,.27,3.14],[.55,3.45,.27,3.14],[-1.15,.55,2.65,3.14]]);
 wall('z',-3.45,-3,3,[[-.65,1.35]]);wall('z',3.45,-3,3,[[.15,1.95]]);
 const glassMat=new THREE.MeshStandardMaterial({color:'#b7e3ec',transparent:true,opacity:.13,roughness:.18,depthWrite:false});glassMat.userData.owned=true;
 function pane(axis,at,a,b,bottom=1.1,top=2.53){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(axis==='x'?b-a:.035,top-bottom,axis==='x'?.035:b-a),glassMat);mesh.position.set(axis==='x'?(a+b)/2:at,(bottom+top)/2,axis==='x'?at:(a+b)/2);mesh.castShadow=false;glass.add(mesh);
  for(const edge of [a,b,(a+b)/2])axis==='x'?box(body,edge,(bottom+top)/2,at,.065,top-bottom+.1,.22,trim):box(body,at,(bottom+top)/2,edge,.22,top-bottom+.1,.065,trim);
  for(const y of [bottom,top])axis==='x'?box(body,(a+b)/2,y,at,b-a+.1,.07,.24,trim):box(body,at,y,(a+b)/2,.24,.07,b-a+.1,trim);
 }
 pane('x',3,-2.8,-1.25);pane('x',3,1.5,2.9);pane('z',-3.45,-.65,1.35);pane('z',3.45,.15,1.95);
 // Rear patio glazing is a separate sliding opening, with a clear garden view.
 pane('x',-3,-1.15,.55,.3,2.65);box(body,-.35,1.3,-2.88,.06,.28,.06,'#a99269');
 const hinge=group(doors,-.52,0,3),leaf=group(hinge,.52,0,0);
 box(leaf,0,1.43,0,1.02,2.34,.09,'#59786e');box(leaf,0,1.85,.055,.62,.8,.025,'#8dbbbd');box(leaf,.35,1.3,.08,.055,.17,.04,'#e6bf6b');
 for(const x of [-.58,.58])box(body,x,1.43,3,.12,2.5,.22,trim);box(body,0,2.7,3,1.28,.12,.22,trim);
 box(body,0,.12,3.35,1.8,.18,.7,'#ddcfb4');
 // Beige bedroom partitions match the supplied plan; the upper-left gap is its doorway.
 box(body,.78,1.7,1.56,.16,2.88,2.88,cream);box(body,2.45,1.7,-.75,2,2.88,.16,cream);
 // Rear-right U-shaped kitchen, clear from the dining circulation space.
 for(const [x,z,w,d]of [[2.23,-2.56,2.14,.58],[1.4,-1.8,.49,.95],[3.08,-1.8,.45,.95]]){
  box(body,x,.76,z,w,1,d,'#9d7957');box(body,x,1.3,z,w+.04,.12,d+.04,'#d7c9ae');
  for(let i=0;i<Math.max(1,Math.floor(w/.45));i++)box(body,x-w/2+.23+i*.45,.83,z+d/2+.015,.32,.58,.025,'#b28d65');
 }
 box(body,2.1,1.38,-2.53,.58,.035,.4,'#738b8b');box(body,2.1,1.39,-2.53,.43,.02,.28,'#bac6bc');box(body,2.1,1.6,-2.75,.045,.4,.045,'#aab9b1');
 box(body,3.08,1.38,-1.75,.37,.025,.61,'#34434a');for(const z of [-1.9,-1.6])box(body,3.08,1.4,z,.22,.025,.2,'#687477');
 // Voxel round dining table and two seats, as in the plan.
 box(body,-2,.7,-1.68,.14,.85,.14,'#71563e');
 for(let x=-3;x<=3;x++)for(let z=-3;z<=3;z++)if(Math.hypot(x,z)<3.3)box(body,-2+x*.18,1.15,-1.68+z*.18,.185,.12,.185,'#c59864');
 for(const x of [-2.86,-1.14]){box(body,x,.66,-1.68,.36,.1,.5,'#846646');box(body,x,.43,-1.68,.09,.42,.35,'#71563e');box(body,x+(x<-2?-.15:.15),.94,-1.68,.07,.58,.5,'#967750');}
 // Living room: couch and corner TV. Bedroom: bed, pillow and dresser.
 box(body,-2.25,.65,.88,1.7,.6,.85,'#6b918b');box(body,-2.25,1.02,.57,1.7,.6,.2,'#7aa69b');for(const x of [-3.02,-1.48])box(body,x,.92,.94,.16,.45,.7,'#719b92');
 const tv=group(body,-2.6,0,2.55);tv.rotation.y=-Math.PI/4;box(tv,0,.55,0,1,.55,.4,'#866447');box(tv,0,1.15,0,1,.7,.07,'#303d43');box(tv,0,1.15,-.05,.87,.56,.02,'#486678');
 box(body,1.9,.46,1.08,1.6,.38,1.75,'#8d6745');box(body,1.9,.72,1.08,1.53,.22,1.7,'#ece5cf');box(body,2.08,.88,1.25,1.14,.1,1.32,'#698baf');box(body,1.36,.88,1.08,.36,.13,1.35,'#f3ecd8');
 box(body,2.9,.7,2.5,.7,.86,.56,'#a37a50');for(const y of [.48,.75,.98]){box(body,2.9,y,2.2,.59,.19,.025,'#bc9468');box(body,2.9,y,2.17,.09,.035,.025,'#ddc389');}
 // Preserve the blue modern exterior, flat trim and rooftop solar panels.
 box(roof,0,3.25,0,7.4,.23,6.5,'#435c73');for(const z of [-3.18,3.18])box(roof,0,3.43,z,7.4,.2,.14,trim);for(const x of [-3.62,3.62])box(roof,x,3.43,0,.14,.2,6.4,trim);
 box(roof,0,3.08,0,6.9,.12,6,'#f2e7d5');for(let i=0;i<3;i++){box(roof,.15+i*.62,3.49,-.25,.53,.08,1.4,'#284f68');box(roof,.15+i*.62,3.54,-.25,.025,.02,1.4,'#8ea9ad');}
 const light=new THREE.PointLight('#ffe6bb',5,9,1.3);light.position.set(-.6,2.75,0);g.add(light);
 g.userData.room={roof,body,glass,doors,hinge,doorOpen:0,solids:HOME_SOLIDS};
 return g;
}
export function batchPlayerHome(home){const r=home.userData.room;batch(r.body);batch(r.roof);batch(r.hinge);}
