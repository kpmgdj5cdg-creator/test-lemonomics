import * as THREE from 'three';
import {box,group,batch,disposeGroup} from './models.js';

// One locally rendered voxel match is broadcast to every display. No video stream.
export class StoreSportsBroadcast{
 constructor(){
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#759cad');
  this.camera=new THREE.OrthographicCamera(-11,11,6.1875,-6.1875,.1,90);this.camera.position.set(10,15,18);this.camera.lookAt(0,0,0);
  this.scene.add(new THREE.HemisphereLight('#fff6df','#577054',3));const sun=new THREE.DirectionalLight('#fff4d7',3);sun.position.set(-8,14,9);this.scene.add(sun);
  const field=group(this.scene);for(let i=0;i<10;i++)box(field,-6.75+i*1.5,-.12,0,1.5,.2,9,i%2?'#328c5b':'#3a9e64');
  for(const z of [-4.4,4.4])box(field,0,.005,z,14.8,.025,.065,'#f3efdb');for(const x of [-7.4,0,7.4])box(field,x,.005,0,.065,.025,8.8,'#f3efdb');
  for(const side of [-1,1]){for(const z of [-2.3,2.3])box(field,side*6.2,.01,z,2.35,.025,.06,'#f3efdb');box(field,side*5.05,.01,0,.06,.025,4.6,'#f3efdb');for(const z of [-1.5,1.5])box(field,side*7.5,.7,z,.09,1.4,.09,'#eee8dc');box(field,side*7.5,1.4,0,.09,.09,3.1,'#eee8dc');for(let i=0;i<9;i++)box(field,side*8,.7,-1.4+i*.35,.025,1.4,.025,'#c9d6cd');box(field,side*8,1.4,0,1.1,.04,3,'#d3ddd3')}
  for(const side of [-1,1])for(let row=0;row<3;row++){box(field,0,.2+row*.34,side*(5.3+row*.55),17,.3,.5,'#566e80');for(let i=0;i<27;i++)box(field,-7.8+i*.6,.53+row*.34,side*(5.3+row*.55),.24,.35,.25,['#e5c76b','#b4444b','#75a6bc','#e3d6b6'][i%4])}
  batch(field);this.players=[];
  for(let i=0;i<10;i++){const p=group(this.scene);const team=i%2,shirt=team?'#f1d6ba':'#c52d43';box(p,0,.55,0,.35,.48,.22,shirt);box(p,0,.95,0,.3,.3,.28,'#c99d75');box(p,0,1.12,0,.32,.09,.28,'#3c3837');for(const side of [-1,1])box(p,side*.25,.6,0,.12,.4,.14,shirt);const legs=[-1,1].map(side=>{const leg=group(p,side*.1,.31,0);box(leg,0,-.12,0,.13,.28,.15,team?'#344457':'#eeeece');box(leg,0,-.27,.06,.16,.1,.23,'#293a44');return leg});for(const leg of legs)batch(leg);batch(p);this.players.push({group:p,legs,team,index:i})}
  this.ball=group(this.scene);box(this.ball,0,0,0,.22,.22,.22,'#f0ead7');for(const x of [-.115,.115])box(this.ball,x,0,0,.02,.09,.09,'#293b42');batch(this.ball);
  this.target=new THREE.WebGLRenderTarget(512,288,{depthBuffer:true});this.target.texture.colorSpace=THREE.SRGBColorSpace;
  this.material=new THREE.MeshBasicMaterial({map:this.target.texture,toneMapped:false});this.material.userData.owned=true;
  this.time=0;this.frame=0;this.lastRender=-1;this.disposed=false;
 }
 update(renderer,dt){
  if(this.disposed)return;this.time+=Math.min(.1,Math.max(0,dt));if(this.time-this.lastRender<1/12)return;this.lastRender=this.time;
  const t=this.time;for(const p of this.players){const i=p.index,phase=t*.65+i*.9;p.group.position.set(Math.sin(phase)*4.8,0,(i%5-2)*1.35+Math.cos(phase*1.3)*.4);p.group.rotation.y=Math.cos(phase)>0?Math.PI/2:-Math.PI/2;p.legs.forEach((leg,j)=>leg.rotation.x=Math.sin(t*9+i+j*Math.PI)*.55)}
  this.ball.position.set(Math.sin(t*.65)*5,.19+Math.abs(Math.sin(t*2.6))*.8,Math.cos(t*.8)*2);this.ball.rotation.set(t*2,t*3,0);
  const previous=renderer.getRenderTarget(),shadow=renderer.shadowMap.enabled;try{renderer.shadowMap.enabled=false;renderer.setRenderTarget(this.target);renderer.render(this.scene,this.camera);this.frame++}finally{renderer.setRenderTarget(previous);renderer.shadowMap.enabled=shadow}
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.target.dispose();this.material.dispose();disposeGroup(this.scene)}
}
export function buildStoreElectronics(parent){
 const broadcast=new StoreSportsBroadcast(),screens=[];
 for(const z of [2.1,5.4,8.7]){const tv=group(parent,-19.17,3.55,z);tv.rotation.y=Math.PI/2;tv.name='shopster-sports-tv';box(tv,0,0,0,2.85,1.68,.12,'#25333e');box(tv,0,-.89,-.02,.8,.08,.14,'#434e55');const screen=new THREE.Mesh(new THREE.PlaneGeometry(2.66,1.496),broadcast.material);screen.position.z=.067;tv.add(screen);box(tv,1.27,-.75,.07,.04,.035,.02,'#77c4b6');screens.push(screen)}
 return {broadcast,screens};
}
