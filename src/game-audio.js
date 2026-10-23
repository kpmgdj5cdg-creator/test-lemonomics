const instrumentalUrl=new URL('./audio/afterglow-drive.mp3',import.meta.url).href;
const jazzUrl=new URL('./audio/evening-current.mp3',import.meta.url).href;
const stations=[null,{name:'Lemon FM',description:'techno',bpm:124},{name:'Neon Nights',title:'Afterglow Drive',description:'3:12 instrumental synthwave',bpm:100,url:instrumentalUrl},{name:'Velvet Jazz',title:'Evening Current',description:'3:20 modern lounge instrumental',bpm:96,url:jazzUrl}];
// Original techno synthesis and two full bundled instrumental radio tracks.
export class GameAudio{
 constructor(){
  this.muted=false;try{this.muted=localStorage.getItem('lemonomics_sound_v1')==='off'}catch{}
  this.musicPlaying=false;this.station=0;this.trackPromises=new Map();this.audible=true;this.voices=new Set();this.musicVoices=new Set();this.step=0;this.nextNote=0;this.noteCount=0;this.trackOffset=0;this.trackPlayCount=0;this.noiseSeed=0x1234567;
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
  const next=(this.station+1)%stations.length;this.stopMusic();if(!next)return false;
  this.station=next;const version=(this.startVersion||0)+1;this.startVersion=version;this.starting=true;
  const ready=await this.unlock();if(version!==this.startVersion)return false;if(!ready){this.stopMusic();return false;}
  if(next>=2){try{const buffer=await this.loadTrack(next);if(version===this.startVersion)this.trackBuffer=buffer;}catch{if(version===this.startVersion)this.stopMusic();return false}if(version!==this.startVersion)return false;}
  this.starting=false;if(this.muted)this.setMuted(false);
  this.musicPlaying=true;this.epoch=this.context.currentTime+.03;this.nextNote=this.epoch;this.step=0;
  this.music.gain.setValueAtTime(this.audible?.42:0,this.context.currentTime);if(next>=2)this.startTrack();else{this.sequence();this.timer=setInterval(()=>this.sequence(),25)}return true;
 }
 sequence(){
  const c=this.context;if(!c||!this.musicPlaying||!this.audible||this.station!==1)return;
  if(this.nextNote<c.currentTime-.15)this.nextNote=c.currentTime+.02;
  const eighth=60/124/2,arp=[0,7,12,3,10,7,15,12],bass=[130.81,130.81,155.56,116.54];
  while(this.nextNote<c.currentTime+.12){
   const s=this.step%32,t=this.nextNote;
   if(s%2===0)this.tone(140,t,.17,'sine',.8,this.music,42);
   this.noise(t,.035,s%2?.15:.07,this.music);
   if(s%8===4)this.noise(t,.11,.3,this.music);
   const root=bass[Math.floor(s/8)];this.tone(root/2,t,.14,'triangle',.22,this.music);
   this.tone(root*Math.pow(2,arp[s%8]/12),t,.10,'square',.028,this.music);
   this.nextNote+=eighth;this.step++;
  }
 }
 get stationInfo(){return stations[this.station]||null}
 get nextStationInfo(){return stations[(this.station+1)%stations.length]||null}
 async loadTrack(station){
  if(!this.trackPromises.has(station))this.trackPromises.set(station,(async()=>{
   const response=await fetch(stations[station].url);if(!response.ok)throw new Error('Instrumental unavailable');
   const buffer=await this.context.decodeAudioData(await response.arrayBuffer());return buffer;
  })().catch(error=>{this.trackPromises.delete(station);throw error}));return this.trackPromises.get(station);
 }
 startTrack(){
  if(!this.audible||!this.musicPlaying||!this.trackBuffer||this.trackSource)return;
  const source=this.context.createBufferSource();source.buffer=this.trackBuffer;source.loop=true;source.connect(this.music);
  this.trackSource=source;this.trackStartedAt=this.context.currentTime;this.epoch=this.trackStartedAt-this.trackOffset;
  source.start(this.trackStartedAt,this.trackOffset);this.voices.add(source);this.musicVoices.add(source);this.trackPlayCount++;
  source.onended=()=>{source.disconnect();this.voices.delete(source);this.musicVoices.delete(source);if(this.trackSource===source)this.trackSource=null};
 }
 get trackPosition(){return this.trackBuffer?(this.trackOffset+(this.trackSource?Math.max(0,this.context.currentTime-this.trackStartedAt):0))%this.trackBuffer.duration:0}
 pauseTrack(){
  const source=this.trackSource;if(!source)return;this.trackOffset=this.trackPosition;this.trackSource=null;this.musicVoices.delete(source);try{source.stop()}catch{}
 }
 stopMusic(){this.startVersion=(this.startVersion||0)+1;this.starting=false;clearInterval(this.timer);this.timer=null;this.pauseTrack();this.trackOffset=0;this.trackBuffer=null;this.musicPlaying=false;this.station=0;for(const voice of this.musicVoices){try{voice.stop()}catch{}}this.musicVoices.clear();if(this.context&&this.music)this.music.gain.setValueAtTime(0,this.context.currentTime)}
 setMuted(value){this.muted=value;if(value)this.stopMusic();if(this.master)this.master.gain.setValueAtTime(value?0:.22,this.context.currentTime);try{localStorage.setItem('lemonomics_sound_v1',value?'off':'on')}catch{}}
 setAudible(value){
  if(value===this.audible)return;
  if(!value){this.pauseTrack();for(const voice of this.musicVoices){try{voice.stop()}catch{}}this.musicVoices.clear()}
  this.audible=value;
  if(value&&this.musicPlaying&&this.context){
   if(this.station>=2)this.startTrack();else{this.epoch=this.context.currentTime+.02;this.nextNote=this.epoch;this.step=0}
  }
  if(this.music&&this.context)this.music.gain.setValueAtTime(value&&this.musicPlaying?.42:0,this.context.currentTime);
 }
 level(){if(!this.musicPlaying||!this.audible||!this.analyser?.getFloatTimeDomainData)return 0;this.samples??=new Float32Array(256);this.analyser.getFloatTimeDomainData(this.samples);let sum=0;for(const value of this.samples)sum+=value*value;return Math.sqrt(sum/this.samples.length)}
 beat(){if(!this.musicPlaying||!this.audible||!this.context)return 0;const period=60/(this.stationInfo?.bpm||124),phase=((this.context.currentTime-this.epoch)%period+period)%period;return Math.exp(-phase*17)}
 reset(){this.stopMusic()}
}
export const gameAudio=new GameAudio();
