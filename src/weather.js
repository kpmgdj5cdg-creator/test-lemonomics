import * as THREE from 'three';
import {group,box,batch,disposeGroup} from './models.js';
import {CLASSIC_ROOF_COLORS} from './classic-stand.js';
import {HOME_ROOF_COLORS,HOME_TREE_COLORS} from './neighborhood-homes.js';

const snowColors=new Set([...HOME_ROOF_COLORS,...HOME_TREE_COLORS,...CLASSIC_ROOF_COLORS,'#1e6a80','#e17d62','#f2ba53','#20787f','#268b8c','#217449','#2a9853','#54af58','#438d42','#246535','#68a548','#278c54','#156744','#fff0c5','#f2bc25','#f6b61c','#248cc0','#577f88','#a7b9c0','#347c91','#257f90','#c96e72','#df7852']);
export class WeatherEffects{
  constructor(scene){
    this.root=group(scene);this.mode='sunny';this.caps=[];
    this.snowMaterial=new THREE.MeshStandardMaterial({color:'#eef8ff',roughness:1});
    this.snowGround=new THREE.Mesh(new THREE.BoxGeometry(150,.025,150),this.snowMaterial);this.snowGround.position.y=.02;this.snowGround.receiveShadow=true;this.root.add(this.snowGround);
    this.waterfrontSnow=new THREE.Mesh(new THREE.BoxGeometry(150,.025,83),this.snowMaterial);this.waterfrontSnow.position.set(0,.02,-37.5);this.waterfrontSnow.receiveShadow=true;this.root.add(this.waterfrontSnow);
    this.puddles=group(this.root);for(const [x,z,w] of [[-8,4,2.3],[1,4.7,1.4],[8,3,1.7],[-13,4.1,1.5]])box(this.puddles,x,.052,z,w,.015,.45,'#577d91');batch(this.puddles);
    this.parkPuddles=group(this.root);for(const [x,z,w] of [[-8,1.5,1.2],[1,1.3,.8],[6.5,3,1],[-13,7.3,1.1]])box(this.parkPuddles,x,.143,z,w,.015,.35,'#668e9d');batch(this.parkPuddles);
    this.waterfrontPuddles=group(this.root);for(const [x,z,w] of [[-9,.9,1.1],[1.1,1.3,.7],[7.1,6.5,.7]])box(this.waterfrontPuddles,x,.194,z,w,.008,.3,'#74a6ab');batch(this.waterfrontPuddles);
    this.downtownSnow=group(this.root);for(const [x,z,w] of [[-9,1.49,2],[-6.7,1.48,1.2],[2.2,1.48,1.1],[12.2,7.65,2.4],[-6,7.65,1.4]])box(this.downtownSnow,x,.23,z,w,.16,.26,'#eef8ff');batch(this.downtownSnow);
    const positions=new Float32Array(420*2*3);this.rainGeometry=new THREE.BufferGeometry();this.rainGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
    this.rain=new THREE.LineSegments(this.rainGeometry,new THREE.LineBasicMaterial({color:'#c3e5f1',transparent:true,opacity:.55,depthWrite:false}));this.rain.frustumCulled=false;this.root.add(this.rain);
    this.snowGeometry=new THREE.BufferGeometry();this.snowGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(320*3),3));
    this.snow=new THREE.Points(this.snowGeometry,new THREE.PointsMaterial({color:'#ffffff',size:.11,transparent:true,opacity:.92,depthWrite:false}));this.snow.frustumCulled=false;this.root.add(this.snow);
    this.set('sunny');
  }
  clearCaps(){for(const cap of this.caps){cap.geometry.dispose();cap.removeFromParent()}this.caps=[]}
  register(...roots){
    this.clearCaps();
    for(const root of roots.filter(Boolean)){
      root.updateWorldMatrix(true,true);const inverse=root.matrixWorld.clone().invert(),vertices=[];
      root.traverse(o=>{
        if(!o.isMesh||!o.geometry.attributes.normal||o.material===this.snowMaterial||!snowColors.has('#'+o.material.color?.getHexString()))return;
        const geometry=o.geometry.index?o.geometry.toNonIndexed():o.geometry,position=geometry.attributes.position,normal=geometry.attributes.normal;
        const transform=new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld),nm=new THREE.Matrix3().getNormalMatrix(transform);
        for(let i=0;i<position.count;i+=3){const up=new THREE.Vector3().fromBufferAttribute(normal,i).applyMatrix3(nm).normalize();if(up.y<.7)continue;
          for(let j=0;j<3;j++){const p=new THREE.Vector3().fromBufferAttribute(position,i+j).applyMatrix4(transform);vertices.push(p.x,p.y+.035,p.z);}}
        if(geometry!==o.geometry)geometry.dispose();
      });
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
      const cap=new THREE.Mesh(geometry,this.snowMaterial);cap.receiveShadow=true;cap.visible=this.mode==='snow';root.add(cap);this.caps.push(cap);
    }
  }
  set(mode,location='neighborhood'){
    this.mode=mode;this.rain.visible=mode==='rain';this.snow.visible=mode==='snow';
    this.snowGround.visible=mode==='snow'&&location!=='waterfront';this.waterfrontSnow.visible=mode==='snow'&&location==='waterfront';this.downtownSnow.visible=mode==='snow'&&location==='downtown';
    this.puddles.visible=mode==='rain'&&location!=='park'&&location!=='waterfront';this.parkPuddles.visible=mode==='rain'&&location==='park';this.waterfrontPuddles.visible=mode==='rain'&&location==='waterfront';
    for(const cap of this.caps)cap.visible=mode==='snow';
  }
  update(time,interior,reduced){
    this.rain.visible=this.mode==='rain'&&!interior;this.snow.visible=this.mode==='snow'&&!interior;
    if(this.mode==='sunny'||interior)return;
    const t=reduced?0:time,attribute=this.mode==='rain'?this.rainGeometry.attributes.position:this.snowGeometry.attributes.position;
    const count=this.mode==='rain'?420:320;
    for(let i=0;i<count;i++){
      const x=((i*79)%440)/10-22,z=((i*113)%380)/10-21,y=1+((i*.718-t*(this.mode==='rain'?15:1.1))%14+14)%14;
      if(this.mode==='rain'){attribute.setXYZ(i*2,x,y,z);attribute.setXYZ(i*2+1,x+.07,y-.52,z+.04)}
      else attribute.setXYZ(i,x+Math.sin(t*.7+i)*.3,y,z+Math.cos(t*.5+i)*.2);
    }attribute.needsUpdate=true;
  }
  dispose(){this.clearCaps();disposeGroup(this.root);this.rainGeometry.dispose();this.snowGeometry.dispose();this.snowMaterial.dispose();this.rain.material.dispose();this.snow.material.dispose();}
}
