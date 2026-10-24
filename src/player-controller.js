import * as THREE from 'three';
import {PlayerAvatar} from './avatar.js';
import {box,group,disposeGroup} from './models.js';
import {movePlayer,nearStand,blocked,WALKING_AREAS} from './player-movement.js';
import {groundElevation} from './player-movement.js';

// Capture individual solids before the scenery is merged for rendering.
export function sceneColliders(environment){
  environment.updateMatrixWorld(true);const obstacles=[];
  environment.traverse(o=>{
    if(!o.isMesh||o.geometry.type!=='BoxGeometry')return;
    const b=new THREE.Box3().setFromObject(o);
    if(b.max.y<=.32||b.min.y>=1.6)return;
    obstacles.push({minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z});
  });return obstacles;
}
// Low, horizontal terrain stays walkable. Keep its top surface separate from solids.
export function sceneGround(environment){
  environment.updateMatrixWorld(true);const surfaces=[];
  environment.traverse(o=>{
    if(!o.isMesh||o.geometry.type!=='BoxGeometry')return;
    const b=new THREE.Box3().setFromObject(o);
    if(b.max.y>.32||b.max.y<-.1)return;
    surfaces.push({minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z,height:b.max.y});
  });return surfaces;
}
const directions={KeyW:[0,-1],ArrowUp:[0,-1],KeyS:[0,1],ArrowDown:[0,1],KeyA:[-1,0],ArrowLeft:[-1,0],KeyD:[1,0],ArrowRight:[1,0]};
export class PlayerController{
  constructor(world){
    this.world=world;this.keys=new Set();this.touch=new Set();this.enabled=false;this.lastShop=null;this.location=world.location;
    this.avatar=new PlayerAvatar(world.scene);
    // A low wooden step lets this small character see over the existing counter.
    this.stool=group(world.scene,-3,0,-.38);
    box(this.stool,0,.71,0,.7,.08,.6,'#c69c64');
    for(const x of [-.25,.25])box(this.stool,x,.5,0,.12,.34,.48,'#98794f');
    this.parkAtStand();
    this.abort=new AbortController();const signal=this.abort.signal,c=world.container;
    const nav=c.parentElement.querySelector('.scene-nav');
    this.toggle=document.createElement('button');this.toggle.type='button';this.toggle.className='scene-chip';this.toggle.textContent='Walk around';this.toggle.setAttribute('aria-pressed','false');nav.append(this.toggle);
    this.panel=document.createElement('div');this.panel.className='avatar-controls';this.panel.hidden=true;
    this.panel.innerHTML='<div class="avatar-help">YOU · WASD / arrows to walk · Esc for overview</div><div class="avatar-pad" role="group" aria-label="Move your avatar"><button type="button" data-move="KeyW" aria-label="Walk forward">↑</button><button type="button" data-move="KeyA" aria-label="Walk left">←</button><button type="button" data-move="KeyS" aria-label="Walk backward">↓</button><button type="button" data-move="KeyD" aria-label="Walk right">→</button></div><button type="button" class="avatar-interact">Visit my stand · E</button>';
    c.parentElement.append(this.panel);this.interact=this.panel.querySelector('.avatar-interact');
    this.toggle.addEventListener('click',()=>this.setEnabled(!this.enabled),{signal});
    this.interact.addEventListener('click',()=>this.visitStand(),{signal});
    c.addEventListener('keydown',e=>{
      if(!this.enabled)return;
      if(directions[e.code]){e.preventDefault();e.stopImmediatePropagation();this.keys.add(e.code)}
      else if(e.code==='KeyE'){e.preventDefault();this.visitStand()}
      else if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();this.setEnabled(false)}
    },{signal});
    c.addEventListener('keyup',e=>{if(directions[e.code]){this.keys.delete(e.code);if(this.enabled)e.preventDefault()}},{signal});
    const clear=()=>{this.keys.clear();this.touch.clear()};
    c.addEventListener('blur',clear,{signal});window.addEventListener('blur',clear,{signal});document.addEventListener('visibilitychange',clear,{signal});
    for(const b of this.panel.querySelectorAll('[data-move]')){
      b.addEventListener('pointerdown',e=>{e.preventDefault();c.focus({preventScroll:true});b.setPointerCapture(e.pointerId);this.touch.add(b.dataset.move)},{signal});
      for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,()=>this.touch.delete(b.dataset.move),{signal});
    }
    this.publish();
  }
  setEnabled(enabled){
    this.world.storeFocus=false;
    enabled=enabled&&!!WALKING_AREAS[this.world.location];
    if(this.world.container.closest('#ll-app')?.querySelector('#modal.show'))return;
    if(enabled){
      this.world.onBack();this.world.zoom=1;
      // Every walk begins at the front of the player's lemonade stand.
      this.avatar.group.position.set(-3,.16,1.25);this.avatar.group.rotation.y=0;
      this.world.container.focus({preventScroll:true});
    }
    this.enabled=enabled;this.keys.clear();this.touch.clear();
    if(enabled){this.avatar.group.visible=true;this.stool.visible=false}else this.parkAtStand();
    this.panel.hidden=!enabled;
    this.toggle.textContent=enabled?'Overview':'Walk around';this.toggle.setAttribute('aria-pressed',String(enabled));
    this.world.updateCameraGoal();this.publish();
  }
  parkAtStand(){
    if(this.world.casinoInterior?.active||this.world.casinoInterior?.entering||this.world.homeInterior?.active||this.world.classicInterior?.active||this.world.classicInterior?.entering){this.avatar.group.visible=false;this.stool.visible=false;return;}
    // Feet rest on a step inside the stand, behind the front counter.
    const anchor=this.world.player?.avatarAnchor||{x:0,y:.75,z:.42};
    this.avatar.group.position.set(-3+anchor.x,anchor.y,-.8+anchor.z);this.avatar.group.rotation.y=0;
    this.stool.position.set(-3+anchor.x,0,-.8+anchor.z);
    this.avatar.group.visible=!!WALKING_AREAS[this.world.location];this.stool.visible=this.avatar.group.visible;
    this.avatar.animate(0,false,true);
  }
  snapshot(sceneView){return {casinoInterior:this.world.casinoInterior?.snapshot(),homeInterior:this.world.homeInterior?.snapshot(),firstPerson:this.world.classicInterior?.snapshot(),location:this.world.location,walking:this.enabled,position:this.avatar.group.position.toArray(),rotation:this.avatar.group.rotation.y,angle:this.world.angle,zoom:this.world.zoom,sceneView};}
  restore(view){
    if(!view||view.location!==this.world.location)return;
    if(view.casinoInterior&&this.world.casinoInterior.available()){this.world.casinoInterior.enter(view.casinoInterior);return}
    if(view.homeInterior&&this.world.homeInterior.owned()){this.world.homeInterior.enter(view.homeInterior);return}
    if(view.firstPerson&&this.world.player?.style==='classic'){this.world.classicInterior.enterInstant(view.firstPerson);return}
    if(Number.isFinite(view.angle))this.world.angle=THREE.MathUtils.clamp(view.angle,-.9,1.25);
    if(view.walking){
      this.setEnabled(true);
      const p=view.position;
      if(Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)&&!blocked(p[0],p[2],this.obstacles(),WALKING_AREAS[this.world.location].bounds)){
        this.avatar.group.position.set(p[0],groundElevation(this.world.sceneGround,p[0],p[2]),p[2]);
        if(Number.isFinite(view.rotation))this.avatar.group.rotation.y=view.rotation;
      }
    }
    if(Number.isFinite(view.zoom))this.world.zoom=THREE.MathUtils.clamp(view.zoom,['neighborhood','downtown'].includes(this.world.location)?.4:.8,1.4);
    this.world.updateCameraGoal();this.publish();
  }
  syncLocation(){
    const available=!!WALKING_AREAS[this.world.location];this.toggle.hidden=!available;
    if(this.location!==this.world.location){this.location=this.world.location;this.lastShop=null;this.setEnabled(false)}
    if(!available&&this.enabled)this.setEnabled(false);
    if(!this.enabled){this.parkAtStand();this.publish();}
  }
  obstacles(){
    const world=this.world,stands=[{x:-3,z:-.8,width:world.player?.width||3.5}];
    if(world.rival)stands.push({x:world.rivalPosition.x,z:world.rivalPosition.z,width:world.rival.width});
    return [...(world.sceneObstacles||[]),...(WALKING_AREAS[world.location]?.barriers||[]),...stands.map(s=>({minX:s.x-s.width/2-.18,maxX:s.x+s.width/2+.18,minZ:s.z-1.53,maxZ:s.z+1.53}))];
  }
  nearShop(){const p=this.avatar.group.position;const shops=this.world.location==='neighborhood'?[{id:'market',name:'Maple Market',x:-10,z:-3.15}]:this.world.location==='downtown'?[{id:'bookstore',name:'Bookstore',x:-9.55,z:-3.65},{id:'market',name:'Maple Market',x:4.5,z:-16}]:[];return shops.find(shop=>Math.hypot(p.x-shop.x,p.z-shop.z)<1.15)}
  visitStand(){if(this.enabled&&this.world.casinoInterior?.near()){this.world.casinoInterior.beginEntry();return}if(this.enabled&&this.world.homeInterior?.near()){if(this.world.homeInterior.owned())this.world.homeInterior.enter();else this.world.onHouseDetails();return}const shop=this.nearShop();if(this.enabled&&shop)this.world.onShop(shop.id);else if(this.enabled&&nearStand(this.avatar.group.position))this.world.onSelect()}
  update(dt,time,reducedMotion){
    if(!this.enabled)return;
    const root=this.world.container.closest('#ll-app');if(this.world.paused||root?.hidden||root?.querySelector('#modal.show')||root?.querySelector('#phaseLabel')?.dataset.closed==='true'){this.keys.clear();this.touch.clear();return}
    const input={x:0,z:0};for(const code of new Set([...this.keys,...this.touch])){input.x+=directions[code][0];input.z+=directions[code][1]}
    const p=this.avatar.group.position,obstacles=this.obstacles(),bounds=WALKING_AREAS[this.world.location].bounds;
    // Upgrades can enlarge the stand while walking. Restore a clear approach if needed.
    if(blocked(p.x,p.z,obstacles,bounds))p.set(-3,.16,1.25);
    const next=movePlayer(p,input,this.world.angle,dt,obstacles,bounds),moving=Math.hypot(next.x-p.x,next.z-p.z)>.0001;
    if(moving)this.avatar.group.rotation.y=Math.atan2(next.x-p.x,next.z-p.z);
    p.set(next.x,groundElevation(this.world.sceneGround,next.x,next.z),next.z);
    if(moving&&time-(this.lastStep||0)>.31){this.world.audio?.effect('step');this.lastStep=time}
    this.avatar.animate(time,moving,reducedMotion);const shop=this.nearShop();const home=this.world.homeInterior?.near();const casino=this.world.casinoInterior?.near();this.interact.hidden=!casino&&!home&&!shop&&!nearStand(p);this.interact.textContent=casino?'Enter casino · E':home?(this.world.homeInterior.owned()?'Enter my house · E':'House for sale · E'):shop?'Visit '+shop.name+' · E':'Visit my stand · E';if(shop&&this.lastShop!==shop.id){this.lastShop=shop.id;this.keys.clear();this.touch.clear();this.world.onShop(shop.id)}else if(!shop)this.lastShop=null;
    this.world.updateCameraGoal();this.publish();
  }
  publish(){const c=this.world.container,p=this.avatar.group.position;c.dataset.walking=String(this.enabled);c.dataset.avatarState=this.avatar.group.visible?(this.enabled?'walking':'at-stand'):'unavailable';c.dataset.avatarPosition=JSON.stringify({x:+p.x.toFixed(3),z:+p.z.toFixed(3)});c.dataset.nearStand=String(nearStand(p));c.dataset.nearShop=this.nearShop()?.id||'';if(this.world.classicInterior?.active)this.world.classicInterior.publish();if(this.world.homeInterior?.active)this.world.homeInterior.publish();if(this.world.casinoInterior?.active)this.world.casinoInterior.publish();}
  dispose(){this.abort.abort();this.avatar.dispose();disposeGroup(this.stool);this.toggle.remove();this.panel.remove()}
}
