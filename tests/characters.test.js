import {test} from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {character,batch,disposeGroup} from '../src/models.js';import {characterAppearance,HAIRSTYLES,CLOTHING,EXPRESSIONS} from '../src/character-appearance.js';
test('stable IDs produce stable configurable adult appearances, independent of emotions and RNG',()=>{
 for(let i=0;i<100;i++){const a=characterAppearance('person-'+i);Math.random();assert.deepEqual(a,characterAppearance('person-'+i));assert.equal(a.version,2)}
 assert.equal(new Set(Array.from({length:100},(_,i)=>JSON.stringify(characterAppearance('person-'+i)))).size,100);
});
test('invalid optional dimensions fall back to finite bounded geometry',()=>{const a=characterAppearance('bad',{body:{width:'bad',shoulders:Infinity},face:{width:NaN,eyeSize:'no',browThickness:-3}});assert.ok(Number.isFinite(a.body.width));assert.ok(Number.isFinite(a.face.eyeSize));assert.equal(a.face.browThickness,.012)});
test('twelve distinct adult silhouettes retain original height and limb pivots and survive scenery batching',()=>{
 const scene=new THREE.Group(),signatures=[];
 for(let i=0;i<12;i++){const r=character(scene,'showcase-'+i,{hairStyle:HAIRSTYLES[i],clothing:CLOTHING[i]});const bounds=new THREE.Box3().setFromObject(r.group);assert.ok(bounds.max.y>=1.279&&bounds.max.y<=1.371);assert.ok(Math.abs(bounds.min.y-.025)<1e-6);assert.equal(r.legs[0].position.y,.5);assert.equal(r.arms[0].position.y,.89);let draws=0,vertices=0;r.group.traverse(o=>{if(o.isMesh){draws++;vertices+=o.geometry.attributes.position.count}});assert.ok(draws<=17);assert.ok(vertices<12000);signatures.push(r.slots.hair.children[0]?.geometry.attributes.position.count||0);batch(r.group);r.update(.2,{moving:true});assert.notEqual(r.legs[0].rotation.x,0);assert.equal(r.face.mouth.children.length,3);assert.equal(r.face.brows.length,2)}
 assert.ok(new Set(signatures).size>=8);disposeGroup(scene);
});
test('every expression has a visible dimensional mouth; talking, blinking and gestures preserve world transform',()=>{
 const r=character(new THREE.Group(),'face');r.group.position.set(5,0,7);for(const expression of EXPRESSIONS){r.setExpression(expression);r.update(.2);assert.equal(r.group.userData.expression,expression);assert.ok(r.face.mouth.children.every(m=>m.scale.y>0&&m.visible))}
 r.setTalking(true);r.update(.1);const y=r.face.mouth.children[1].scale.y;r.update(.3);assert.notEqual(r.face.mouth.children[1].scale.y,y);assert.equal(r.group.position.x,5);assert.equal(r.group.position.z,7);
 let blinks=0;for(let t=0;t<12;t+=.05){r.update(t);if(r.group.userData.blink<1)blinks++}assert.ok(blinks>0);r.update(1,{reducedMotion:true});assert.equal(r.group.userData.blink,1);
 r.setAnimation({gesture:'wave',motion:'sitting'});r.update(1);assert.equal(r.legs[0].rotation.x,-Math.PI/2);assert.ok(r.arms[1].rotation.z<-1);disposeGroup(r.group);
});
test('disposing a rig releases owned parts and preserves shared primitives for other characters',()=>{
 const parent=new THREE.Group(),a=character(parent,'one'),b=character(parent,'two');let owned=0,shared=0;a.slots.body.children[0].geometry.addEventListener('dispose',()=>owned++);a.face.mouth.children[0].geometry.addEventListener('dispose',()=>shared++);disposeGroup(a.group);assert.equal(owned,1);assert.equal(shared,0);b.update(1,{moving:true});assert.ok(Number.isFinite(b.legs[0].rotation.x));disposeGroup(b.group);assert.equal(shared,0);
});
