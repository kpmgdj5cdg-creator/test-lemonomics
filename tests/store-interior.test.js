import {employeeRoomZ,STORE_BACK_Z,STORE_EMPLOYEE_FRONT,storePlanPosition,storePlanZ} from '../src/department-store-layout.js';
import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {STORE_BROWSE_STOPS as stops,STORE_ROOM_BOUNDS,STORE_REAR_FIXTURES,STORE_STAFF_ROOMS,STORE_BACK_WORKERS,STORE_COLUMNS,STORE_CHECKOUTS,STORE_FIXTURES,validStorePosition,restoredStorePosition,moveInStore,storeShopperPath} from '../src/store-floorplan.js';
import {StoreShopperSchedule,validShopperPosition} from '../src/store-shoppers.js';import {buildDepartmentStore,batchDepartmentStore} from '../src/department-store.js';
test('front-half floorplan preserves six registers, cart bays, five departments and navigable aisles',()=>{
 assert.equal(STORE_CHECKOUTS.length,6);assert.equal(STORE_CHECKOUTS.filter(s=>s.staffed).length,2);assert.equal(STORE_FIXTURES.filter(s=>s.kind==='carts').length,2);for(const kind of ['sports','grocery','seasonal','general','decor'])assert.ok(STORE_FIXTURES.some(s=>s.kind===kind));
 assert.equal(validStorePosition({x:0,z:9.25}),true);assert.equal(validStorePosition({x:0,z:-1}),true);assert.equal(validStorePosition(STORE_CHECKOUTS[0]),false);assert.equal(validStorePosition({x:NaN,z:4}),false);for(const p of STORE_COLUMNS)assert.equal(validStorePosition(p),false);
 for(const cart of [false,true])for(const stop of stops.filter(s=>validStorePosition(s,cart?.62:.27))){const path=storeShopperPath({x:0,z:9.25},stop,cart);assert.ok(path.length,`unreachable stop ${stop.id}`);for(const p of path)assert.ok(validStorePosition(p,cart?.62:.27))}
 let p={x:0,z:9.25};for(let i=0;i<300;i++)p=moveInStore(p,{x:0,z:-1},0,.05);assert.ok(p.z>STORE_ROOM_BOUNDS.minZ);assert.ok(validStorePosition(p));p={x:STORE_CHECKOUTS[0].x,z:5};for(let i=0;i<40;i++)p=moveInStore(p,{x:0,z:-1},0,.05);assert.ok(p.z>STORE_CHECKOUTS[0].z+1);const yawed=moveInStore({x:0,z:8},{x:0,z:-1},Math.PI/2,.05);assert.ok(yawed.x<0);
});
test('one hour of shopper traffic retains population/cart caps, browses multiple stops, checks out and turns over without using game state',()=>{
 const s=new StoreShopperSchedule({seed:42});assert.equal(s.actors.length,20);assert.equal(s.actors.filter(a=>a.cart).length,5);assert.equal(s.staff.length,5);const initial=new Map(s.actors.map(a=>[a.id,{...a.position}]));let moved=false,checkout=false,maxVisits=0;
 for(let i=0;i<18000;i++){s.step(.2,.2);assert.ok(s.actors.length<=20&&s.actors.length>=16);assert.ok(s.actors.filter(a=>a.cart).length<=5);assert.equal(new Set(s.actors.map(a=>a.slot)).size,s.actors.length);const registers=s.actors.filter(a=>a.checkoutLane).map(a=>a.checkoutLane);assert.equal(new Set(registers).size,registers.length);for(const a of [...s.actors,...s.staff,...s.backStaff]){assert.ok(a.visits?validShopperPosition(a):validStorePosition(a.position));if(initial.has(a.id)&&Math.hypot(a.position.x-initial.get(a.id).x,a.position.z-initial.get(a.id).z)>1)moved=true;if(a.mode==='checkout')checkout=true;maxVisits=Math.max(maxVisits,a.visits?.length||0)}}
 assert.ok(moved);assert.ok(checkout);assert.ok(maxVisits>=3);assert.ok(s.departures>100);assert.ok(s.serial>100);
});
test('store batching preserves independent door hinges, visible room fixtures and switchable lighting',()=>{
 const scene=new THREE.Group(),store=buildDepartmentStore(scene);batchDepartmentStore(store);assert.equal(store.hinges.length,2);for(const hinge of store.hinges){assert.ok(hinge.children.some(c=>c.isMesh));hinge.rotation.y=1;assert.equal(hinge.rotation.y,1)}assert.ok(store.interior.fixtures.children.some(c=>c.isMesh));assert.ok(store.interior.lights.every(l=>!l.visible));store.setNight(true);assert.ok(store.lights.every(l=>l.visible));assert.equal(store.interior.lights.length,12);
});

test('complete rear sales floor connects to every employee room while shopper routes stay public',()=>{
 for(const kind of ['toys','household','homegoods','beauty','electronics','clothing','shoes'])assert.ok(STORE_REAR_FIXTURES.some(f=>f.kind===kind));assert.equal(STORE_STAFF_ROOMS.length,4);
 for(const r of STORE_STAFF_ROOMS){const target={x:r.doorX,z:storePlanZ(r.id==='restrooms'?-29.1:-29.7)};assert.ok(validStorePosition(target));const route=storeShopperPath({x:0,z:9.25},target,false,true);assert.ok(route.length,`${r.id} is unreachable`);assert.equal(storeShopperPath({x:0,z:9.25},target).length,0,'shoppers must not route into employee rooms');for(let i=1;i<route.length;i++)for(let t=0;t<=1;t+=.1)assert.ok(validStorePosition({x:route[i-1].x+(route[i].x-route[i-1].x)*t,z:route[i-1].z+(route[i].z-route[i-1].z)*t},.27))}
});
test('warehouse and receiving workers circulate inside their own rooms; customers use both store halves',()=>{
 const schedule=new StoreShopperSchedule({seed:123});assert.equal(schedule.backStaff.length,2);assert.ok(schedule.actors.some(a=>a.position.z<0));assert.ok(schedule.actors.some(a=>a.position.z>0));const first=schedule.backStaff.map(a=>({...a.position}));let moving=[false,false];
 for(let i=0;i<600;i++){schedule.step(.2,.2);schedule.backStaff.forEach((a,j)=>{assert.ok(validStorePosition(a.position));assert.ok(a.position.z<storePlanZ(-28.2));if(a.id==='warehouse')assert.ok(a.position.x>-7.7*1.3&&a.position.x<5.7*1.3);else assert.ok(a.position.x< -8.3*1.3);if(Math.hypot(a.position.x-first[j].x,a.position.z-first[j].z)>1)moving[j]=true});for(const a of schedule.actors)if(a.position.z<9.2)assert.ok(a.position.z>=storePlanZ(-27.45))}assert.deepEqual(moving,[true,true]);
});

test('expanded store restores legacy employee room viewpoints and preserves versioned current coordinates',()=>{
 assert.deepEqual(restoredStorePosition({position:{x:11.9,z:-8.7}}),storePlanPosition({x:11.9,z:employeeRoomZ(-29.7)}));assert.deepEqual(restoredStorePosition({layoutVersion:2,position:{x:11.9,z:-29.7}}),storePlanPosition({x:11.9,z:employeeRoomZ(-29.7)}));assert.deepEqual(restoredStorePosition({layoutVersion:3,position:{x:11.9,z:employeeRoomZ(-29.7)}}),storePlanPosition({x:11.9,z:employeeRoomZ(-29.7)}));const current=storePlanPosition({x:11.9,z:employeeRoomZ(-29.7)});assert.deepEqual(restoredStorePosition({layoutVersion:4,position:current}),current);assert.deepEqual(restoredStorePosition({position:{x:0,z:9.25}}),{x:0,z:9.25});assert.deepEqual(restoredStorePosition({layoutVersion:2,position:{x:NaN,z:0}}),{x:0,z:9.25});
});

test('all four employee rooms gain 66 percent depth with clear routes to their enlarged rear areas',()=>{
 assert.ok(Math.abs((STORE_EMPLOYEE_FRONT-STORE_BACK_Z)-3.5*1.66)<1e-9);
 for(const [x,z]of [[-10.2,-32],[-2,-32],[7.8,-31.5],[11.9,-30.8]]){const p=storePlanPosition({x,z}),start=storePlanPosition({x,z:-27});assert.ok(validStorePosition(p));assert.ok(storeShopperPath(start,p,false,true).length);assert.equal(storeShopperPath(start,p).length,0)}
});
