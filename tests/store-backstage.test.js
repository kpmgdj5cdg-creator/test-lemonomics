import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {STORE_BACK_Z,STORE_BACKROOM_BASE_Z,STORE_EMPLOYEE_FRONT,STORE_DOCK_HEIGHT} from '../src/department-store-layout.js';
import {STORE_BACKROOM_FIXTURES as F,STORE_CONNECTING_DOOR,validStorePosition,storeShopperPath} from '../src/store-floorplan.js';
import {buildStoreRear} from '../src/store-rear-model.js';import {buildStoreLoadingDoor} from '../src/store-loading-door.js';
import {STORE_TRACKS,storeScore,STORE_SCORE_STEPS} from '../src/store-score.js';
test('deeper warehouse has close tall rows, a receiving passage, and routes to every rack aisle',()=>{
 assert.ok(Math.abs((STORE_EMPLOYEE_FRONT-STORE_BACK_Z)/(STORE_EMPLOYEE_FRONT-STORE_BACKROOM_BASE_Z)-2)<1e-9);const racks=F.filter(f=>f.kind==='stock-rack');assert.equal(racks.length,8);const rows=[...new Set(racks.map(f=>f.z))];for(let i=1;i<rows.length;i++)assert.ok(Math.abs(rows[i-1]-rows[i]-.65-1.6)<1e-9);
 for(const z of [-39.625,-41.875,-44.125,-47]){for(const x of [-9.65,-2.6,7]){const p={x,z};assert.ok(validStorePosition(p));assert.ok(storeShopperPath({x:-2.6,z:-37},p,false,true).length,`rack aisle ${x},${z} unreachable`)}}
 assert.ok(storeShopperPath({x:-12,z:-39.625},{x:-8,z:-39.625},false,true).length);assert.ok(validStorePosition(STORE_CONNECTING_DOOR));for(let x=-12;x<=-9.2;x+=.1)assert.ok(validStorePosition({x,z:STORE_CONNECTING_DOOR.z}),'door approach must stay clear of equipment');assert.equal(validStorePosition({x:14,z:-46}),false,'bathroom/break-room rear footprint stays unchanged');
 const root=new THREE.Group(),rear=buildStoreRear(root),rack=rear.fixtures.getObjectByName('shopster-tall-warehouse-rack');assert.ok(new THREE.Box3().setFromObject(rack).max.y>5.2);assert.equal(rear.staffDoors.length,5);
});
test('one private unisex toilet and break-room chairs facing their closest tables',()=>{
 assert.equal(F.filter(f=>f.kind==='toilet').length,1);assert.equal(F.filter(f=>f.kind==='stall-wall').length,0);const tables=F.filter(f=>f.kind==='break-table');for(const chair of F.filter(f=>f.kind==='chair')){const t=tables.reduce((a,b)=>Math.hypot(a.x-chair.x,a.z-chair.z)<Math.hypot(b.x-chair.x,b.z-chair.z)?a:b);const dx=t.x-chair.x,dz=t.z-chair.z;assert.ok((Math.sin(chair.yaw)*dx+Math.cos(chair.yaw)*dz)/Math.hypot(dx,dz)>.999)}
});
test('dock is 15 percent taller and only rolls overhead for an authorized workday',()=>{
 const d=buildStoreLoadingDoor(new THREE.Group());assert.equal(d.height,2.5*1.15);assert.equal(d.amount,0);for(let i=0;i<100;i++)d.update(.1,{employed:false,workdayStarting:true});assert.equal(d.amount,0);for(let i=0;i<100;i++)d.update(.1,{employed:true,workdayStarting:true});assert.equal(d.amount,1);assert.ok(d.slats.every(s=>s.position.y>6.3));assert.ok(d.slats.some(s=>s.rotation.x< -1.5));for(let i=0;i<100;i++)d.update(.1);assert.equal(d.amount,0);assert.ok(d.slats.every(s=>s.rotation.x===0&&s.position.y<.35+STORE_DOCK_HEIGHT));
});
test('PA playlist has three different soft-rock tracks with guitar, keys, bass and backbeat',()=>{
 assert.equal(STORE_TRACKS.length,3);assert.equal(STORE_SCORE_STEPS,768);assert.notDeepEqual(storeScore(0),storeScore(256));const notes=Array.from({length:768},(_,s)=>storeScore(s)).flat();for(const voice of ['guitar','keys','bass'])assert.ok(notes.some(n=>n.voice===voice));for(const drum of ['kick','snare','hat'])assert.ok(notes.some(n=>n.drum===drum));
});
