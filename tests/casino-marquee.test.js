import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {CasinoPatronSchedule,CasinoCrowd} from '../src/casino-patrons.js';
import {buildCasinoParking,CASINO_PARKING} from '../src/casino-parking.js';
import {CASINO_CENTER,CASINO_FRONT} from '../src/casino-model.js';
import {sceneColliders,sceneGround} from '../src/player-controller.js';
import {blocked,WALKING_AREAS} from '../src/player-movement.js';
import {casinoDoorPortalHit} from '../src/casino-interior.js';
import {DOWNTOWN_LOTS,lotBounds} from '../src/downtown-layout.js';
const fakeCasino=()=>{const slots=[];for(const [x,angle]of [[-5.25,Math.PI/2],[5.25,-Math.PI/2]])for(const z of [-2.8,-.9,1,2.9]){const group=new THREE.Group();group.position.set(x,0,z);group.rotation.y=angle;slots.push({index:slots.length,group})}for(const x of [-3.6,-1.2,1.2,3.6]){const group=new THREE.Group();group.position.set(x,0,-4.45);slots.push({index:slots.length,group})}return {root:new THREE.Group(),slots}};
test('actual crowd rigs move and visitors turn over within a minute, including slow-frame timing and pause',()=>{
 const casino=fakeCasino(),crowd=new CasinoCrowd(casino);crowd.schedule.random=()=>.1;const before=new Map([...crowd.rigs].map(([id,r])=>[id,r.group.position.clone()]));
 let moved=false;for(let t=1;t<=60;t++){crowd.update(.2,t);for(const [id,rig]of crowd.rigs)if(before.has(id)&&rig.group.position.distanceTo(before.get(id))>.1)moved=true;assert.ok(crowd.rigs.size<=4);assert.equal(crowd.root.children.length,crowd.schedule.actors.length)}
 assert.ok(moved);assert.ok(crowd.schedule.serial>4);assert.ok(crowd.schedule.departures>0);assert.ok(crowd.schedule.time>=59);const clock=crowd.schedule.time;crowd.pause();crowd.update(.1,600);assert.ok(crowd.schedule.time-clock<.2);
});
test('front and rear lots have parked solid cars, clear entry walk, and no neighboring building overlap',()=>{
 const root=new THREE.Group(),parking=buildCasinoParking(root);assert.equal(parking.userData.parkedCars,6);assert.ok(CASINO_PARKING[0].maxZ>CASINO_FRONT.z);assert.ok(CASINO_PARKING[1].maxZ<CASINO_CENTER.z-3.3);
 for(const lot of CASINO_PARKING)for(const other of DOWNTOWN_LOTS){const b=lotBounds(other);assert.ok(lot.maxX<=b.minX||lot.minX>=b.maxX||lot.maxZ<=b.minZ||lot.minZ>=b.maxZ)}
 const colliders=sceneColliders(root);assert.ok(colliders.length>20);for(let z=CASINO_FRONT.z;z<=1.3;z+=.2)assert.equal(blocked(CASINO_CENTER.x,z,colliders,WALKING_AREAS.downtown.bounds,.25),false);
 assert.ok(sceneGround(root).length>4);assert.equal(blocked(-32.1,-7.1,colliders,WALKING_AREAS.downtown.bounds,.25),true);
});

test('open doorway portal remains selectable, and patrons do not clip through the first-person camera',()=>{const origin=new THREE.Vector3(CASINO_FRONT.x,1.1,CASINO_FRONT.z+.4);assert.ok(casinoDoorPortalHit(new THREE.Ray(origin,new THREE.Vector3(0,0,-1))));assert.equal(casinoDoorPortalHit(new THREE.Ray(origin,new THREE.Vector3(0,0,1))),null);const crowd=new CasinoCrowd(fakeCasino()),actor=crowd.schedule.actors[0];crowd.update(0,0,actor.position);assert.equal(crowd.rigs.get(actor.id).group.visible,false);crowd.update(0,0,{x:0,z:4.2});assert.equal(crowd.rigs.get(actor.id).group.visible,true)});
