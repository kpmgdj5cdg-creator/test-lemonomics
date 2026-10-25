import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {buildStoreElectronics} from '../src/store-electronics.js';
import {STORE_FIXTURES,validStorePosition,storeShopperPath} from '../src/store-floorplan.js';
import {buildStoreFront} from '../src/store-front-model.js';
test('front electronics adds low wall shelves in the entrance corner and preserves original tall gondolas',()=>{
 const racks=STORE_FIXTURES.filter(f=>f.kind==='front-electronics');assert.equal(racks.length,3);assert.ok(racks.every(f=>f.half&&f.wallMounted&&f.z>0));const original=STORE_FIXTURES.filter(f=>f.kind==='sports');assert.equal(original.length,3);original.forEach((f,i)=>{assert.ok(Math.abs(f.x+15.145)<1e-8);assert.ok(Math.abs(f.z-[-1.95,-5.85,-9.75][i])<1e-8);assert.equal(f.width,4.5);assert.equal(f.depth,1.3)});assert.ok(original.every(f=>!f.half));assert.equal(STORE_FIXTURES.filter(f=>f.kind==='electronics-wall').length,1);assert.equal(STORE_FIXTURES.filter(f=>f.kind==='carts').length,1);assert.ok(STORE_FIXTURES.find(f=>f.kind==='carts').x>0);
 for(const p of [{x:-14,z:8.5},{x:-17.8,z:6},{x:-18.56,z:-5.85}]){assert.ok(validStorePosition(p,.62));assert.ok(storeShopperPath({x:0,z:9.25},p,true).length)}
 const front=buildStoreFront(new THREE.Group()),r=front.fixtures.getObjectByName('shopster-front-electronics');assert.ok(new THREE.Box3().setFromObject(r).max.y<2);assert.ok(new THREE.Box3().setFromObject(r.parent).max.y<2,'no sample laptops remain above the low shelves');assert.ok(new THREE.Box3().setFromObject(front.fixtures.getObjectByName('shopster-sports')).max.y>3.7);front.electronics.broadcast.dispose();
});
test('all sports TVs share one animated render target, respect frame cap and restore renderer state',()=>{
 const e=buildStoreElectronics(new THREE.Group()),b=e.broadcast;assert.equal(e.screens.length,3);assert.deepEqual(e.screens.map(s=>s.parent.position.z),[2.1,5.4,8.7]);assert.ok(e.screens.every(s=>s.material===b.material&&s.material.map===b.target.texture));
 const original={},renderer={target:original,shadowMap:{enabled:true},getRenderTarget(){return this.target},setRenderTarget(t){this.target=t},render(scene,camera){assert.equal(scene,b.scene);assert.equal(camera,b.camera);this.renders=(this.renders||0)+1}};
 b.update(renderer,.05);const first=b.ball.position.clone();b.update(renderer,.01);assert.equal(renderer.renders,1);b.update(renderer,.1);assert.equal(renderer.renders,2);assert.ok(first.distanceTo(b.ball.position)>.01);assert.equal(renderer.target,original);assert.equal(renderer.shadowMap.enabled,true);assert.ok(b.players.every(p=>p.legs.every(l=>l.children.length)));
 renderer.render=()=>{throw Error('context interrupted')};assert.throws(()=>b.update(renderer,.1));assert.equal(renderer.target,original);assert.equal(renderer.shadowMap.enabled,true);b.dispose();b.dispose();assert.ok(b.disposed);
});
