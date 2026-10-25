import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {DEPARTMENT_STORE as D} from '../src/department-store-layout.js';
import {STORE_FIXTURES,STORE_REAR_FIXTURES,STORE_ENDCAPS,validStorePosition,storeShopperPath} from '../src/store-floorplan.js';
import {storeProducts,storeEndcap} from '../src/store-front-model.js';

test('stocked gondolas double thickness and height while endcaps remain solid and disjoint',()=>{
 const shelves=[...STORE_FIXTURES,...STORE_REAR_FIXTURES].filter(f=>['front-electronics','sports','grocery','seasonal','toys','household','homegoods','beauty','electronics','shoes'].includes(f.kind));
 assert.equal(STORE_ENDCAPS.length,shelves.length*2);
 for(const f of shelves)assert.equal(['seasonal','electronics','shoes'].includes(f.kind)?f.width:f.depth,['seasonal','electronics','shoes'].includes(f.kind)?1.4:1.3);
 const all=[...STORE_FIXTURES,...STORE_REAR_FIXTURES,...STORE_ENDCAPS];
 for(let i=0;i<all.length;i++)for(const b of all.slice(i+1)){const a=all[i];assert.ok(Math.abs(a.x-b.x)>=(a.width+b.width)/2-1e-8||Math.abs(a.z-b.z)>=(a.depth+b.depth)/2-1e-8,`${a.kind} overlaps ${b.kind}`)}
 for(const f of STORE_ENDCAPS)assert.equal(validStorePosition(f),false);
 const root=new THREE.Group();storeProducts(root,0,0,4.5,1.3,'grocery');const bounds=new THREE.Box3().setFromObject(root);assert.ok(bounds.max.y>3.7&&bounds.max.y<3.9);assert.equal(D.height,5.8*1.25);
 const cap=storeEndcap(new THREE.Group(),STORE_ENDCAPS.find(f=>!f.half)),capBounds=new THREE.Box3().setFromObject(cap);assert.ok(capBounds.max.y>3.7&&capBounds.max.y<D.height);
});
test('carts can pass endcaps along both side walls and main cross aisles retain their clearance',()=>{
 for(const x of [-18.56,18.56]){const path=storeShopperPath({x,z:-1.95},{x,z:-32.5},true);assert.ok(path.length);for(const p of path)assert.ok(validStorePosition(p,.62))}
 const f=STORE_FIXTURES.filter(f=>f.kind==='seasonal'&&f.z> -8).sort((a,b)=>a.x-b.x);assert.ok(f[1].x-f[0].x-(f[0].width+f[1].width)/2>=1.7);
 const horizontal=STORE_FIXTURES.filter(f=>f.kind==='grocery').sort((a,b)=>a.z-b.z);assert.ok(horizontal[1].z-horizontal[0].z-1.3>=3-.65);
 for(const z of [-.2,-13.65,-34.8]){const path=storeShopperPath({x:-18.56,z},{x:18.56,z},true);assert.ok(path.length,`cross aisle ${z} disconnected`);for(const p of path)assert.ok(validStorePosition(p,.62))}
});
