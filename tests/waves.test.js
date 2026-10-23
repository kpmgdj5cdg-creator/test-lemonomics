import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {animateWaterfront,waveHeight} from '../src/waterfront.js';
import {batch,box,group} from '../src/models.js';

function fixture(){
 const environment=new THREE.Group(),boat=group(environment,-6.5,-.13,12.8);boat.rotation.y=-.2;
 box(boat,0,.1,0,3.4,.42,1.45,'#e4a758');batch(boat);
 const surf=group(environment),band=group(surf,0,0,8);band.userData.baseZ=8;box(band,0,0,0,2,.04,.1,'#e8f3dc');batch(band);
 const geometry=new THREE.PlaneGeometry(10,10,4,4);geometry.rotateX(-Math.PI/2);geometry.translate(0,0,12);
 const surface=new THREE.Mesh(geometry);environment.add(surface);batch(environment);
 return {environment,boat,surf,surface};
}
test('water waves and moored boat move together after scenery batching without drifting',()=>{
 const w=fixture(),samples=[];
 for(const t of [0,1,2,4,8,25,100]){
  animateWaterfront(w,t,false);const b=w.boat;
  assert.equal(b.parent,w.environment);assert.equal(b.position.x,-6.5);assert.equal(b.position.z,12.8);assert.equal(b.rotation.y,-.2);
  assert.equal(b.position.y,-.13+waveHeight(-6.5,12.8,t));assert.ok(Math.abs(b.rotation.x)<.2);assert.ok(Math.abs(b.rotation.z)<.2);
  assert.ok(w.surface.geometry.attributes.normal.array.every(Number.isFinite));samples.push(b.position.y);
 }
 assert.ok(Math.max(...samples)-Math.min(...samples)>.08);
 const p=w.surface.geometry.attributes.position;assert.equal(p.getY(7),Math.fround(-.095+waveHeight(p.getX(7),p.getZ(7),100)));
});
test('surf stays out of dry sand and reduced motion freezes waves and boat',()=>{
 assert.equal(waveHeight(1,3,10),0);assert.equal(waveHeight(1,4,10),0);
 const w=fixture();animateWaterfront(w,3,false);animateWaterfront(w,40,true);
 const y=w.boat.position.y,water=Array.from(w.surface.geometry.attributes.position.array);animateWaterfront(w,90,true);
 assert.equal(w.boat.position.y,y);assert.deepEqual(Array.from(w.surface.geometry.attributes.position.array),water);
});
