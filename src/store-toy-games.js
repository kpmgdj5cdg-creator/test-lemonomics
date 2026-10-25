import * as THREE from 'three';
import {box,group} from './models.js';
import {glyphs,voxelText} from './voxel-text.js';
import {TOY_SHELF_1,GAME_PLATFORMS,GAME_TITLES,GAME_SLOTS,GAME_SHELF_LEVELS,normalizeToyCart,gameSlot} from './store-toy-catalog.js';
const palette=['#436b95','#bf644d','#6b976d','#9974a8','#d3ae5e','#6b9ba9'];
// Small original voxel cover art and bitmap titles, generated without network/canvas.
function coverTexture(index,message=null){const w=40,h=60,data=new Uint8Array(w*h*4),bg=new THREE.Color(message?'#e9e4d1':palette[index%palette.length]);
 const pixel=(x,y,color)=>{if(x<0||x>=w||y<0||y>=h)return;const i=((h-1-y)*w+x)*4,c=new THREE.Color(color);data[i]=Math.round(c.r*255);data[i+1]=Math.round(c.g*255);data[i+2]=Math.round(c.b*255);data[i+3]=255};
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const c=bg.clone().multiplyScalar(.68+(1-y/h)*.32);pixel(x,y,c)}
 const rect=(x,y,width,height,color)=>{for(let yy=y;yy<y+height;yy++)for(let xx=x;xx<x+width;xx++)pixel(xx,yy,color)};
 const text=(line,y,color)=>{let x=Math.floor((w-[...line].reduce((n,c)=>n+(glyphs[c]?.[0].length||3)+1,0))/2);for(const c of line){const g=glyphs[c];if(g)for(let r=0;r<7;r++)for(let col=0;col<g[r].length;col++)if(g[r][col]==='1')pixel(x+col,y+r,color);x+=(g?.[0].length||3)+1}};
 if(message){message.split(' ').forEach((line,i)=>text(line,9+i*11,'#9d4946'))}
 else{rect(0,0,w,5,'#e1e4d5');for(let i=0;i<11;i++)rect((i*13+index*7)%w,6+(i*7)%28,1,1,'#f7e6b2');for(let i=0;i<7;i++)rect(i*6,31-((i+index)%4)*3,7,26,palette[(index+2)%palette.length]);rect(13,21,13,14,'#dab67d');rect(15,18,9,5,'#323f57');rect(10,34,19,13,palette[(index+3)%palette.length]);rect(12,47,6,7,'#344c5e');rect(22,47,6,7,'#344c5e');const words=GAME_TITLES[index].toUpperCase().split(' ');rect(0,6,w,19,'#233d50');words.forEach((line,i)=>text(line,7+i*9,'#f7edca'));rect(3,55,6,3,'#f4e6b9');rect(29,55,8,2,'#e4d9ba')}
 const texture=new THREE.DataTexture(data,w,h,THREE.RGBAFormat);texture.colorSpace=THREE.LinearSRGBColorSpace;texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;texture.needsUpdate=true;return texture;
}
export function buildToyGameShelf(parent){
 const f=TOY_SHELF_1,root=group(parent,f.x,0,f.z);root.name='shopster-toy-aisle-1a';root.rotation.y=Math.PI;const matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI),zero=new THREE.Vector3(0,0,0);
 const material=new THREE.MeshStandardMaterial({color:'#e4e6de',roughness:.6});material.userData.owned=true;
 const bodies=new THREE.InstancedMesh(new THREE.BoxGeometry(.27,.42,.085),material,GAME_SLOTS.length);bodies.name='toy-game-cases';bodies.instanceMatrix.setUsage(THREE.DynamicDrawUsage);bodies.userData.gameSlots=GAME_SLOTS.map(s=>s.id);root.add(bodies);
 const meshes=[];for(let i=0;i<GAME_TITLES.length+2;i++){const selected=GAME_SLOTS.filter(s=>i<GAME_TITLES.length?s.game===i:true),map=coverTexture(i%GAME_TITLES.length,i===GAME_TITLES.length?'OUT OF STOCK':i===GAME_TITLES.length+1?'IN CART':null),m=new THREE.MeshBasicMaterial({map});m.userData.owned=true;
  const mesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(.25,i<GAME_TITLES.length?.4:.22),m,selected.length);mesh.userData.gameSlots=selected.map(s=>s.id);mesh.userData.cover=i;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);root.add(mesh);meshes.push(mesh)}
 for(const y of GAME_SHELF_LEVELS){box(root,0,y-.02,-.674,4.45,.09,.035,'#f1e8d1');for(const s of GAME_SLOTS.filter(s=>s.row===GAME_SHELF_LEVELS.indexOf(y)))box(root,s.x,y-.01,-.697,.23,.035,.01,'#bfc8b9')}
 for(let bay=0;bay<3;bay++){const g=group(root,1.42-bay*1.42,3.94,-.66);g.rotation.y=Math.PI;box(g,0,0,0,1.39,.24,.07,GAME_PLATFORMS[bay].color);voxelText(g,GAME_PLATFORMS[bay].name,0,0,.05,.13,'#fff3d9')}
 const tag=group(root,-2.19,2.25,-.7);tag.rotation.y=Math.PI;box(tag,0,0,0,.24,.38,.04,'#e5c66d');voxelText(tag,'1A',0,0,.03,.14,'#3c4c52');
 let signature=null;
 function sync(saved){const cart=normalizeToyCart(saved),ids=new Set(cart.items),key=cart.items.join('|');if(signature===key)return;signature=key;
  GAME_SLOTS.forEach(s=>{const visible=s.initialStock&&!ids.has(s.id);matrix.compose(new THREE.Vector3(s.x,s.y,s.z+.055),new THREE.Quaternion(),visible?new THREE.Vector3(1,1,1):zero);bodies.setMatrixAt(s.index,matrix);bodies.setColorAt(s.index,new THREE.Color(s.color).lerp(new THREE.Color('#efeee2'),.65))});bodies.instanceMatrix.needsUpdate=true;bodies.instanceColor.needsUpdate=true;bodies.computeBoundingSphere();
  for(const mesh of meshes){const kind=mesh.userData.cover;mesh.userData.gameSlots.forEach((id,i)=>{const s=gameSlot(id),available=s.initialStock&&!ids.has(id),show=kind<GAME_TITLES.length?available:kind===GAME_TITLES.length?!s.initialStock:ids.has(id);matrix.compose(new THREE.Vector3(s.x,kind<GAME_TITLES.length?s.y:s.y-.1,s.z),rotation,show?new THREE.Vector3(1,1,1):zero);mesh.setMatrixAt(i,matrix)});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere()}
 }
 sync();return {root,bodies,meshes,targets:[bodies,...meshes],sync,dispose(){for(const mesh of [bodies,...meshes])mesh.dispose()}};
}
