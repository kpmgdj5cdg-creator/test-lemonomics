import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {DEPARTMENT_STORE as D,STORE_BUILDING_BOUNDS as B,STORE_PARKING_BOUNDS as P,STORE_SPACES,STORE_PARKED_SPACES,STORE_ENTRY} from '../src/department-store-layout.js';
import {DOWNTOWN_LOTS,lotBounds} from '../src/downtown-layout.js';import {CASINO_PARKING} from '../src/casino-parking.js';import {buildDepartmentStore} from '../src/department-store.js';import {sceneColliders,sceneGround} from '../src/player-controller.js';import {blocked,WALKING_AREAS} from '../src/player-movement.js';
const separate=(a,b)=>a.maxX<=b.minX||a.minX>=b.maxX||a.maxZ<=b.minZ||a.minZ>=b.maxZ;
test('northwest department-store parcel clears city buildings and casino lots; relocated shops face across the road',()=>{
 for(const lot of DOWNTOWN_LOTS)for(const area of [B,P])assert.ok(separate(area,lotBounds(lot)),`${lot.shop} overlaps department-store parcel`);
 for(const lot of CASINO_PARKING)for(const area of [B,P])assert.ok(separate(area,lot));
 const hotel=DOWNTOWN_LOTS.find(l=>l.shop==='HOTEL'&&l.x<0),records=DOWNTOWN_LOTS.find(l=>l.shop==='RECORDS'&&l.x< -50);assert.ok(hotel.z>4&&records.z>4);assert.equal(hotel.angle,Math.PI);assert.equal(records.angle,Math.PI);
 assert.ok(!DOWNTOWN_LOTS.some(l=>l.z<0&&[-46,-39].includes(l.x)));assert.ok(B.minX>WALKING_AREAS.downtown.bounds.minX);assert.equal(STORE_SPACES.length,32);assert.equal(STORE_SPACES.filter(s=>s.accessible).length,2);assert.ok(STORE_PARKED_SPACES.length>=10);
});
test('exterior lights switch with night mode; parked cars are solid and the entrance route stays clear',()=>{
 const parent=new THREE.Group(),store=buildDepartmentStore(parent);assert.equal(store.cars,STORE_PARKED_SPACES.length);assert.equal(store.signMaterial.emissiveIntensity,.02);store.setNight(true);assert.equal(store.signMaterial.emissiveIntensity,.9);assert.ok(store.lights.every(l=>l.intensity>0&&l.visible));store.setNight(false);assert.ok(store.lights.every(l=>!l.visible));
 const obstacles=sceneColliders(parent);for(let z=STORE_ENTRY.z+.65;z<=1.3;z+=.2)assert.equal(blocked(D.x,z,obstacles,WALKING_AREAS.downtown.bounds,.25),false,`entry walk blocked at ${z}`);
 const car=STORE_PARKED_SPACES[0];assert.equal(blocked(car.x,car.z,obstacles,WALKING_AREAS.downtown.bounds,.25),true);assert.ok(sceneGround(parent).length>20);
 // All parked cars clear tree islands, bollards and the center path.
 for(const space of STORE_PARKED_SPACES)assert.ok(Math.abs(space.x-D.x)>1.7);
});
