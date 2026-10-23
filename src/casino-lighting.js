import * as THREE from 'three';
import {box,group,batch} from './models.js';
import {glyphs} from './voxel-text.js';
const owned=m=>{m.userData.owned=true;return m};
export function buildCasinoLighting(root,roof,body,sign){
 const signMaterial=owned(new THREE.MeshStandardMaterial({color:'#aa651f',emissive:'#c47a28',emissiveIntensity:.08,roughness:.45}));sign.traverse(o=>{if(o.isMesh)o.material=signMaterial});
 box(roof,0,4.45,5.35,7.95,1.43,.075,'#211c27');for(const y of [3.91,4.19,4.72,4.99])box(roof,0,y,5.4,7.7,.022,.018,'#367185');
 const letterMaterial=owned(new THREE.MeshBasicMaterial({color:'#ffe0a1',toneMapped:false})),letterPoints=[];const unit=1.1/7,word=[...'CASINO'].map(c=>glyphs[c]),width=word.reduce((n,g)=>n+g[0].length+1,0)-1;let cursor=-width/2;
 for(const glyph of word){for(let r=0;r<7;r++)for(let c=0;c<glyph[r].length;c++)if(glyph[r][c]==='1')letterPoints.push([(cursor+c+.5)*unit,4.44+(3-r)*unit,5.52]);cursor+=glyph[0].length+1}
 const bulbGeometry=new THREE.SphereGeometry(.036,6,4);bulbGeometry.userData.owned=true;
 function bulbs(points,mat,name){const mesh=new THREE.InstancedMesh(bulbGeometry,mat,points.length),matrix=new THREE.Matrix4();points.forEach((p,i)=>{matrix.makeTranslation(...p);mesh.setMatrixAt(i,matrix)});mesh.name=name;mesh.instanceMatrix.needsUpdate=true;roof.add(mesh);return mesh}
 const letters=bulbs(letterPoints,letterMaterial,'casino-letter-bulbs');
 // An eight-step chase travels around the cornice and up the stepped roof hips.
 const edge=[];const line=(a,b,spacing=.26)=>{const n=Math.ceil(new THREE.Vector3(...a).distanceTo(new THREE.Vector3(...b))/spacing);for(let i=0;i<n;i++)edge.push(a.map((v,k)=>v+(b[k]-v)*i/n))};
 line([-6.33,3.95,5.34],[6.33,3.95,5.34]);line([6.33,3.95,5.34],[6.33,3.95,-5.34]);line([6.33,3.95,-5.34],[-6.33,3.95,-5.34]);line([-6.33,3.95,-5.34],[-6.33,3.95,5.34]);
 for(const x of [-1,1])for(const z of [-1,1])for(let t=0;t<9;t++)edge.push([x*(6.15-t*.38),4.13+t*.19,z*(5.15-t*.36)]);
 const chasers=Array.from({length:8},(_,phase)=>{const material=owned(new THREE.MeshBasicMaterial({color:'#e5a941',toneMapped:false}));return {material,mesh:bulbs(edge.filter((_,i)=>i%8===phase),material,'casino-roof-chase-'+phase)}});
 const fixtureMaterial=owned(new THREE.MeshStandardMaterial({color:'#c69861',emissive:'#ffa94f',emissiveIntensity:.15}));
 // Cove strips replace the old bright white ceiling with warm amber and red edges.
 const coveMaterial=owned(new THREE.MeshBasicMaterial({color:'#e8a05a',toneMapped:false})),cove=group(root);cove.name='casino-ceiling-cove';
 for(const x of [-5.78,5.78]){box(cove,x,3.28,0,.16,.12,9.65,'#473032');box(cove,x,3.31,0,.07,.06,9.6,'#e8a05a').material=coveMaterial;box(cove,x,3.14,0,.04,.035,9.6,'#bd3847')}
 for(const z of [-4.79,4.79]){box(cove,0,3.28,z,11.6,.12,.16,'#473032');box(cove,0,3.31,z,11.55,.06,.07,'#e8a05a').material=coveMaterial;box(cove,0,3.14,z,11.55,.035,.04,'#bd3847')}
 const interiorLights=[];for(const [x,z]of [[-4.7,-3.7],[4.7,-3.7],[-4.7,3.7],[4.7,3.7]]){const l=new THREE.PointLight('#ffb36c',1.5,4.3,1.7);l.position.set(x,3.02,z);root.add(l);interiorLights.push(l)}batch(cove);
 const outdoorLights=[];for(const x of [-4.9,4.9]){box(body,x,2.55,5.2,.35,.6,.25,'#493a2b');box(body,x,2.55,5.36,.23,.4,.12,'#c69861').material=fixtureMaterial;const l=new THREE.PointLight('#ffce85',0,5,1.6);l.position.set(x,2.5,5.85);root.add(l);outdoorLights.push(l)}
 for(const x of [-1.8,1.8]){box(body,x,.55,6.05,.18,1,.18,'#493a2b');box(body,x,1.05,6.05,.27,.22,.27,'#c69861').material=fixtureMaterial;const l=new THREE.PointLight('#ffd69b',0,3.5,1.7);l.position.set(x,1.2,6.05);root.add(l);outdoorLights.push(l)}
 const signLight=new THREE.PointLight('#ffbd6b',0,4,1.6);signLight.position.set(0,4.5,6);root.add(signLight);outdoorLights.push(signLight);
 let night=null,phase=-1;const warm=new THREE.Color('#ffd78d'),dim=new THREE.Color('#63431d');
 function updateLights(time,reduced=false){const next=night&&!reduced?Math.floor(time/ .22)%8:0;if(next===phase)return;phase=next;chasers.forEach((c,i)=>c.material.color.copy(night?(reduced||i===phase||i===(phase+1)%8?warm:dim):dim))}
 function setNight(value){if(value===night)return;night=value;phase=-1;signMaterial.emissiveIntensity=night?.22:.08;letterMaterial.color.set(night?'#ffe2a0':'#ac8148');fixtureMaterial.emissiveIntensity=night?.6:.15;outdoorLights.forEach((l,i)=>l.intensity=night?(i===4?2:i<2?4:2):0);updateLights(0,true)}
 setNight(false);return {setNight,updateLights,signMaterial,outdoorLights,letters,chasers,interiorLights,get chasePhase(){return phase}};
}
