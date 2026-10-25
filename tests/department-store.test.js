import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {DEPARTMENT_STORE as D,STORE_EMPLOYEE_EXTENSION,STORE_SALES_EXTENSION,STORE_WAREHOUSE_EXTENSION,STORE_EMPLOYEE_FRONT,STORE_BACK_Z,STORE_BUILDING_BOUNDS as B,STORE_PARKING_BOUNDS as P,STORE_SPACES,STORE_PARKED_SPACES,STORE_ENTRY,STORE_SIDE_LANES,STORE_REAR_BOUNDS,STORE_REAR_SPACES} from '../src/department-store-layout.js';
import {DOWNTOWN_LOTS,lotBounds} from '../src/downtown-layout.js';import {CASINO_PARKING} from '../src/casino-parking.js';import {buildDepartmentStore} from '../src/department-store.js';import {sceneColliders,sceneGround} from '../src/player-controller.js';import {blocked,WALKING_AREAS} from '../src/player-movement.js';
const EXT=STORE_EMPLOYEE_EXTENSION+STORE_SALES_EXTENSION+STORE_WAREHOUSE_EXTENSION;
const separate=(a,b)=>a.maxX<=b.minX||a.minX>=b.maxX||a.maxZ<=b.minZ||a.minZ>=b.maxZ;
test('northwest department-store parcel clears city buildings and casino lots; relocated shops face across the road',()=>{
 for(const lot of DOWNTOWN_LOTS)for(const area of [B,P,STORE_REAR_BOUNDS])assert.ok(separate(area,lotBounds(lot)),`${lot.shop} overlaps department-store parcel`);
 for(const lot of CASINO_PARKING)for(const area of [B,P,STORE_REAR_BOUNDS])assert.ok(separate(area,lot));
 const hotel=DOWNTOWN_LOTS.find(l=>l.shop==='HOTEL'&&l.x<0),records=DOWNTOWN_LOTS.find(l=>l.shop==='RECORDS'&&l.x< -50);assert.ok(hotel.z>4&&records.z>4);assert.equal(hotel.angle,Math.PI);assert.equal(records.angle,Math.PI);
 assert.ok(!DOWNTOWN_LOTS.some(l=>l.z<0&&[-46,-39].includes(l.x)));assert.ok(B.minX>WALKING_AREAS.downtown.bounds.minX);assert.equal(STORE_SPACES.length,40);assert.equal(STORE_SPACES.filter(s=>s.accessible).length,2);assert.ok(STORE_PARKED_SPACES.length>=10);
});
test('exterior lights switch with night mode; parked cars are solid and the entrance route stays clear',()=>{
 const parent=new THREE.Group(),store=buildDepartmentStore(parent);assert.equal(store.cars,STORE_PARKED_SPACES.length);assert.equal(store.signMaterial.emissiveIntensity,.02);store.setNight(true);assert.equal(store.signMaterial.emissiveIntensity,.9);assert.ok(store.lights.every(l=>l.intensity>0&&l.visible));store.setNight(false);assert.ok(store.lights.every(l=>!l.visible));
 const obstacles=sceneColliders(parent);for(let z=STORE_ENTRY.z+.65;z<=1.3;z+=.2)assert.equal(blocked(D.x,z,obstacles,WALKING_AREAS.downtown.bounds,.25),false,`entry walk blocked at ${z}`);
 const car=STORE_PARKED_SPACES[0];assert.equal(blocked(car.x,car.z,obstacles,WALKING_AREAS.downtown.bounds,.25),true);assert.ok(sceneGround(parent).length>20);
 // All parked cars clear tree islands, bollards and the center path.
 for(const space of STORE_PARKED_SPACES.filter(s=>!s.rear))assert.ok(Math.abs(space.x-D.x)>1.7);
});

test('side drive lanes connect the street to the rear parking aisle without physical obstructions',()=>{
 const parent=new THREE.Group();buildDepartmentStore(parent);const obstacles=sceneColliders(parent),bounds=WALKING_AREAS.downtown.bounds;
 for(const lane of STORE_SIDE_LANES)for(let z=lane.minZ;z<=lane.maxZ;z+=.4)for(const dx of [-1.1,0,1.1])assert.equal(blocked(lane.x+dx,z,obstacles,bounds,.65),false,`side lane obstructed at ${lane.x+dx},${z}`);
 for(let x=STORE_SIDE_LANES[0].x;x<=STORE_SIDE_LANES[1].x;x+=.4)assert.equal(blocked(x,-75.7-EXT,obstacles,bounds,.65),false,`rear aisle obstructed at ${x}`);
 assert.equal(STORE_REAR_SPACES.length,8);assert.ok(STORE_PARKED_SPACES.some(s=>s.rear));
 assert.ok(B.maxX< -45,'store must have a substantial setback from the casino');
});

test('expanded sales floor grows rearward while the street entrance and front parking stay anchored',()=>{
 assert.ok(Math.abs(D.depth-(42+EXT))<1e-8);assert.equal(B.maxZ,-28.5);assert.ok(Math.abs(B.maxZ-B.minZ-(42+EXT))<1e-8);assert.ok(Math.abs((STORE_EMPLOYEE_FRONT-STORE_BACK_Z)/3.5-1.66*2)<1e-8);assert.ok(STORE_REAR_BOUNDS.maxZ<B.minZ);assert.ok(STORE_SIDE_LANES.every(l=>l.minZ<STORE_REAR_BOUNDS.maxZ));assert.ok(STORE_REAR_BOUNDS.minZ>WALKING_AREAS.downtown.bounds.minZ);
});
