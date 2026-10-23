import * as THREE from 'three';
import {box,group,label,batch,disposeGroup,tree,bush,bench,lamp,stand,character} from './models.js';
import {palm,planter,market,chalkboard} from './street-details.js';
import {buildNeighborhoodHomes} from './neighborhood-homes.js';
import {buildPark} from './park.js';
import {buildDowntown} from './downtown.js';
import {buildWaterfront,animateWaterfront} from './waterfront.js';
import {planArrivals,pointOnRoute,walkElevation} from './traffic.js';
import {WeatherEffects} from './weather.js';
import { availableCups } from './capacity.js';
import {PlayerController,sceneColliders,sceneGround} from './player-controller.js';
import {ClassicInterior} from './classic-interior.js';
import {gameAudio} from './game-audio.js';
import {HomeInterior} from './home-interior.js';
import {batchPlayerHome} from './home-model.js';
import {activeUpgrades} from './equipment.js';
import {SceneLighting} from './scene-lighting.js';
import {CasinoInterior} from './casino-interior.js';

const PLAYER=new THREE.Vector3(-3,0,-.8),RIVAL=new THREE.Vector3(11.3,0,-.7),DOWNTOWN_RIVAL=new THREE.Vector3(13.3,0,-.7),WATERFRONT_RIVAL=new THREE.Vector3(11.8,0,-.8);
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Renderer consumes the game's state and events; it never creates sales or edits money. */
export class Neighborhood{
  constructor(container,{onSelect=()=>{},onBack=()=>{},onShop=()=>{},onFirstPerson=()=>{},onHome=()=>{},onHouseDetails=()=>{},onCasino=()=>{},onCasinoGame=()=>{}}={}){
    this.container=container;this.onCasino=onCasino;this.onCasinoGame=onCasinoGame;this.onHome=onHome;this.onHouseDetails=onHouseDetails;this.audio=gameAudio;this.onFirstPerson=onFirstPerson;this.onSelect=onSelect;this.onBack=onBack;this.onShop=onShop;this.view='neighborhood';this.angle=.55;this.zoom=1;this.people=new Map();this.personIds=new WeakMap();this.nextId=0;this.queue=[];this.time=0;this.signature='';this.stockSignature='';this.metrics={sales:0,upset:0,rival:0};this.ready=false;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#8bd8e0');
    this.scene.fog=new THREE.Fog('#92d8df',70,140);
    this.camera=new THREE.OrthographicCamera(-20,20,16,-16,.1,150);this.camera.position.set(25,30,34);this.target=new THREE.Vector3(0,0,0);
    this.desiredTarget=this.target.clone();this.desiredPosition=this.camera.position.clone();this.span=29;this.desiredSpan=29;
    try{this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});}catch(e){this.showError('This neighborhood needs WebGL. Please enable hardware acceleration or try a browser with WebGL support.');return}
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.03;
    container.appendChild(this.renderer.domElement);
    this.hemisphere=new THREE.HemisphereLight('#d9f7ff','#214d52',1.35);this.scene.add(this.hemisphere);
    this.sun=new THREE.DirectionalLight('#fff4d4',3.2);this.sun.position.set(-15,22,10);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-24,right:24,top:22,bottom:-22,near:1,far:70});this.sun.shadow.normalBias=.035;this.sun.shadow.bias=-.00015;this.sun.shadow.radius=3;this.scene.add(this.sun);
    this.environment=group(this.scene);this.location='neighborhood';this.buildNeighborhood();this.sceneObstacles=sceneColliders(this.environment);this.sceneGround=sceneGround(this.environment);this.batchScenery();this.weatherEffects=new WeatherEffects(this.scene);this.arrivals=[];
    this.actorRoot=group(this.scene);this.hitbox=new THREE.Mesh(new THREE.BoxGeometry(4,3.4,3.4),new THREE.MeshBasicMaterial({visible:false}));this.hitbox.position.copy(PLAYER).add(new THREE.Vector3(0,1.7,0));this.scene.add(this.hitbox);
    this.avatarController=new PlayerController(this);this.classicInterior=new ClassicInterior(this);this.homeInterior=new HomeInterior(this);this.casinoInterior=new CasinoInterior(this);this.installAudioControls();this.lighting=new SceneLighting(this);
    this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.drag=null;this.installControls();
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);this.resize();
    this.clock=new THREE.Clock();this.ready=true;this.frame=this.frame.bind(this);this.raf=requestAnimationFrame(this.frame);
    this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.showError('The 3D graphics context was interrupted. Reload to restore the neighborhood. Your game is still saved.');});
  }
  showError(text){const e=document.getElementById('scene3dError');if(e){delete e.dataset.startupWarning;e.textContent=text;e.hidden=false}}
  buildNeighborhood(){
    const g=this.environment;
    // An inhabited street that fills the viewport, rather than a distant floating diorama.
    box(g,0,-.23,0,150,.4,150,'#51a05a');
    box(g,0,.005,4,150,.07,4.6,'#334754');box(g,8,.006,-35,4.6,.07,76,'#334754');
    const paving=['#e6e9dc','#dce4d6','#eef0e1','#d5e1d1'];
    for(let x=-54;x<59;x+=.75)for(const z of [.92,7.08]){
      for(let row=0;row<2;row++)box(g,x,.1,z+(row-.5)*.72,.73,.17,.7,paving[(Math.round(x*4)+row+400)%4]);
      box(g,x,.18,z+(z<4?.69:-.69),.74,.18,.16,'#fcf8e8');
    }
    for(let z=-59;z<1;z+=.75)for(const x of [4.95,11.05])box(g,x,.09,z,1.4,.16,.73,paving[(Math.round(-z*4)+400)%4]);
    for(let x=-54;x<59;x+=2.4)if(x<5||x>11)box(g,x,.052,4,1.1,.018,.09,'#f3d16b');
    for(let z=-59;z<0;z+=2.4)box(g,8,.055,z,.09,.018,1.1,'#f3d16b');
    for(let i=0;i<6;i++){box(g,8,.06,2.3+i*.6,3.6,.025,.28,'#f0f0dc');box(g,5.95+i*.6,.06,-.1,.27,.025,2.4,'#f0f0dc');}
    // Slightly irregular mosaic tiles are modeled, not painted into a flat backdrop.
    for(let i=0;i<120;i++){
      const x=((i*67)%300)/10-15,z=((i*43)%230)/10-11.5;
      if(z>.1&&z<8||x>4.1&&x<11.9&&z<1)continue;
      box(g,x,.005,z,.4+(i%3)*.16,.025,.3,i%2?'#69b967':'#409557');
    }
    market(g,-10,-5.8);
    this.homes=buildNeighborhoodHomes(g);this.home=this.homes.find(h=>h.userData.purchasable);
    this.container.dataset.houses=String(this.homes.length);
    planter(g,-9,-2.6,3.3);planter(g,1.5,-3,2);planter(g,-7,8.9,3.5);planter(g,11.7,8.9,2);
    palm(g,-13,-1.9,1.18);palm(g,3,-6.9,1.05);palm(g,20.7,-1.8,.9);palm(g,-15,9.2,1.1);palm(g,8.7,9.5,1.1);
    tree(g,-10,-13.8,1);
    for(const [x,z] of [[-1.5,10.5],[1.9,10.7]])bush(g,x,z,1.1);
    bench(g,.8,-1.8,0);bench(g,-4,9.5,Math.PI);lamp(g,-7,.2);lamp(g,11.7,7.95);lamp(g,4.1,-6.9);
    chalkboard(g,-5.4,-.02);
    // Neighborhood props establish scale: mailboxes, flower beds, bicycle and hydrant.
    for(let i=0;i<7;i++){const x=-6.7+i*.25;box(g,x,.35,-2.3,.16,.4,.15,'#317849');box(g,x,.61,-2.3,.17,.16,.16,i%2?'#f7d94f':'#ec8797');}
    box(g,RIVAL.x,.075,RIVAL.z,3.8,.12,3.3,'#a5b890');
    for(let i=0;i<5;i++)for(const z of [-1.65,1.65])box(g,RIVAL.x-1.8+i*.8,.15,RIVAL.z+z,.4,.06,.06,'#e6e8ca');
    const plot=label(g,'ROOM TO GROW',RIVAL.x,.16,RIVAL.z,2.5,.45,{background:'#a5b890',color:'#466746',size:70});plot.rotation.x=-Math.PI/2;this.plotLabel=plot;
    for(const x of [-6,1]){box(g,x,.07,2.1,.65,.06,.32,'#243a43');for(let i=0;i<4;i++)box(g,x-.24+i*.16,.11,2.1,.04,.02,.25,'#6e9297');}
    box(g,3.8,.35,1.45,.25,.6,.25,'#df6546');box(g,3.8,.65,1.45,.35,.12,.32,'#f08055');
    const car=group(g,-12.8,.1,4.9);box(car,0,.5,0,2.7,.6,1.25,'#e7a249');box(car,0,1,0,1.4,.65,1.1,'#ffd071');box(car,.05,1.02,.57,1.03,.4,.03,'#236180');box(car,.78,.97,0,.03,.42,.95,'#80b9c5');for(const x of [-.9,.9])for(const z of [-.6,.6])box(car,x,.28,z,.46,.46,.16,'#25353a');box(car,1.36,.5,.4,.03,.17,.22,'#f6e6b2');
  }

  batchScenery(){
    const home=this.home,parent=home?.parent;if(home)home.removeFromParent();batch(this.environment);if(home){parent.add(home);batchPlayerHome(home)}
  }
  updateState(state,weather){
    this.state=state;if(!this.ready)return;
    const location=state.location==='beach'?'waterfront':state.location==='square'?'downtown':state.location==='park'?'park':'neighborhood';
    this.rivalPosition=location==='waterfront'?WATERFRONT_RIVAL:location==='downtown'?DOWNTOWN_RIVAL:RIVAL;
    if(this.location!==location){
      this.classicInterior.reset();this.homeInterior.reset();this.casinoInterior.reset();this.home=null;this.casino=null;
      this.weatherEffects.clearCaps();disposeGroup(this.environment);this.environment=group(this.scene);
      this.location=location;this.waterfront=null;
      if(location==='park')this.plotLabel=buildPark(this.environment,RIVAL);
      else if(location==='downtown'){this.plotLabel=buildDowntown(this.environment,this.rivalPosition);this.casino=this.environment.userData.casino;this.container.dataset.buildingCount=String(this.environment.userData.buildingCount);}
      else if(location==='waterfront'){this.waterfront=buildWaterfront(this.environment,this.rivalPosition);this.plotLabel=this.waterfront.plotLabel;}
      else this.buildNeighborhood();
      this.sceneObstacles=sceneColliders(this.environment);this.sceneGround=sceneGround(this.environment);
      this.batchScenery();this.signature='';this.clearTraffic();
    }
    this.avatarController.syncLocation();
    this.container.dataset.location=location;
    const active=activeUpgrades(state);const signature=JSON.stringify([active,state.price,state.day>=4,state.location]);
    if(this.signature!==signature){
      const oldDoorAmount=this.player?.doors?.amount||0;
      this.signature=signature;if(this.player)disposeGroup(this.player.group);if(this.rival)disposeGroup(this.rival.group);
      this.player=stand(this.scene,{...state,upgrades:active});this.player.group.position.copy(PLAYER);
      if(this.player.doors)this.player.doors.amount=oldDoorAmount;
      this.classicInterior.sync();
      if(!this.player.speaker)this.audio.stopMusic();
      this.container.dataset.standStyle=this.player.style;this.container.parentElement.dataset.standStyle=this.player.style;
      if(!this.avatarController.enabled){this.avatarController.parkAtStand();this.avatarController.publish()}
      const bounds=new THREE.Box3().setFromObject(this.player.group),size=bounds.getSize(new THREE.Vector3());
      this.hitbox.position.copy(bounds.getCenter(new THREE.Vector3()));this.hitbox.scale.set(size.x/4,size.y/3.4,size.z/3.4);
      this.rival=state.day>=4?stand(this.scene,{price:state.location==='beach'?2.75:state.location==='square'?2.5:2,upgrades:[]},{rival:true}):null;
      if(this.rival)this.rival.group.position.copy(this.rivalPosition);this.plotLabel.visible=!this.rival;
      this.player.roof.visible=this.view!=='interior';this.stockSignature='';this.updateCameraGoal();this.weatherEffects.register(this.environment,this.player.roof,this.rival?.roof);
    }
    this.classicInterior.sync();this.homeInterior.sync();this.publishAudio();
    const stockSig=JSON.stringify(state.inventory);
    if(this.stockSignature!==stockSig){this.stockSignature=stockSig;this.updateStock(state.inventory)}
    const weatherMode=weather.name==='Snowy'?'snow':weather.name==='Rainy'?'rain':'sunny';
    this.weatherEffects.set(weatherMode,this.location);this.container.dataset.weather=weatherMode;
    this.lighting.apply();
    const iceFree=active.includes('icemaker')||active.includes('icedispenser');
    const capacity=availableCups(state.inventory,state.recipe,iceFree);
    const info=document.getElementById('sceneInventory');if(info){info.textContent=`WORKSPACE · ${capacity} cups available   |   Lemons ${fmt(state.inventory.lemons)} · Sugar ${fmt(state.inventory.sugar)} · Ice ${fmt(state.inventory.ice)} · Cups ${fmt(state.inventory.cups)}`}
    const startupError=document.getElementById('scene3dError');if(startupError?.dataset.startupWarning==='true'){startupError.hidden=true;delete startupError.dataset.startupWarning;}
    this.container.dataset.ready='true';this.container.dataset.upgrades=this.player.equipment.userData.ids.join(',');this.container.dataset.competitor=String(!!this.rival);
  }
  updateStock(inventory){
    const root=this.player.stock;for(const child of [...root.children])disposeGroup(child);
    // Empty storage remains visibly empty until supplies have actually been bought.
    for(const [i,key] of ['lemons','sugar','ice','cups'].entries()){
      const x=this.player.style==='classic'?-1.6+i*.7:-1.12+i*.73;box(root,x,.47,-.84,.58,.29,.42,'#b18a56');box(root,x,.65,-1.05,.58,.11,.05,'#cfaa70');
      const count=Math.min(6,Math.ceil(inventory[key]/(key==='cups'?4:3)));
      for(let j=0;j<count;j++)box(root,x-.14+(j%2)*.26,.7+Math.floor(j/4)*.16,-.8-Math.floor((j%4)/2)*.16,key==='cups'?.13:.16,key==='cups'?.23:.13,.13,{lemons:'#ecc64b',sugar:'#f2e7cc',ice:'#b3d9d5',cups:'#fff0c8'}[key]);
    }batch(root);
  }
  setView(view){
    if(!['neighborhood','exterior','interior','firstperson','home','casino'].includes(view))return;
    if(view==='casino'){if(!this.casinoInterior.available())return;if(!this.casinoInterior.active)this.casinoInterior.enter(this.state.playerView?.casinoInterior||{});this.view='casino';this.container.dataset.view='casino';return}
    if(this.casinoInterior.active||this.casinoInterior.entering){this.casinoInterior.deactivate();this.avatarController.parkAtStand();}
    if(view==='home'){if(!this.homeInterior.owned()||!this.homeInterior.available())return;if(!this.homeInterior.active)this.homeInterior.enter(this.state.playerView?.homeInterior||{});this.view='home';this.container.dataset.view='home';return}
    if(this.homeInterior.active){this.homeInterior.deactivate();this.avatarController.parkAtStand();}
    if(view==='firstperson'){if(this.player?.style!=='classic')return;if(!this.classicInterior.active)this.classicInterior.enterInstant();this.view=view;this.container.dataset.view=view;return}
    if(this.classicInterior.active||this.classicInterior.entering){this.classicInterior.deactivate();this.avatarController.parkAtStand();this.classicInterior.sync();}
    if(view!=='neighborhood'&&this.avatarController?.enabled)this.avatarController.setEnabled(false);
    const changed=this.view!==view;this.view=view;
    if(changed){this.zoom=1;this.angle=view==='interior'?.2:.55}
    if(this.player)this.player.roof.visible=view!=='interior';
    this.container.dataset.view=view;this.updateCameraGoal();
  }
  rotate(delta){if(this.casinoInterior.active){this.casinoInterior.look(-delta*160,0);return}if(this.homeInterior.active){this.homeInterior.look(-delta*160,0);return}if(this.classicInterior.active){this.classicInterior.look(-delta*160,0);return}this.angle=THREE.MathUtils.clamp(this.angle+delta,-.9,1.2);this.updateCameraGoal()}
  updateCameraGoal(){
    const aspect=this.container.clientWidth/Math.max(1,this.container.clientHeight);
    if(this.casinoInterior?.active){this.casinoInterior.updateCamera();return}if(this.homeInterior?.active){this.homeInterior.updateCamera();return}if(this.classicInterior?.active){this.classicInterior.updateCamera();return}
    if(this.avatarController?.enabled){
      this.desiredTarget.copy(this.avatarController.avatar.group.position).add(new THREE.Vector3(0,.8,0));
      this.desiredPosition.copy(this.desiredTarget).add(new THREE.Vector3(Math.sin(this.angle)*16,13,Math.cos(this.angle)*16));
      this.desiredSpan=Math.max(10.5,11/Math.max(aspect,.7))/this.zoom;
    }else if(this.view==='neighborhood'){
      const downtown=this.location==='downtown',waterfront=this.location==='waterfront';
      this.desiredTarget.set(-1.2,downtown?1.7:waterfront?1:1.2,downtown?-1.8:waterfront?0:-1.2);this.desiredPosition.copy(this.desiredTarget).add(new THREE.Vector3(Math.sin(this.angle)*34,23,Math.cos(this.angle)*34));this.desiredSpan=Math.max(downtown||waterfront?18:15.8,26/Math.max(aspect,.9))/this.zoom;
    }else{
      const interior=this.view==='interior',radius=interior?7:10;
      this.desiredTarget.copy(PLAYER).add(new THREE.Vector3(0,interior?1:.9,0));
      this.desiredPosition.copy(this.desiredTarget).add(new THREE.Vector3(Math.sin(this.angle)*radius,interior?7:6.5,Math.cos(this.angle)*radius));
      this.desiredSpan=(interior?5.4:9.5)/this.zoom;
    }
    if(reducedMotion()){this.camera.position.copy(this.desiredPosition);this.target.copy(this.desiredTarget);this.span=this.desiredSpan}
  }
  resize(){if(!this.renderer)return;const {clientWidth:w,clientHeight:h}=this.container;if(!w||!h)return;this.renderer.setSize(w,h,false);this.updateCameraGoal()}
  installAudioControls(){
    const nav=this.container.parentElement.querySelector('.scene-nav');
    this.soundButton=document.createElement('button');this.soundButton.type='button';this.soundButton.className='scene-chip';this.soundButton.id='gameSoundBtn';
    this.musicButton=document.createElement('button');this.musicButton.type='button';this.musicButton.className='scene-chip';this.musicButton.id='speakerToggleBtn';this.musicButton.hidden=true;
    nav.append(this.soundButton,this.musicButton);this.soundButton.onclick=()=>{this.audio.unlock();this.audio.setMuted(!this.audio.muted);this.publishAudio();if(this.classicInterior.active||this.homeInterior.active||this.casinoInterior.active)this.container.focus({preventScroll:true})};this.musicButton.onclick=()=>this.toggleSpeaker();
    this.audioAbort=new AbortController();document.addEventListener('pointerdown',e=>{if(e.target.closest('button,canvas'))this.audio.unlock().then(()=>{if(e.target.closest('button'))this.audio.effect('click')})},{capture:true,signal:this.audioAbort.signal});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.audio.setAudible(false)},{signal:this.audioAbort.signal});this.publishAudio();
  }
  async toggleSpeaker(){if(!this.player?.speaker)return;await this.audio.toggleMusic();this.publishAudio();if(this.classicInterior.active||this.homeInterior.active||this.casinoInterior.active)this.container.focus({preventScroll:true})}
  publishAudio(){
    const playing=!!this.audio.musicPlaying;
    this.soundButton.textContent=this.audio.muted?'Sound off':'Sound on';this.soundButton.setAttribute('aria-pressed',String(!this.audio.muted));
    const station=this.audio.stationInfo,next=this.audio.nextStationInfo;
    this.musicButton.hidden=!this.player?.speaker;this.musicButton.textContent=this.audio.starting?'Radio: Loading…':playing?`Radio: ${station.name}`:'Speaker: Play';this.musicButton.setAttribute('aria-pressed',String(playing));this.musicButton.title=playing?`Playing ${station.name} — ${station.title?station.title+', ':''}${station.description}. Click ${next?'for '+next.name:'to turn off'}.`:'Click to play Lemon FM';
    this.container.dataset.radioStation=playing?String(this.audio.station):'0';
    this.container.dataset.trackTitle=station?.title||'';this.container.dataset.trackDuration=String(this.audio.trackBuffer?.duration||0);this.container.dataset.trackPosition=String(+this.audio.trackPosition.toFixed(3));this.container.dataset.trackPlays=String(this.audio.trackPlayCount);
    this.container.dataset.musicPlaying=String(playing);this.container.dataset.audioState=this.audio.context?.state||'locked';this.container.dataset.audioNotes=String(this.audio.noteCount);this.container.dataset.audioLevel=String(+this.audio.level().toFixed(4));
  }
  currentCamera(){if(this.casinoInterior?.active)return this.casinoInterior.camera;if(this.homeInterior?.active)return this.homeInterior.camera;return this.classicInterior.active?this.classicInterior.camera:this.camera}
  interactAt(x,y){
    if(this.paused||this.classicInterior.modalOpen())return;
    const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true};
    const r=this.container.getBoundingClientRect();this.pointer.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);this.raycaster.setFromCamera(this.pointer,this.currentCamera());
    if(this.casinoInterior.interact(this.raycaster))return;
    if(this.homeInterior.interact(this.raycaster))return;
    if(this.homeInterior.active)return;
    const candidates=[];
    for(const [kind,object] of [['door',this.player?.doors?.group],['speaker',this.player?.speaker?.group]])if(object&&visible(object)){const hit=this.raycaster.intersectObject(object,true)[0];if(hit)candidates.push({...hit,kind})}
    candidates.sort((a,b)=>a.distance-b.distance);
    for(const target of candidates){
      const blocker=this.raycaster.intersectObject(this.player.group,true).find(h=>visible(h.object)&&h.object.material.visible!==false&&!(h.object.material.transparent&&h.object.material.opacity<.5));
      if(blocker&&blocker.distance<target.distance-.10)continue;
      if(target.kind==='speaker')this.toggleSpeaker();else if(this.classicInterior.active)this.classicInterior.toggleDoors();else this.classicInterior.beginEntry();return;
    }
    if(!this.classicInterior.active&&!this.classicInterior.entering&&this.raycaster.intersectObject(this.hitbox).length)this.onSelect();
  }
  installControls(){
    const c=this.container;
    c.addEventListener('pointerdown',e=>{if(e.button!==0)return;c.focus({preventScroll:true});this.audio.unlock();this.drag={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:0};c.setPointerCapture(e.pointerId)});
    c.addEventListener('pointermove',e=>{if(!this.drag)return;const dx=e.clientX-this.drag.lastX,dy=e.clientY-this.drag.lastY;this.drag.lastX=e.clientX;this.drag.lastY=e.clientY;this.drag.moved=Math.hypot(e.clientX-this.drag.x,e.clientY-this.drag.y);if(this.drag.moved>5){if(this.casinoInterior.active)this.casinoInterior.look(dx,dy);else if(this.homeInterior.active)this.homeInterior.look(dx,dy);else if(this.classicInterior.active)this.classicInterior.look(dx,dy);else if(!this.classicInterior.entering)this.rotate(-dx*.008)}});
    c.addEventListener('pointerup',e=>{if(!this.drag)return;if(this.drag.moved<6&&!this.classicInterior.entering)this.interactAt(e.clientX,e.clientY);this.drag=null});
    c.addEventListener('pointercancel',()=>{this.drag=null});
    c.addEventListener('wheel',e=>{if(!c.matches(':focus'))return;e.preventDefault();if(this.classicInterior.active||this.homeInterior.active||this.casinoInterior.active||this.casinoInterior.entering)return;this.zoom=THREE.MathUtils.clamp(this.zoom-e.deltaY*.001,['neighborhood','downtown'].includes(this.location)?.4:.8,1.4);this.updateCameraGoal()},{passive:false});
    c.addEventListener('keydown',e=>{if(this.casinoInterior.active||this.casinoInterior.entering||this.homeInterior.active||this.classicInterior.active||this.classicInterior.entering)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();this.rotate(e.key==='ArrowLeft'?-.16:.16)}if(e.key==='Escape')this.onBack();if(e.key==='Enter')this.onSelect()});
  }
  clearTraffic(){for(const a of this.people.values())disposeGroup(a.group);this.people.clear();this.arrivals=[];this.queue=[];}
  beginDay(visitors,tickSeconds){
    this.clearTraffic();this.metrics={sales:0,upset:0,rival:0};
    const plan=planArrivals(visitors,this.location,tickSeconds);this.arrivalStart=performance.now()/1000;
    this.arrivals=plan.visitors;this.container.dataset.spawnOrigins=JSON.stringify([...new Set(plan.visitors.map(v=>v.path[0].join(',')))]);
    return plan;
  }
  idFor(person){if(!this.personIds.has(person))this.personIds.set(person,++this.nextId);return this.personIds.get(person)}
  actor(person,start){
    const id=person?this.idFor(person):++this.nextId;if(this.people.has(id))return this.people.get(id);
    const entry=person&&this.arrivals.find(v=>v.person===person);
    if(entry)entry.spawned=true;
    const origin=start||(entry?new THREE.Vector3(entry.path.at(-1)[0],0,entry.path.at(-1)[1]):new THREE.Vector3(-23,0,.92));
    const a={...character(this.actorRoot,id),id,mode:'arriving',destination:new THREE.Vector3(),born:this.time};a.group.position.copy(origin);this.people.set(id,a);return a;
  }
  setQueue(queue){
    if(!this.ready)return;this.queue=queue;
    const ids=new Set(queue.map(p=>this.idFor(p)));
    for(const [index,p] of queue.entries()){const x=PLAYER.x+(this.player?.style==='classic'?.95:.55)+index*.63,a=this.actor(p);a.arrival=null;a.destination.set(x,0,1.05);a.mode='queue'}
    for(const a of this.people.values())if(a.mode==='queue'&&!ids.has(a.id)){a.mode='upset';a.destination.set(-23,0,1.6)}
    this.container.dataset.queue=String(queue.length);
  }
  customerEvent(type,person){
    if(!this.ready)return;
    const a=this.actor(person);a.arrival=null;a.route=[];
    if(type==='sale'){this.audio.effect('sale');a.mode='sale';a.cup.visible=true;a.route=[new THREE.Vector3(a.group.position.x,0,1.6),new THREE.Vector3(22,0,1.6)];this.metrics.sales++}
    else if(type==='rival'){
      a.mode='rival';a.route=this.location==='park'||this.location==='waterfront'?[new THREE.Vector3(this.rivalPosition.x,0,1.05),new THREE.Vector3(this.rivalPosition.x,0,1.4)]:[new THREE.Vector3(4.8,0,.92),new THREE.Vector3(8,0,.92),new THREE.Vector3(11.05,0,.92),new THREE.Vector3(this.rivalPosition.x,0,1.4)];this.metrics.rival++;
    }
    else if(type==='pass'){a.mode='pass';a.route=[new THREE.Vector3(23,0,this.location==='waterfront'?1.3:.65)]}
    else{a.mode='upset';a.route=[new THREE.Vector3(a.group.position.x,0,1.6),new THREE.Vector3(-23,0,1.6)];this.metrics.upset++}
    a.destination.copy(a.route.shift());a.born=this.time;
    this.container.dataset.sales=String(this.metrics.sales);this.container.dataset.upset=String(this.metrics.upset);this.container.dataset.rival=String(this.metrics.rival);
  }
  frame(){
    const elapsed=this.clock.getDelta(),dt=Math.min(elapsed,.05),moveDt=Math.min(elapsed,.2);this.time=performance.now()/1000;
    // The bank and title screen need no off-screen shadow-map rendering.
    if(this.paused||!this.container.clientWidth||!this.container.clientHeight){this.casino?.crowd?.pause();this.audio.setAudible(false);this.container.dataset.casinoAmbience=String(this.audio.casinoPlaying);if(this.paused&&this.arrivalStart)this.arrivalStart+=elapsed;this.raf=requestAnimationFrame(this.frame);return;}
    const suspended=!!this.container.closest('#ll-app')?.querySelector('#modal.show')||document.hidden;this.audio.setAudible(!suspended);
    this.avatarController.update(dt,this.time,reducedMotion());this.classicInterior.update(moveDt,this.time,reducedMotion());this.homeInterior.update(moveDt,this.time);this.casinoInterior.update(moveDt,this.time);
    this.player?.speaker?.update(reducedMotion()?0:this.audio.beat());this.publishAudio();
    const ease=1-Math.exp(-dt*7);this.camera.position.lerp(this.desiredPosition,ease);this.target.lerp(this.desiredTarget,ease);this.span=THREE.MathUtils.lerp(this.span,this.desiredSpan,ease);
    const aspect=this.container.clientWidth/Math.max(1,this.container.clientHeight);this.camera.left=-this.span*aspect/2;this.camera.right=this.span*aspect/2;this.camera.top=this.span/2;this.camera.bottom=-this.span/2;this.camera.updateProjectionMatrix();this.camera.lookAt(this.target);
    for(const entry of this.arrivals){
      const elapsed=this.time-this.arrivalStart;if(elapsed<entry.spawnAt)continue;
      const id=this.idFor(entry.person);let a=this.people.get(id);
      if(!a&&!entry.spawned){a=this.actor(entry.person,new THREE.Vector3(entry.path[0][0],0,entry.path[0][1]));a.arrival=entry;entry.spawned=true;}
      if(a?.arrival){const point=pointOnRoute(entry.path,(elapsed-entry.spawnAt)*entry.speed);a.group.position.set(point.x,walkElevation(this.location,point.x,point.z),point.z);a.group.rotation.y=point.angle;}
    }
    for(const [id,a] of this.people){
      if(a.arrival){if(!reducedMotion())for(let i=0;i<2;i++){a.legs[i].rotation.x=Math.sin(this.time*13+id)*.45*(i?-1:1);a.arms[i].rotation.x=-a.legs[i].rotation.x;}continue;}
      const delta=a.destination.clone().sub(a.group.position);delta.y=0;const distance=delta.length(),walking=distance>.06;
      if(walking){a.group.position.addScaledVector(delta.normalize(),Math.min(distance,moveDt*5.4));a.group.rotation.y=Math.atan2(delta.x,delta.z);if(!reducedMotion())for(let i=0;i<2;i++){a.legs[i].rotation.x=Math.sin(this.time*13+id)*.45*(i?-1:1);a.arms[i].rotation.x=-a.legs[i].rotation.x}}
      else{a.legs.forEach(l=>l.rotation.x=0);a.arms.forEach(l=>l.rotation.x=0);if(a.mode==='queue')a.group.rotation.y=Math.PI;if(a.route?.length)a.destination.copy(a.route.shift());}
      a.group.position.y=walkElevation(this.location,a.group.position.x,a.group.position.z);
      if((!walking&&!a.route?.length&&Math.hypot(a.group.position.x-a.destination.x,a.group.position.z-a.destination.z)<.06&&a.mode!=='queue'&&this.time-a.born>1.5)||this.time-a.born>24){disposeGroup(a.group);this.people.delete(id)}
    }
    this.weatherEffects.update(this.time,this.view==='interior',reducedMotion());
    if(this.waterfront){animateWaterfront(this.waterfront,this.time,reducedMotion());const boat=this.waterfront.boat;this.container.dataset.boatPose=JSON.stringify({x:boat.position.x,y:boat.position.y,z:boat.position.z,pitch:boat.rotation.x,roll:boat.rotation.z});this.container.dataset.waveHeight=String(this.waterfront.surface.geometry.attributes.position.getY(1000));}
    const camera=this.currentCamera();camera.updateMatrixWorld(true);this.classicInterior.projectTargets(camera);
    if(this.player?.speaker){const p=this.player.speaker.group.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.55,.2)).project(camera);this.container.dataset.speakerScreen=JSON.stringify({x:(p.x+1)/2,y:(1-p.y)/2});this.container.dataset.speakerPulse=String(+this.player.speaker.cone.scale.z.toFixed(3));}
    this.renderer.render(this.scene,camera);this.raf=requestAnimationFrame(this.frame);
  }
  dispose(){this.casinoInterior?.dispose();this.lighting?.dispose();this.homeInterior?.dispose();this.classicInterior?.dispose();this.audioAbort?.abort();this.audio.reset();this.avatarController?.dispose();this.weatherEffects?.dispose();cancelAnimationFrame(this.raf);this.resizeObserver?.disconnect();for(const o of [...this.scene.children])disposeGroup(o);this.renderer?.dispose();this.renderer?.domElement.remove()}
}
function fmt(v){return Number(v.toFixed(1))}
