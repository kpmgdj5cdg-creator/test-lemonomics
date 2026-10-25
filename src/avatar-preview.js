import * as THREE from 'three';
import {PlayerAvatar,appearanceFor} from './avatar.js';
import {box} from './models.js';

// One renderer supplies reusable portraits. These are renders of the exact playable
// rig, not separate illustrated avatars, and do not allocate a context per slot.
let renderer;
const previews=new Map();
export function avatarPreview(type,appearance){
  const profile={...appearanceFor(type),...appearance},key=JSON.stringify(profile);
  if(previews.has(key))return previews.get(key);
  try{
    renderer??=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
    renderer.setSize(240,320);renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000,0);renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=THREE.PCFShadowMap;
    const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-.9,.9,1.2,-1.2,.1,20);
    camera.position.set(2.6,2.1,4);camera.lookAt(0,.68,0);
    scene.add(new THREE.HemisphereLight(0xfff9dc,0x507547,2));
    const sun=new THREE.DirectionalLight(0xfff1cb,3.2);sun.position.set(-3,5,4);sun.castShadow=true;
    sun.shadow.mapSize.set(512,512);Object.assign(sun.shadow.camera,{left:-2,right:2,top:2,bottom:-2,near:.1,far:12});sun.shadow.normalBias=.025;scene.add(sun);
    box(scene,0,-.045,0,1.12,.1,.95,'#63a653');
    const avatar=new PlayerAvatar(scene,profile);avatar.group.rotation.y=-.12;
    renderer.render(scene,camera);
    const url=renderer.domElement.toDataURL('image/png');previews.set(key,url);
    // Merged character parts own their buffers; primitive geometry/materials remain shared.
    avatar.dispose();sun.shadow.map?.dispose();scene.clear();return url;
  }catch(error){console.warn('Avatar preview unavailable:',error.message);return '';}
}
export function avatarPortrait(type,appearance){
  const image=avatarPreview(type,appearance);
  return image?`<img class="profile-portrait" data-preview="3d" src="${image}" alt="" draggable="false">`:'<span aria-hidden="true">👤</span>';
}
