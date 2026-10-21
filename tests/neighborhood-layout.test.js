import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildNeighborhoodHomes,RESIDENTIAL_LOTS} from '../src/neighborhood-homes.js';
import {market} from '../src/street-details.js';
import {sceneColliders} from '../src/player-controller.js';
import {blocked,WALKING_AREAS} from '../src/player-movement.js';
import {planArrivals,pointOnRoute} from '../src/traffic.js';

function layout(){const root=new THREE.Group();buildNeighborhoodHomes(root);root.updateMatrixWorld(true);return root}
test('residential lots including roofs, fences, patios and trees have separate footprints',()=>{
  const root=layout(),plots=root.children.filter(c=>c.userData.kind==='residential-lot');
  const boxes=plots.map(p=>new THREE.Box3().setFromObject(p));
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert.equal(boxes[i].intersectsBox(boxes[j]),false,`Lots ${i} and ${j} overlap`);
  const road=new THREE.Box3(new THREE.Vector3(-75,.32,1.7),new THREE.Vector3(75,6,6.3));
  const sideStreet=new THREE.Box3(new THREE.Vector3(5.7,.32,-74),new THREE.Vector3(10.3,6,1.7));
  for(const box of boxes){assert.equal(box.intersectsBox(road),false);assert.equal(box.intersectsBox(sideStreet),false)}
});
test('the relocated left home has its front door aligned with Maple Market',()=>{
  const root=layout(),shop=market(root,-10,-5.8);
  const plot=root.children.find(c=>c.userData.lot?.x===-20&&c.userData.lot?.angle===0);
  root.updateMatrixWorld(true);
  let frontDoor,marketDoor;
  plot.traverse(o=>{if(o.isMesh&&o.scale.x===.86&&o.scale.y===2.16)frontDoor=o});
  shop.traverse(o=>{if(o.isMesh&&o.scale.x===.75&&o.scale.y===2.16)marketDoor=o});
  assert.ok(frontDoor&&marketDoor);
  assert.ok(Math.abs(frontDoor.getWorldPosition(new THREE.Vector3()).z-marketDoor.getWorldPosition(new THREE.Vector3()).z)<1e-8);
  assert.equal(new THREE.Box3().setFromObject(plot).intersectsBox(new THREE.Box3().setFromObject(shop)),false);
});
test('front walks and existing customer routes stay clear of the expanded residential scenery',()=>{
  const root=layout(),obstacles=sceneColliders(root),bounds=WALKING_AREAS.neighborhood.bounds;
  for(const [i,lot] of RESIDENTIAL_LOTS.entries())if(!lot.standNeighbor){
    for(let z=3.05;z<lot.walkEnd;z+=.15){const x=lot.x+z*Math.sin(lot.angle),worldZ=lot.z+z*Math.cos(lot.angle);assert.equal(blocked(x,worldZ,obstacles,bounds),false,`Home ${i}, walk ${z}`)}
  }
  for(const visitor of planArrivals(6,'neighborhood').visitors){for(let d=0;d<visitor.length;d+=.25){const p=pointOnRoute(visitor.path,d);assert.equal(blocked(p.x,p.z,obstacles,{minX:-80,maxX:80,minZ:-80,maxZ:80}),false,`Customer path ${visitor.route} at ${d}`)}}
});

test('all new roof finishes receive visible snow on their upper surfaces',async()=>{
  const {HOME_ROOF_COLORS}=await import('../src/neighborhood-homes.js');
  const {WeatherEffects}=await import('../src/weather.js');
  const {box}=await import('../src/models.js');
  const effects=new WeatherEffects(new THREE.Scene());
  for(const color of HOME_ROOF_COLORS){
    const roof=new THREE.Group();box(roof,0,3,0,5,.2,4,color);
    effects.register(roof);effects.set('snow');
    assert.equal(effects.caps[0].visible,true);
    const points=effects.caps[0].geometry.attributes.position;
    assert.ok(points.count>=6,`Missing snow on ${color}`);
    for(let i=0;i<points.count;i++)assert.ok(points.getY(i)>3.1);
  }
  effects.dispose();
});
