import * as THREE from 'three';
import {group,box,disposeGroup} from './models.js';
import {storeCart} from './store-front-model.js';
import {TOY_SHELF_1,GAME_SLOTS,gameSlot,normalizeToyCart,addToyGame,returnToyGame} from './store-toy-catalog.js';

export class StoreToyShopping{
 constructor(interior,host,nav){this.interior=interior;this.world=interior.world;this.key=null;this.open=false;
  this.button=document.createElement('button');this.button.type='button';this.button.id='storeShoppingCartBtn';this.button.className='scene-chip';this.button.textContent='Cart (0)';this.button.hidden=true;nav.append(this.button);
  this.panel=document.createElement('aside');this.panel.className='store-shopping-cart';this.panel.id='storeShoppingCart';this.panel.setAttribute('aria-label','Shopping cart');this.panel.hidden=true;host.append(this.panel);
  this.status=document.createElement('p');this.status.className='store-shopping-status';this.status.id='storeShoppingStatus';this.status.setAttribute('role','status');this.status.hidden=true;host.append(this.status);
  this.button.onclick=()=>{if(this.world.paused||this.interior.modalOpen())return;this.open=!this.open;this.render();if(!this.open)this.world.container.focus({preventScroll:true})};
  this.rig=group(this.world.scene);this.rig.name='player-shopster-cart';this.rig.scale.setScalar(.7);this.basket=storeCart(this.rig);this.basket.rotation.y=Math.PI;this.contents=group(this.basket);this.rig.visible=false;
 }
 cart(){return normalizeToyCart(this.world.state?.shopsterCart)}
 message(text){this.status.textContent=text;this.status.hidden=false;this.messageUntil=performance.now()+3500}
 change(cart,text){if(!this.interior.active||this.world.paused||this.interior.modalOpen())return;const saved=this.world.onStoreCart(cart);this.sync(true);this.message(saved===false?'In your cart. Save your game before closing.':text)}
 render(){const cart=this.cart();this.button.hidden=!this.interior.active;this.button.textContent=`Cart (${cart.items.length})`;this.button.setAttribute('aria-expanded',String(this.open));this.panel.hidden=!this.interior.active||!this.open;this.panel.replaceChildren();
  const header=document.createElement('strong');header.textContent='Shopping cart';this.panel.append(header);const close=document.createElement('button');close.type='button';close.textContent='Close';close.onclick=()=>{this.open=false;this.render();this.world.container.focus({preventScroll:true})};this.panel.append(close);
  if(!cart.items.length){const p=document.createElement('p');p.textContent='Your cart is empty. Select a game from toy aisle 1a.';this.panel.append(p)}
  for(const id of cart.items){const s=gameSlot(id),row=document.createElement('div'),label=document.createElement('span'),remove=document.createElement('button');row.className='store-cart-item';label.textContent=`${s.title} · ${s.platform}`;remove.type='button';remove.textContent='Return to shelf';remove.setAttribute('aria-label',`Return ${s.title} to shelf`);remove.onclick=()=>this.change(returnToyGame(this.cart(),id),`${s.title} returned to shelf 1a.`);row.append(label,remove);this.panel.append(row)}
 }
 sync(force=false){const cart=this.cart(),key=cart.items.join('|');this.world.departmentStore?.interior.toyGames.sync(cart);if(force||key!==this.key){this.key=key;this.world.departmentStore?.interior.toyGames.sync(cart);for(const child of [...this.contents.children])disposeGroup(child);cart.items.slice(-6).forEach((id,i)=>{const s=gameSlot(id),g=group(this.contents,-.19+(i%3)*.19,.57,Math.floor(i/3)*.2);g.rotation.x=-.15;box(g,0,0,0,.15,.25,.04,s.color);box(g,0,.015,.025,.115,.19,.008,['#d7b96d','#75a5ac','#ac7d8e'][s.game%3])});this.render()}
  this.button.hidden=!this.interior.active;this.panel.hidden=!this.interior.active||!this.open;this.rig.visible=this.interior.active&&cart.items.length>0;
  if(this.rig.visible){this.rig.position.copy(new THREE.Vector3(.6,-1.3,-1.3).applyMatrix4(this.interior.camera.matrixWorld));this.rig.quaternion.copy(this.interior.camera.quaternion)}
  if(!this.interior.active||performance.now()>(this.messageUntil||0))this.status.hidden=true;
  const hint=this.interior.panel?.querySelector('span');if(hint){this.baseHint??=hint.textContent;const p=this.interior.position,f=TOY_SHELF_1,near=p.z<f.z-f.depth/2&&p.z>f.z-4&&Math.abs(p.x-f.x)<f.width/2+1.3;hint.textContent=near?'Toy aisle 1a · Click a game to add to cart · WASD / arrows · Drag to look · Esc: exit':this.baseHint;}
  this.world.container.dataset.storeShoppingCart=JSON.stringify(cart.items);this.world.container.dataset.toy1aInStock=String(GAME_SLOTS.filter(s=>s.initialStock&&!cart.items.includes(s.id)).length);
 }
 pick(raycaster){const f=TOY_SHELF_1,p=this.interior.position;if(p.z>=f.z-f.depth/2||Math.abs(p.x-f.x)>f.width/2+3)return false;
  const games=this.world.departmentStore.interior.toyGames,hit=raycaster.intersectObjects(games.targets,false)[0];if(!hit||hit.distance>3.2)return false;
  const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true};
  const blocker=raycaster.intersectObject(this.world.departmentStore.root,true).find(h=>visible(h.object)&&h.object.material?.visible!==false&&!(h.object.material?.transparent&&h.object.material.opacity<.5));if(blocker&&blocker.distance<hit.distance-.035)return false;
  const id=hit.object.userData.gameSlots[hit.instanceId],s=gameSlot(id);if(!s)return false;const result=addToyGame(this.cart(),id);
  if(result.added){this.change(result.cart,`${s.title} (${s.platform}) added to your cart.`);this.world.audio.effect('cards')}
  else this.message(s.initialStock?'That game is already in your cart.':'This slot is out of stock.');return true;
 }
 hide(){this.open=false;this.button.hidden=true;this.panel.hidden=true;this.status.hidden=true;this.rig.visible=false}
 dispose(){this.button.remove();this.panel.remove();this.status.remove();disposeGroup(this.rig)}
}
