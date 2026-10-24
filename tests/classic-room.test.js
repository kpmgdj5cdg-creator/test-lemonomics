import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {classicStand} from '../src/classic-stand.js';
import {moveInRoom,validRoomPosition} from '../src/classic-movement.js';
import {GameAudio} from '../src/game-audio.js';

test('interior movement follows camera yaw and cannot pass counters, fridge or closed doors',()=>{
 let p={x:0,z:0};for(let i=0;i<100;i++)p=moveInRoom(p,{x:0,z:-1},0,.05,true,false);assert.ok(p.z>=-.6);
 p={x:0,z:0};for(let i=0;i<100;i++)p=moveInRoom(p,{x:1,z:0},0,.05,true,false);assert.ok(p.x<=1.71);
 p={x:1.5,z:0};for(let i=0;i<100;i++)p=moveInRoom(p,{x:0,z:-1},0,.05,true,true);assert.ok(p.z>=-.28);
 p={x:-1.05,z:.5};for(let i=0;i<100;i++)p=moveInRoom(p,{x:0,z:-1},Math.PI,.05,false,false);assert.ok(p.z<1.08);
 p={x:-1.05,z:.5};for(let i=0;i<100;i++)p=moveInRoom(p,{x:0,z:-1},Math.PI,.05,false,true);assert.ok(p.z>1.41);
 assert.equal(validRoomPosition({x:0,z:-1},false,true),false);
 const diagonal=moveInRoom({x:0,z:0},{x:1,z:-1},0,.05);assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.z)-.0875)<1e-9);
});
test('all five prep machines sit separately on the rear counter, fridge is rear-right, POS is small and faces inward',()=>{
 const previous=globalThis.document;
 globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};
 try{
  const ids=['juicer','powerjuicer','icedispenser','dispenser','icemaker'],model=classicStand(new THREE.Group(),{upgrades:['classic',...ids,'fridge','register','music'],price:2.25});
  const {placements,bounds}=model.equipment.userData;
  for(const id of ids){assert.equal(placements[id].y,1.3);assert.equal(placements[id].z,-1.02);assert.ok(bounds[id].min[1]>=1.299)}
  for(let i=1;i<ids.length;i++)assert.ok(bounds[ids[i-1]].max[0]<bounds[ids[i]].min[0]);
  assert.ok(placements.fridge.x>1.4&&placements.fridge.z<-.8);assert.equal(placements.fridge.y,.36);
  assert.ok(bounds.register.max[0]-bounds.register.min[0]<=2.26*.2);assert.equal(model.equipment.getObjectByName('register').userData.facing,'interior');
  assert.ok(model.speaker.group.position.x>model.width/2);assert.ok(model.doors.left.children.some(c=>c.userData.glass));
  model.speaker.update(.8);assert.ok(model.speaker.cone.scale.z>1);model.speaker.update(0);assert.equal(model.speaker.cone.scale.z,1);
  const empty=classicStand(new THREE.Group(),{upgrades:['classic']});assert.deepEqual(empty.equipment.userData.ids,[]);assert.equal(empty.speaker,null);
 }finally{globalThis.document=previous}
});
class Param{value=0;setValueAtTime(v){this.value=v}exponentialRampToValueAtTime(v){this.value=v}}
class Node{gain=new Param();frequency=new Param();Q=new Param();connect(target){assert.equal(typeof target,'object')}disconnect(){}start(){}stop(){}}
class AudioContextFake{currentTime=1;state='running';sampleRate=8000;destination={};createGain(){return new Node()}createAnalyser(){return new Node()}createOscillator(){return new Node()}createBufferSource(){return new Node()}createBiquadFilter(){return new Node()}createBuffer(_,size){return {getChannelData:()=>new Float32Array(size)}}async decodeAudioData(buffer){return {duration:buffer.byteLength===16?200:192}}async resume(){this.state='running'}}
test('original sequencer schedules audio, respects mute and pause, and never consumes the simulation RNG',async()=>{
 const before=globalThis.AudioContext,random=Math.random;globalThis.AudioContext=AudioContextFake;
 const audio=new GameAudio();
 try{
  audio.setMuted(false);assert.equal(await audio.toggleMusic(),true);assert.ok(audio.noteCount>2);assert.ok(audio.music.gain.value>0);assert.ok(audio.timer);
  Math.random=()=>{throw new Error('Simulation RNG must not be used by sound')};audio.effect('door');
  audio.setAudible(false);assert.equal(audio.music.gain.value,0);assert.equal(audio.beat(),0);audio.setAudible(true);assert.ok(audio.music.gain.value>0);
  audio.setMuted(true);assert.equal(audio.musicPlaying,false);assert.equal(audio.music.gain.value,0);assert.equal(audio.timer,null);
 }finally{audio.reset();globalThis.AudioContext=before;Math.random=random}
});

test('rapid station changes and Off cancel pending starts without resurrecting playback',async()=>{
 const audio=new GameAudio(),releases=[];audio.unlock=()=>new Promise(r=>releases.push(r));
 const first=audio.toggleMusic();assert.equal(audio.starting,true);assert.equal(audio.station,1);
 const second=audio.toggleMusic();assert.equal(audio.station,2);const third=audio.toggleMusic();assert.equal(audio.station,3);assert.equal(await audio.toggleMusic(),false);
 releases.forEach(release=>release(true));assert.deepEqual(await Promise.all([first,second,third]),[false,false,false]);assert.equal(audio.station,0);assert.equal(audio.musicPlaying,false);assert.equal(audio.timer,null);
});
test('full instrumental loads once, loops and preserves its position across hidden games',async()=>{
 const before=globalThis.AudioContext,fetchBefore=globalThis.fetch;globalThis.AudioContext=AudioContextFake;let requests=0;
 globalThis.fetch=async url=>{requests++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(url.includes('evening-current')?16:8)}};
 const audio=new GameAudio();
 try{
  await audio.toggleMusic();assert.equal(audio.station,1);assert.equal(audio.trackPlayCount,0);
  await audio.toggleMusic();assert.equal(audio.station,2);assert.equal(audio.trackBuffer.duration,192);assert.equal(audio.trackSource.loop,true);assert.equal(audio.trackPlayCount,1);
  audio.context.currentTime+=37;assert.equal(audio.trackPosition,37);audio.setAudible(false);assert.equal(audio.trackSource,null);assert.equal(audio.musicVoices.size,0);
  audio.context.currentTime+=20;assert.equal(audio.trackPosition,37);audio.setAudible(true);assert.equal(audio.trackPosition,37);assert.equal(audio.trackPlayCount,2);
  audio.context.currentTime+=160;assert.equal(audio.trackPosition,5);
  await audio.toggleMusic();assert.equal(audio.station,3);assert.equal(audio.stationInfo.title,'Evening Current');assert.equal(audio.trackBuffer.duration,200);assert.equal(audio.trackOffset,0);
  audio.context.currentTime+=23;audio.setAudible(false);assert.equal(audio.trackPosition,23);audio.context.currentTime+=10;audio.setAudible(true);assert.equal(audio.trackPosition,23);
  await audio.toggleMusic();assert.equal(audio.station,0);assert.equal(audio.trackOffset,0);assert.equal(audio.musicVoices.size,0);assert.equal(audio.timer,null);
  await audio.toggleMusic();await audio.toggleMusic();assert.equal(requests,2);assert.equal(audio.trackPosition,0);await audio.toggleMusic();assert.equal(requests,2);assert.equal(audio.station,3);
  audio.setMuted(true);assert.equal(audio.trackSource,null);assert.equal(audio.musicPlaying,false);
 }finally{audio.reset();globalThis.AudioContext=before;globalThis.fetch=fetchBefore}
});
test('a failed instrumental load can retry without caching a rejected request',async()=>{
 const before=globalThis.AudioContext,fetchBefore=globalThis.fetch;globalThis.AudioContext=AudioContextFake;let requests=0;
 globalThis.fetch=async()=>{requests++;return {ok:requests>1,arrayBuffer:async()=>new ArrayBuffer(8)}};
 const audio=new GameAudio();
 try{
  await audio.toggleMusic();assert.equal(await audio.toggleMusic(),false);assert.equal(audio.musicPlaying,false);assert.equal(audio.station,0);
  await audio.toggleMusic();assert.equal(await audio.toggleMusic(),true);assert.equal(audio.trackBuffer.duration,192);assert.equal(requests,2);
 }finally{audio.reset();globalThis.AudioContext=before;globalThis.fetch=fetchBefore}
});
