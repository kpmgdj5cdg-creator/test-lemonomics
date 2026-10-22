import * as THREE from 'three';
import {ROOM_FLOOR,ROOM_EYE,DOOR_X,moveInRoom,validRoomPosition} from './classic-movement.js';
const keys={KeyW:[0,-1],ArrowUp:[0,-1],KeyS:[0,1],ArrowDown:[0,1],KeyA:[-1,0],ArrowLeft:[-1,0],KeyD:[1,0],ArrowRight:[1,0]};
export class ClassicInterior{
 constructor(world){
  this.world=world;this.active=false;this.entering=false;this.position={x:0,z:.85};this.yaw=0;this.pitch=0;this.keys=new Set();this.touch=new Set();this.doorTarget=0;
  this.camera=new THREE.PerspectiveCamera(74,1,.035,150);this.camera.rotation.order='YXZ';
  const nav=world.container.parentElement.querySelector('.scene-nav');
  this.enterButton=document.createElement('button');this.enterButton.type='button';this.enterButton.className='scene-chip';this.enterButton.id='classicEntryBtn';this.enterButton.textContent='Enter stand';this.enterButton.hidden=true;nav.append(this.enterButton);
  this.exitButton=document.createElement('button');this.exitButton.type='button';this.exitButton.className='scene-chip';this.exitButton.id='classicExitBtn';this.exitButton.textContent='Exit stand';this.exitButton.hidden=true;nav.append(this.exitButton);
  this.doorButton=document.createElement('button');this.doorButton.type='button';this.doorButton.className='scene-chip';this.doorButton.id='classicDoorBtn';this.doorButton.hidden=true;nav.append(this.doorButton);
  this.panel=document.createElement('div');this.panel.className='classic-first-person-controls';this.panel.hidden=true;
  this.panel.innerHTML='<span>WASD / arrows · Drag to look · E: doors · Esc: exit</span><div class="classic-move-pad" role="group" aria-label="Move inside the stand"><button type="button" data-room-move="KeyW" aria-label="Move forward">↑</button><button type="button" data-room-move="KeyA" aria-label="Move left">←</button><button type="button" data-room-move="KeyS" aria-label="Move backward">↓</button><button type="button" data-room-move="KeyD" aria-label="Move right">→</button></div>';
  world.container.parentElement.append(this.panel);
  this.enterButton.onclick=()=>this.beginEntry();this.exitButton.onclick=()=>this.exit();this.doorButton.onclick=()=>this.toggleDoors();
  const c=world.container;this.abort=new AbortController();const signal=this.abort.signal;
  c.addEventListener('keydown',e=>{
   if((!this.active&&!this.entering)||this.modalOpen())return;
   if(keys[e.code]||['KeyE','Escape'].includes(e.code)){e.preventDefault();e.stopImmediatePropagation();}
   if(keys[e.code])this.keys.add(e.code);else if(e.code==='Escape')this.exit();else if(e.code==='KeyE'&&!e.repeat)this.toggleDoors();
  },{capture:true,signal});
  c.addEventListener('keyup',e=>{this.keys.delete(e.code)},{capture:true,signal});
  const clear=()=>{this.keys.clear();this.touch.clear()};c.addEventListener('blur',clear,{signal});window.addEventListener('blur',clear,{signal});document.addEventListener('visibilitychange',clear,{signal});
  for(const b of this.panel.querySelectorAll('[data-room-move]')){
   b.addEventListener('pointerdown',e=>{e.preventDefault();c.focus({preventScroll:true});b.setPointerCapture(e.pointerId);this.touch.add(b.dataset.roomMove)},{signal});
   for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,()=>this.touch.delete(b.dataset.roomMove),{signal});
  }
  this.publish();
 }
 available(){return this.world.player?.style==='classic'}
 sync(){
  if(!this.available()){if(this.active||this.entering)this.deactivate();this.enterButton.hidden=true;return}
  const model=this.world.player;if(!validRoomPosition(this.position,model.fridge,this.doorTarget>0))this.position={x:0,z:.35};
  model.doors.target=this.doorTarget;
  this.enterButton.hidden=this.active||this.entering;this.exitButton.hidden=!this.active&&!this.entering;this.doorButton.hidden=!this.active;this.panel.hidden=!this.active;
  if(this.active){this.hideAvatar();this.updateCamera()}
  this.publish();
 }
 beginEntry(){
  if(!this.available()||this.active||this.entering||this.world.paused||this.modalOpen())return;
  this.world.audio.unlock();this.world.audio.effect('door');this.world.onSelect();
  this.entering=true;this.entryProgress=0;this.doorTarget=1;this.keys.clear();
  const avatar=this.world.avatarController;avatar.enabled=false;avatar.panel.hidden=true;avatar.toggle.hidden=true;avatar.toggle.textContent='Walk around';avatar.toggle.setAttribute('aria-pressed','false');avatar.stool.visible=false;avatar.avatar.group.visible=true;
  avatar.avatar.group.position.set(-3+DOOR_X,.16,-.8+2.4);avatar.avatar.group.rotation.y=Math.PI;
  this.world.container.focus({preventScroll:true});this.sync();
 }
 enterInstant(view){
  if(!this.available())return;
  this.entering=false;this.active=true;this.keys.clear();this.touch.clear();
  this.doorTarget=view?.doorOpen===false?0:1;
  this.position=validRoomPosition(view?.position,this.world.player.fridge,this.doorTarget>0)?{...view.position}:{x:0,z:.85};
  this.yaw=Number.isFinite(view?.yaw)?view.yaw:0;this.pitch=Number.isFinite(view?.pitch)?THREE.MathUtils.clamp(view.pitch,-1.15,1.15):0;
  this.world.player.doors.amount=this.doorTarget;this.world.player.doors.target=this.doorTarget;
  this.world.view='firstperson';this.world.player.roof.visible=true;this.hideAvatar();this.sync();this.world.container.focus({preventScroll:true});
 }
 hideAvatar(){const a=this.world.avatarController;a.enabled=false;a.avatar.group.visible=false;a.stool.visible=false;a.panel.hidden=true;a.toggle.hidden=true;a.toggle.textContent='Walk around';a.toggle.setAttribute('aria-pressed','false');}
 modalOpen(){return !!this.world.container.closest('#ll-app')?.querySelector('#modal.show')}
 deactivate(){
  this.active=false;this.entering=false;this.keys.clear();this.touch.clear();this.panel.hidden=true;this.exitButton.hidden=true;this.doorButton.hidden=true;
  this.enterButton.hidden=!this.available();this.world.avatarController.toggle.hidden=false;this.world.weatherEffects.shelter=null;this.world.container.dataset.firstPerson='false';this.world.container.dataset.cameraType='orthographic';
 }
 exit(){
  if(!this.active&&!this.entering)return;
  this.doorTarget=1;if(this.world.player?.doors)this.world.player.doors.amount=1;
  this.deactivate();this.world.onBack();
  const a=this.world.avatarController;a.setEnabled(true);a.avatar.group.position.set(-3+DOOR_X,.16,1.7);a.publish();this.world.audio.effect('door');this.sync();
 }
 reset(){this.deactivate();this.doorTarget=0;if(this.world.player?.doors){this.world.player.doors.amount=0;this.world.player.doors.target=0;}this.position={x:0,z:.85};this.yaw=0;this.pitch=0;}
 toggleDoors(){if(!this.available()||this.entering)return;this.doorTarget=this.doorTarget?0:1;if(!this.doorTarget&&this.active&&this.position.x<-.2&&this.position.z>1.02){this.position.z=.98;this.updateCamera()}this.world.audio.unlock();this.world.audio.effect('door');this.publish();this.world.container.focus({preventScroll:true});}
 look(dx,dy){if(!this.active)return;this.yaw-=dx*.006;this.pitch=THREE.MathUtils.clamp(this.pitch-dy*.005,-1.15,1.15);this.updateCamera();}
 updateCamera(){
  this.camera.aspect=this.world.container.clientWidth/Math.max(1,this.world.container.clientHeight);this.camera.updateProjectionMatrix();
  this.camera.position.set(-3+this.position.x,ROOM_EYE,-.8+this.position.z);this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ');this.camera.updateMatrixWorld(true);
 }
 update(dt,time,reduced){
  const model=this.world.player;if(!model?.doors)return;
  const frozen=this.modalOpen();
  if(!frozen){model.doors.target=this.doorTarget;model.doors.amount=THREE.MathUtils.lerp(model.doors.amount,this.doorTarget,1-Math.exp(-dt*10));}
  model.doors.left.rotation.y=-model.doors.amount*1.45;model.doors.right.rotation.y=model.doors.amount*1.45;
  if(frozen){this.keys.clear();this.touch.clear();this.publish();return}
  if(this.entering){
   if(model.doors.amount>.86)this.entryProgress=Math.min(1,this.entryProgress+dt/1.0);
   const t=this.entryProgress,a=this.world.avatarController.avatar,inside=Math.max(0,(t-.65)/.35);a.group.visible=true;this.world.avatarController.stool.visible=false;
   const x=t<.65?DOOR_X:DOOR_X*(1-inside),z=t<.65?2.4-(t/.65)*1.75:.65+inside*.2;
   a.group.position.set(-3+x,.16+(ROOM_FLOOR-.16)*Math.min(1,t*2),-.8+z);a.group.rotation.y=t<.65?Math.PI:Math.atan2(1.05,.2);a.animate(time,t<1,reduced);
   if(t>=1){this.enterInstant();this.world.onFirstPerson()}
  }else if(this.active){
   const input={x:0,z:0};for(const code of new Set([...this.keys,...this.touch])){input.x+=keys[code][0];input.z+=keys[code][1]}
   const next=moveInRoom(this.position,input,this.yaw,dt,model.fridge,model.doors.amount>.85),moving=Math.hypot(next.x-this.position.x,next.z-this.position.z)>.0001;
   this.position=next;if(moving&&time-(this.lastStep||0)>.29){this.world.audio.effect('step');this.lastStep=time}
   if(next.z>1.41&&next.x<-.32&&model.doors.amount>.85){this.exit();return}
   this.hideAvatar();this.updateCamera();
   this.world.weatherEffects.shelter={minX:-5.05,maxX:-.95,minZ:-2.15,maxZ:.55,maxY:3.03};
  }
  this.publish();
 }
 snapshot(){return this.active?{position:{...this.position},yaw:this.yaw,pitch:this.pitch,doorOpen:!!this.doorTarget}:null}
 projectTargets(camera){
  if(!this.available())return;
  const p=new THREE.Vector3(-3+DOOR_X,1.6,-.8+1.32).project(camera);
  this.world.container.dataset.doorScreen=JSON.stringify({x:(p.x+1)/2,y:(1-p.y)/2});
 }
 publish(){
  const c=this.world.container;c.dataset.firstPerson=String(this.active);c.dataset.enteringStand=String(this.entering);c.dataset.cameraType=this.active?'perspective':'orthographic';
  c.dataset.doorOpen=String(this.doorTarget>0);c.dataset.doorAngle=String(+(this.world.player?.doors?.amount||0).toFixed(3));
  c.dataset.roomPosition=JSON.stringify({x:+this.position.x.toFixed(3),z:+this.position.z.toFixed(3)});c.dataset.roomYaw=String(+this.yaw.toFixed(3));
  this.doorButton.textContent=this.doorTarget?'Close doors':'Open doors';
  if(this.active){c.dataset.avatarState='first-person';c.dataset.avatarPosition=JSON.stringify({x:+(-3+this.position.x).toFixed(3),z:+(-.8+this.position.z).toFixed(3)})}
 }
 dispose(){this.abort.abort();this.enterButton.remove();this.exitButton.remove();this.doorButton.remove();this.panel.remove()}
}
