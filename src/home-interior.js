import * as THREE from 'three';
import {HOME_CENTER,HOME_FRONT} from './home-model.js';
import {moveInHome,validHomePosition} from './home-movement.js';
const directions={KeyW:[0,-1],ArrowUp:[0,-1],KeyS:[0,1],ArrowDown:[0,1],KeyA:[-1,0],ArrowLeft:[-1,0],KeyD:[1,0],ArrowRight:[1,0]};
export class HomeInterior{
 constructor(world){
  this.world=world;this.active=false;this.position={x:0,z:2.35};this.yaw=0;this.pitch=0;this.keys=new Set();this.touch=new Set();
  this.camera=new THREE.PerspectiveCamera(74,1,.035,180);this.camera.rotation.order='YXZ';
  const host=world.container.parentElement,nav=host.querySelector('.scene-nav');
  this.exitButton=document.createElement('button');this.exitButton.id='homeExitBtn';this.exitButton.type='button';this.exitButton.className='scene-chip';this.exitButton.textContent='Exit house';this.exitButton.hidden=true;nav.append(this.exitButton);this.exitButton.onclick=()=>this.exit();
  this.tag=document.createElement('button');this.tag.id='homeSaleTag';this.tag.type='button';this.tag.className='home-sale-tag';this.tag.textContent='For Sale! See your bank for details!';this.tag.hidden=true;host.append(this.tag);this.tag.onclick=()=>world.onHouseDetails();
  this.panel=document.createElement('div');this.panel.className='classic-first-person-controls home-first-person-controls';this.panel.hidden=true;this.panel.innerHTML='<span>Home · WASD / arrows · Drag to look · Esc: exit</span><div class="classic-move-pad" role="group" aria-label="Move inside your house"><button type="button" data-home-move="KeyW" aria-label="Move forward">↑</button><button type="button" data-home-move="KeyA" aria-label="Move left">←</button><button type="button" data-home-move="KeyS" aria-label="Move backward">↓</button><button type="button" data-home-move="KeyD" aria-label="Move right">→</button></div>';host.append(this.panel);
  this.abort=new AbortController();const signal=this.abort.signal,c=world.container;
  c.addEventListener('keydown',e=>{if(!this.active||this.modalOpen())return;if(directions[e.code]||e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();}if(directions[e.code])this.keys.add(e.code);else if(e.code==='Escape')this.exit()},{capture:true,signal});
  c.addEventListener('keyup',e=>this.keys.delete(e.code),{capture:true,signal});
  const clear=()=>{this.keys.clear();this.touch.clear()};c.addEventListener('blur',clear,{signal});window.addEventListener('blur',clear,{signal});document.addEventListener('visibilitychange',clear,{signal});
  for(const b of this.panel.querySelectorAll('[data-home-move]')){b.addEventListener('pointerdown',e=>{e.preventDefault();c.focus({preventScroll:true});b.setPointerCapture(e.pointerId);this.touch.add(b.dataset.homeMove)},{signal});for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,()=>this.touch.delete(b.dataset.homeMove),{signal})}
 }
 available(){return this.world.location==='neighborhood'&&!!this.world.home}
 owned(){return !!this.world.state?.upgrades?.includes('house')}
 modalOpen(){return !!this.world.container.closest('#ll-app')?.querySelector('#modal.show')}
 near(){const p=this.world.avatarController.avatar.group.position;return this.available()&&this.world.avatarController.enabled&&Math.hypot(p.x-HOME_FRONT.x,p.z-HOME_FRONT.z)<2.25}
 sync(){if(this.active&&(!this.available()||!this.owned()))this.deactivate();this.tag.hidden=!this.near()||this.owned();this.world.container.dataset.homeOwned=String(this.owned());}
 enter(view=null){
  if(!this.available()||!this.owned()||this.modalOpen()||this.world.paused||(!view&&!this.near()))return false;
  this.world.classicInterior.deactivate();this.active=true;this.position=validHomePosition(view?.position)?{...view.position}:{x:0,z:2.35};this.yaw=Number.isFinite(view?.yaw)?view.yaw:0;this.pitch=Number.isFinite(view?.pitch)?THREE.MathUtils.clamp(view.pitch,-1.15,1.15):0;
  this.world.home.userData.room.doorOpen=1;this.world.view='home';this.exitButton.hidden=false;this.panel.hidden=false;this.tag.hidden=true;
  this.hideAvatar();this.world.onHome();this.world.audio.unlock();this.world.audio.effect('door');this.updateCamera();this.world.container.focus({preventScroll:true});this.publish();return true;
 }
 hideAvatar(){const a=this.world.avatarController;a.enabled=false;a.avatar.group.visible=false;a.stool.visible=false;a.panel.hidden=true;a.toggle.hidden=true;a.toggle.textContent='Walk around';a.toggle.setAttribute('aria-pressed','false');}
 deactivate(){this.active=false;this.keys.clear();this.touch.clear();this.exitButton.hidden=true;this.panel.hidden=true;this.world.avatarController.toggle.hidden=false;this.world.weatherEffects.shelter=null;this.world.weatherEffects.offsetX=0;this.world.container.dataset.homeInterior='false';this.world.container.dataset.firstPerson='false';this.world.container.dataset.cameraType='orthographic';}
 reset(){this.deactivate();this.tag.hidden=true;this.position={x:0,z:2.35};this.yaw=0;this.pitch=0;}
 exit(){if(!this.active)return;this.deactivate();this.world.onBack();const a=this.world.avatarController;a.setEnabled(true);a.avatar.group.position.set(HOME_FRONT.x,.15,HOME_FRONT.z+1.05);a.publish();this.world.home.userData.room.doorOpen=0;this.world.updateCameraGoal();this.world.audio.effect('door');}
 look(dx,dy){this.yaw-=dx*.006;this.pitch=THREE.MathUtils.clamp(this.pitch-dy*.005,-1.15,1.15);this.updateCamera()}
 updateCamera(){this.camera.aspect=this.world.container.clientWidth/Math.max(1,this.world.container.clientHeight);this.camera.updateProjectionMatrix();this.camera.position.set(HOME_CENTER.x+this.position.x,1.88,HOME_CENTER.z+this.position.z);this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ');this.camera.updateMatrixWorld(true);}
 update(dt,time){
  if(this.available())this.world.home.userData.room.hinge.rotation.y=-this.world.home.userData.room.doorOpen*1.45;
  if(this.active){
   if(this.modalOpen()){this.keys.clear();this.touch.clear();return}
   const input={x:0,z:0};for(const code of new Set([...this.keys,...this.touch])){input.x+=directions[code][0];input.z+=directions[code][1]}
   const p=moveInHome(this.position,input,this.yaw,dt);if(Math.hypot(p.x-this.position.x,p.z-this.position.z)>.0001&&time-(this.lastStep||0)>.31){this.world.audio.effect('step');this.lastStep=time}this.position=p;this.hideAvatar();this.updateCamera();
   this.world.weatherEffects.shelter={minX:HOME_CENTER.x-3.6,maxX:HOME_CENTER.x+3.6,minZ:HOME_CENTER.z-3.15,maxZ:HOME_CENTER.z+3.15,maxY:3.5};this.world.weatherEffects.offsetX=HOME_CENTER.x;
  }
  this.sync();this.publish();
 }
 interact(raycaster){
  if(!this.available())return false;
  const room=this.world.home.userData.room,hit=raycaster.intersectObject(room.doors,true)[0];if(!hit)return false;
  const wall=raycaster.intersectObject(room.body,true)[0];if(wall&&wall.distance<hit.distance-.1)return false;
  if(this.active)this.exit();else if(this.near()){if(this.owned())this.enter();else this.world.onHouseDetails()}else return false;
  return true;
 }
 snapshot(){return this.active?{position:{...this.position},yaw:this.yaw,pitch:this.pitch}:null}
 publish(){
  const c=this.world.container;c.dataset.homeInterior=String(this.active);c.dataset.nearHome=String(this.near());
  if(this.active){c.dataset.firstPerson='true';c.dataset.cameraType='perspective';c.dataset.avatarState='home';c.dataset.homePosition=JSON.stringify({x:+this.position.x.toFixed(3),z:+this.position.z.toFixed(3)});c.dataset.homeYaw=String(+this.yaw.toFixed(3));}
  if(this.available()){const p=new THREE.Vector3(HOME_FRONT.x,1.55,HOME_FRONT.z+.1).project(this.world.currentCamera());c.dataset.homeDoorScreen=JSON.stringify({x:(p.x+1)/2,y:(1-p.y)/2});}
 }
 dispose(){this.abort.abort();this.exitButton.remove();this.tag.remove();this.panel.remove()}
}
