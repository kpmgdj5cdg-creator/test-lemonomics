import * as THREE from 'three';
import {material} from './models.js';

// A cosmetic preference: never advances the business day or changes its weather.
export class SceneLighting{
 constructor(world){
  this.world=world;this.night=false;try{this.night=localStorage.getItem('lemonomics_night_v1')==='on'}catch{}
  const label=document.createElement('label');label.className='scene-night-toggle';
  this.input=document.createElement('input');this.input.type='checkbox';this.input.id='nightModeToggle';this.input.checked=this.night;
  const text=document.createElement('span');text.textContent='Night mode';label.append(this.input,text);world.container.parentElement.append(label);this.control=label;
  this.input.addEventListener('change',()=>{this.night=this.input.checked;try{localStorage.setItem('lemonomics_night_v1',this.night?'on':'off')}catch{}this.apply();if(world.classicInterior.active||world.homeInterior.active||world.casinoInterior?.active)world.container.focus({preventScroll:true})});
  const positions=[];for(let i=0;i<170;i++){const angle=i*2.39996,y=22+(i*37%65),radius=Math.sqrt(96*96-y*y);positions.push(Math.cos(angle)*radius,y,Math.sin(angle)*radius)}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  this.stars=new THREE.Points(geometry,new THREE.PointsMaterial({color:'#dfe9ff',size:.19,sizeAttenuation:true,fog:false,depthWrite:false}));this.stars.name='night-stars';world.scene.add(this.stars);
  this.moon=new THREE.Mesh(new THREE.BoxGeometry(2.4,2.4,.55),new THREE.MeshBasicMaterial({color:'#fff4ce',fog:false}));this.moon.name='voxel-moon';this.moon.position.set(-28,38,-45);world.scene.add(this.moon);this.apply();
 }
 apply(){
  const w=this.world,mode=w.weatherEffects.mode,night=this.night,sunny=mode==='sunny';
  w.sun.intensity=night?(sunny?.55:.32):sunny?3.1:mode==='snow'?1.9:1.45;
  w.sun.color.set(night?'#91adff':sunny?'#fff4d4':'#d7edff');
  w.hemisphere.intensity=night?.65:1.35;w.hemisphere.color.set(night?'#8195cf':'#d9f7ff');w.hemisphere.groundColor.set(night?'#17283c':'#214d52');
  const sky=night?(sunny?'#101b38':'#1a263f'):mode==='snow'?'#cedeea':mode==='rain'?'#87b4c4':'#8bd8e0';
  w.scene.background.set(sky);w.scene.fog.color.set(night?sky:'#92d8df');
  this.stars.visible=night&&sunny;this.moon.visible=night&&sunny;
  // Existing street-lamp glass remains visible after scenery batching.
  const glass=material('#fff1b5');glass.emissive.set(night?'#ffd07a':'#000000');glass.emissiveIntensity=night?1.4:0;
  w.casino?.setNight(night);w.container.dataset.timeOfDay=night?'night':'day';w.container.dataset.sunIntensity=String(w.sun.intensity);
 }
 dispose(){this.control.remove();for(const o of [this.stars,this.moon]){o.geometry.dispose();o.material.dispose();o.removeFromParent()}}
}
