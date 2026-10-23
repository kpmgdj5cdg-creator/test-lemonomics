import test from 'node:test';
import assert from 'node:assert/strict';
import {CasinoPatronSchedule,casinoPatronPath,patronDwell,MAX_CASINO_PATRONS} from '../src/casino-patrons.js';
import {blocked} from '../src/player-movement.js';
import {CASINO_BOUNDS,CASINO_SOLIDS} from '../src/casino-model.js';
import {GameAudio} from '../src/game-audio.js';
const stops=[...[-2.8,-.9,1,2.9].map((z,id)=>({id,x:-3.8,z,facing:-Math.PI/2})),...[-2.8,-.9,1,2.9].map((z,i)=>({id:i+4,x:3.8,z,facing:Math.PI/2})),...[-3.6,-1.2,1.2,3.6].map((x,i)=>({id:i+8,x,z:-3,facing:Math.PI}))];
test('patrons can reach every machine from every other machine without crossing walls or tables',()=>{
 for(const a of stops)for(const b of stops){const path=casinoPatronPath(a,b);assert.ok(path.length,`${a.id} -> ${b.id}`);let last=a;for(const p of path){for(let k=0;k<=5;k++){const f=k/5;assert.equal(blocked(last.x+(p.x-last.x)*f,last.z+(p.z-last.z)*f,CASINO_SOLIDS,CASINO_BOUNDS,.14),false)}last=p}}
 assert.equal(patronDwell(()=>0),8);assert.equal(patronDwell(()=>1),16);
});
test('hours of cosmetic traffic reserve distinct machines, visit four before leaving, and replace visitors within six total NPCs',()=>{
 const s=new CasinoPatronSchedule(stops,{seed:12345});const previous=new Map();let moves=0,arrivals=0;const maxInitialId=s.serial;
 for(let second=0;second<7200;second++){
  s.step(1);assert.ok(s.actors.length<=MAX_CASINO_PATRONS);assert.ok(s.actors.length+2<=6);
  const assigned=s.actors.filter(a=>a.machine!==null).map(a=>a.machine);assert.equal(new Set(assigned).size,assigned.length);
  for(const a of s.actors){const last=previous.get(a.id);if(last?.mode==='playing'&&a.mode==='walking')moves++;if(a.mode==='leaving')assert.ok(a.visits.length>=4);assert.equal(new Set(a.visits).size,a.visits.length);if(a.id>maxInitialId)arrivals++;previous.set(a.id,{mode:a.mode})}
 }
 assert.ok(moves>20);assert.ok(s.departures>5);assert.ok(arrivals>0);assert.ok(s.serial>10);
});
class Param{value=0;setValueAtTime(v){this.value=v}exponentialRampToValueAtTime(v){this.value=v}}
class Node{gain=new Param();frequency=new Param();Q=new Param();connect(){}disconnect(){}start(){}stop(){this.stopped=true;this.onended?.()}}
class Context{currentTime=1;state='running';sampleRate=8000;destination={};createGain(){return new Node()}createAnalyser(){return new Node()}createOscillator(){return new Node()}createBiquadFilter(){return new Node()}createBufferSource(){return new Node()}createBuffer(_,n){return {getChannelData:()=>new Float32Array(n)}}}
test('casino ambience requires entry and audio unlock, stays bounded, and stops on mute, suspension, exit and reset without simulation RNG',async()=>{
 const before=globalThis.AudioContext,random=Math.random;globalThis.AudioContext=Context;Math.random=()=>{throw Error('Cosmetic audio must not use simulation RNG')};const audio=new GameAudio();
 try{
  audio.updateCasino(true);assert.equal(audio.casinoPlaying,false);await audio.unlock();audio.updateCasino(false);assert.equal(audio.casinoVoices.size,0);
  audio.updateCasino(true);assert.equal(audio.casinoPlaying,true);const room=[...audio.casinoVoices][0];audio.context.currentTime+=1;audio.updateCasino(true);assert.ok(audio.noteCount>0);assert.ok(audio.casinoVoices.size<=8);
  audio.setMuted(true);assert.equal(audio.casinoPlaying,false);assert.ok(room.stopped);assert.equal(audio.casinoVoices.size,0);assert.equal(audio.voices.size,0);
  audio.setMuted(false);audio.updateCasino(true);audio.setAudible(false);assert.equal(audio.casinoPlaying,false);assert.equal(audio.casinoVoices.size,0);
  audio.setAudible(true);audio.updateCasino(true);assert.equal(audio.casinoPlaying,true);audio.updateCasino(false);assert.equal(audio.casinoVoices.size,0);
  audio.updateCasino(true);audio.reset();assert.equal(audio.casinoPlaying,false);assert.equal(audio.voices.size,0);
 }finally{audio.reset();globalThis.AudioContext=before;Math.random=random}
});
