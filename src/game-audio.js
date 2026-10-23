import {NEON_VOCALS,NEON_LYRICS} from './radio-vocals.js';
// Original synthesized music and generated vocoder vocals, bundled offline.
export class GameAudio{
 constructor(){
  this.muted=false;try{this.muted=localStorage.getItem('lemonomics_sound_v1')==='off'}catch{}
  this.musicPlaying=false;this.station=0;this.audible=true;this.voices=new Set();this.musicVoices=new Set();this.step=0;this.nextNote=0;this.noteCount=0;this.vocalCount=0;this.noiseSeed=0x1234567;
 }
 async unlock(){
  try{
   const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)return false;
   if(!this.context){
    const c=this.context=new Context();this.master=c.createGain();this.master.gain.value=this.muted?0:.22;this.master.connect(c.destination);
    this.music=c.createGain();this.music.gain.value=0;this.music.connect(this.master);
    this.analyser=c.createAnalyser();this.analyser.fftSize=256;this.music.connect(this.analyser);
   }
   if(this.context.state==='suspended')await this.context.resume();return this.context.state==='running';
  }catch{return false}
 }
 tone(frequency,start,duration=.08,type='sine',gain=.15,target=this.master,endFrequency){
  const c=this.context;if(!c||!target)return;
  const o=c.createOscillator(),v=c.createGain();o.type=type;o.frequency.setValueAtTime(frequency,start);
  if(endFrequency)o.frequency.exponentialRampToValueAtTime(endFrequency,start+duration);
  v.gain.setValueAtTime(.0001,start);v.gain.exponentialRampToValueAtTime(gain,start+Math.min(.16,duration*.15));v.gain.exponentialRampToValueAtTime(.0001,start+duration);
  o.connect(v);v.connect(target);o.start(start);o.stop(start+duration+.01);this.voices.add(o);if(target===this.music)this.musicVoices.add(o);o.onended=()=>{o.disconnect();v.disconnect();this.voices.delete(o);this.musicVoices.delete(o)};this.noteCount++;
 }
 noise(start,duration,gain,target=this.master){
  const c=this.context;if(!c)return;const buffer=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),d=buffer.getChannelData(0);
  for(let i=0;i<d.length;i++){let n=this.noiseSeed;n^=n<<13;n^=n>>>17;n^=n<<5;this.noiseSeed=n;d[i]=((n>>>0)/2147483648-1)*(1-i/d.length);}
  const source=c.createBufferSource(),v=c.createGain(),filter=c.createBiquadFilter();source.buffer=buffer;filter.type='highpass';filter.frequency.value=5000;v.gain.value=gain;
  source.connect(filter);filter.connect(v);v.connect(target);source.start(start);this.voices.add(source);if(target===this.music)this.musicVoices.add(source);source.onended=()=>{source.disconnect();filter.disconnect();v.disconnect();this.voices.delete(source);this.musicVoices.delete(source)};
 }
 effect(name){
  if(this.muted||!this.audible||this.context?.state!=='running')return;const t=this.context.currentTime;
  if(name==='purchase'||name==='sale'){this.tone(660,t,.09,'triangle',.18);this.tone(990,t+.07,.12,'triangle',.14)}
  else if(name==='door'){this.noise(t,.18,.15);this.tone(180,t,.16,'triangle',.07,this.master,110)}
  else if(name==='step')this.tone(100,t,.035,'sine',.12,this.master,55);
  else if(name==='start'){[440,554,660].forEach((n,i)=>this.tone(n,t+i*.065,.13,'triangle',.11))}
  else this.tone(520,t,.045,'sine',.045,this.master,700);
 }
 async toggleMusic(){
  const next=(this.station+1)%3;this.stopMusic();if(!next)return false;
  this.station=next;const version=(this.startVersion||0)+1;this.startVersion=version;this.starting=true;
  const ready=await this.unlock();if(version!==this.startVersion)return false;this.starting=false;if(!ready){this.station=0;return false;}
  if(next===2){try{await this.loadVocals()}catch{if(version===this.startVersion)this.stopMusic();return false}if(version!==this.startVersion)return false;}
  if(this.muted)this.setMuted(false);
  this.musicPlaying=true;this.epoch=this.context.currentTime+.03;this.nextNote=this.epoch;this.step=0;
  this.music.gain.setValueAtTime(this.audible?.42:0,this.context.currentTime);this.sequence();this.timer=setInterval(()=>this.sequence(),25);return true;
 }
 sequence(){
  const c=this.context;if(!c||!this.musicPlaying||!this.audible)return;
  if(this.nextNote<c.currentTime-.15)this.nextNote=c.currentTime+.02;
  const eighth=60/(this.station===2?100:124)/2,arp=[0,7,12,3,10,7,15,12],bass=[130.81,130.81,155.56,116.54];
  while(this.nextNote<c.currentTime+.12){
   const s=this.step%32,t=this.nextNote;
   if(this.station===2){this.synthwave(this.step%64,t);this.nextNote+=eighth;this.step++;continue;}
   if(s%2===0)this.tone(140,t,.17,'sine',.8,this.music,42);
   this.noise(t,.035,s%2?.15:.07,this.music);
   if(s%8===4)this.noise(t,.11,.3,this.music);
   const root=bass[Math.floor(s/8)];this.tone(root/2,t,.14,'triangle',.22,this.music);
   this.tone(root*Math.pow(2,arp[s%8]/12),t,.10,'square',.028,this.music);
   this.nextNote+=eighth;this.step++;
  }
 }
 async loadVocals(){
  this.vocalPromise??=this.context.decodeAudioData(Uint8Array.from(atob(NEON_VOCALS),c=>c.charCodeAt(0)).buffer).then(buffer=>this.vocalBuffer=buffer).catch(error=>{this.vocalPromise=null;throw error});return this.vocalPromise;
 }
 synthwave(s,t){
  const roots=[110,87.307,130.813,97.999],chords=[[220,261.626,329.628],[174.614,220,261.626],[261.626,329.628,391.995],[195.998,246.942,293.665]],chord=Math.floor(s/8)%4;
  if(s%8===0){for(const f of chords[chord]){this.tone(f*.996,t,2.5,'sawtooth',.025,this.music);this.tone(f*1.004,t,2.6,'triangle',.045,this.music)}}
  if(s%2===0)this.tone(125,t,.22,'sine',.8,this.music,40);
  if(s%8===2||s%8===6){this.noise(t,.14,.26,this.music);this.tone(185,t,.09,'triangle',.14,this.music,110)}
  this.noise(t,.04,s%2?.10:.05,this.music);
  this.tone(roots[chord]*(s%8===7?2:1),t,.22,'sawtooth',.09,this.music);
  const melody=chords[chord][[0,1,2,1,0,2,1,2][s%8]]*(s%4===3?2:1);
  this.tone(melody*2,t,.19,'triangle',.09,this.music);this.tone(melody*2,t+.15,.27,'sine',.025,this.music);
  if(s===0&&this.vocalBuffer){const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=this.vocalBuffer;gain.gain.value=.95;source.connect(gain);gain.connect(this.music);source.start(t);this.voices.add(source);this.musicVoices.add(source);this.vocalCount++;source.onended=()=>{source.disconnect();gain.disconnect();this.voices.delete(source);this.musicVoices.delete(source)}}
 }
 get lyrics(){return this.station===2?NEON_LYRICS:''}
 stopMusic(){this.startVersion=(this.startVersion||0)+1;this.starting=false;clearInterval(this.timer);this.timer=null;this.musicPlaying=false;this.station=0;for(const voice of this.musicVoices){try{voice.stop()}catch{}}this.musicVoices.clear();if(this.context&&this.music)this.music.gain.setValueAtTime(0,this.context.currentTime)}
 setMuted(value){this.muted=value;if(value)this.stopMusic();if(this.master)this.master.gain.setValueAtTime(value?0:.22,this.context.currentTime);try{localStorage.setItem('lemonomics_sound_v1',value?'off':'on')}catch{}}
 setAudible(value){if(!value&&this.audible){for(const voice of this.musicVoices){try{voice.stop()}catch{}}this.musicVoices.clear()}if(value&&!this.audible&&this.musicPlaying&&this.context){this.epoch=this.context.currentTime+.02;this.nextNote=this.epoch;this.step=0}this.audible=value;if(this.music&&this.context)this.music.gain.setValueAtTime(value&&this.musicPlaying?.42:0,this.context.currentTime)}
 level(){if(!this.musicPlaying||!this.audible||!this.analyser?.getFloatTimeDomainData)return 0;this.samples??=new Float32Array(256);this.analyser.getFloatTimeDomainData(this.samples);let sum=0;for(const value of this.samples)sum+=value*value;return Math.sqrt(sum/this.samples.length)}
 beat(){if(!this.musicPlaying||!this.audible||!this.context)return 0;const period=60/(this.station===2?100:124),phase=((this.context.currentTime-this.epoch)%period+period)%period;return Math.exp(-phase*17)}
 reset(){this.stopMusic()}
}
export const gameAudio=new GameAudio();
