import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {movePlayer,blocked,nearStand,WALKING_AREAS,groundElevation} from '../src/player-movement.js';
import {PlayerAvatar} from '../src/avatar.js';
import {sceneColliders,sceneGround} from '../src/player-controller.js';
import {box} from '../src/models.js';

test('movement normalizes diagonals and rotates with the camera',()=>{
  const p={x:0,z:0},single=movePlayer(p,{x:1,z:0},0,.05,[]),diagonal=movePlayer(p,{x:1,z:1},0,.05,[]);
  assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.z)-single.x)<1e-10);
  const rotated=movePlayer(p,{x:0,z:-1},Math.PI/2,.05,[]);
  assert.ok(rotated.x<0);assert.ok(Math.abs(rotated.z)<1e-10);
});
test('walls stop travel, allow sliding and cannot be crossed during a delayed frame',()=>{
  const walls=[{minX:.5,maxX:.6,minZ:-10,maxZ:10}];let p={x:0,z:0};
  for(let i=0;i<20;i++)p=movePlayer(p,{x:1,z:1},0,1,walls);
  assert.ok(p.x<=.25);assert.ok(p.z>1);assert.equal(blocked(p.x,p.z,walls),false);
  p={x:0,z:0};for(let i=0;i<1000;i++)p=movePlayer(p,{x:0,z:-1},0,.05,[]);
  assert.ok(p.z>=-16.75);assert.equal(nearStand({x:-3,z:1.25}),true);assert.equal(nearStand({x:16,z:9}),false);
});
test('collision capture includes solids but excludes floors and overhead roofs',()=>{
  const g=new THREE.Group();box(g,0,0,0,150,.2,150,'#888888');box(g,2,1,0,1,2,1,'#888888');box(g,0,4,0,10,.3,10,'#888888');
  const obstacles=sceneColliders(g);assert.equal(obstacles.length,1);assert.equal(blocked(2,0,obstacles),true);assert.equal(blocked(0,0,obstacles),false);
});
test('appearance changes rebuild the rig while retaining movement transform and independent slots',()=>{
  const avatar=new PlayerAvatar(new THREE.Group());avatar.group.position.set(2,.16,4);avatar.group.rotation.y=.8;
  const old=avatar.rig;avatar.setAppearance({shirt:'#123abc',skin:'#aabbcc',pants:'invalid'});
  assert.equal(avatar.appearance.shirt,'#123abc');assert.equal(avatar.appearance.pants,'#275b85');assert.notEqual(avatar.rig,old);
  assert.equal(avatar.group.position.x,2);assert.equal(avatar.group.rotation.y,.8);assert.ok(avatar.slots.hair);assert.equal(avatar.slots.arms.length,2);
  assert.equal(avatar.slots.body.children[0].material.color.getHexString(),'123abc');avatar.dispose();
});

test('park pond and downtown subway entrance block walking below the solid capture height',()=>{
  for(const [name,point] of [['park',{x:-5,z:-7.5}],['downtown',{x:-14,z:-12.5}]]){
    const area=WALKING_AREAS[name];assert.equal(blocked(point.x,point.z,area.barriers,area.bounds),true);
    assert.equal(blocked(-3,1.25,area.barriers,area.bounds),false);
  }
});
test('waterfront blocks ocean travel but allows the boardwalk, sand and full pier',()=>{
  const {bounds,barriers}=WALKING_AREAS.waterfront;
  for(const [x,z] of [[0,6],[5.9,12],[8.9,12],[7.4,23.5]])assert.equal(blocked(x,z,barriers,bounds),true);
  for(const [x,z] of [[-3,1.25],[-3,3],[0,-4],[7.4,4],[7.4,12],[7.4,23.2]])assert.equal(blocked(x,z,barriers,bounds),false);
  let p={x:0,z:3};for(let i=0;i<100;i++)p=movePlayer(p,{x:0,z:1},0,.05,barriers,bounds);
  assert.ok(p.z<=3.75);
  p={x:7.4,z:3};for(let i=0;i<100;i++)p=movePlayer(p,{x:0,z:1},0,.05,barriers,bounds);
  assert.ok(p.z>20);assert.equal(blocked(p.x,p.z,barriers,bounds),false);
});

test('player feet follow grass, sand, paving and wooden decks without floating',()=>{
  const g=new THREE.Group();box(g,0,-.23,0,100,.4,100,'#555555');box(g,0,.1,1,4,.17,2,'#aaaaaa');
  const surfaces=sceneGround(g);
  assert.ok(Math.abs(groundElevation(surfaces,0,1)-.16)<1e-10);
  assert.ok(Math.abs(groundElevation(surfaces,0,-5)-(-.055))<1e-10);
  box(g,10,-.24,0,4,.48,4,'#ddddaa');
  assert.ok(Math.abs(groundElevation(sceneGround(g),10,0)-(-.025))<1e-10);
});
