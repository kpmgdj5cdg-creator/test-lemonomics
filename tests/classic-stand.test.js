import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildClassicStand} from '../src/classic-stand.js';
import {PlayerController} from '../src/player-controller.js';

test('Classic kiosk has separate doors, striped awning and raised lemon sign on a compact plot',()=>{
 const base=new THREE.Group(),shell=new THREE.Group();buildClassicStand(base,shell,4.1,2.7);
 assert.ok(shell.getObjectByName('classic-glazed-entrance'));assert.ok(shell.getObjectByName('classic-striped-window-awning'));assert.ok(shell.getObjectByName('classic-cooler-cup-sign'));assert.ok(shell.getObjectByName('classic-voxel-lemon'));
 const bounds=new THREE.Box3().setFromObject(base);assert.ok(bounds.min.x>=-2.25&&bounds.max.x<=2.25);assert.ok(bounds.max.z<=1.53,'counter stays inside the existing walking barrier');
 const facade=shell.getObjectByName('classic-glazed-entrance');assert.ok(facade.children.filter(c=>c.material.color.getHexString()==='829eae').length===2);
 const awning=shell.getObjectByName('classic-striped-window-awning');assert.equal(awning.children.length,16);assert.equal(new Set(awning.children.map(c=>c.material.color.getHexString())).size,2);
 assert.ok(new THREE.Box3().setFromObject(shell).max.y>3.9);
});
test('Classic cutaway separates tall shell from the low service counter, retaining the shade upgrade',()=>{
 const base=new THREE.Group(),shell=new THREE.Group();buildClassicStand(base,shell,4.1,2.7,{register:true});
 assert.ok(new THREE.Box3().setFromObject(base).max.y<1.6);
 const shade=new THREE.Group();buildClassicStand(new THREE.Group(),shade,4.1,2.7,{shade:true});
 assert.ok(new THREE.Box3().setFromObject(shade.getObjectByName('classic-striped-window-awning')).max.z>2.5);
 assert.ok(new THREE.Box3().setFromObject(shell.getObjectByName('classic-striped-window-awning')).max.z<2.2);
});
test('operator and stool follow the Classic serving window anchor, then return to the starter position',()=>{
 const avatar={group:new THREE.Group(),animate(){}},stool=new THREE.Group(),world={location:'neighborhood',player:{avatarAnchor:{x:.95,y:.75,z:.42}}};
 PlayerController.prototype.parkAtStand.call({avatar,stool,world});assert.equal(avatar.group.position.x,-2.05);assert.equal(stool.position.x,avatar.group.position.x);assert.ok(Math.abs(avatar.group.position.z+.38)<1e-10);
 world.player=null;PlayerController.prototype.parkAtStand.call({avatar,stool,world});assert.equal(avatar.group.position.x,-3);assert.equal(stool.position.x,-3);
});
