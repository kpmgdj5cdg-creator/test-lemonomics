import * as THREE from 'three';
import {box} from './models.js';

// A dedicated polished finish keeps the shared world materials unchanged.
// Reuse the two tile materials within each room so static batching stays cheap.
export function storeFloorTiles(parent){
 const materials=new Map();
 return (x,z,color)=>{
  if(!materials.has(color)){
   const material=new THREE.MeshPhysicalMaterial({color,roughness:.2,metalness:0,clearcoat:1,clearcoatRoughness:.12});
   material.userData.owned=true;
   materials.set(color,material);
  }
  const tile=box(parent,x,.287,z,.985,.012,.985,color);
  tile.material=materials.get(color);
  return tile;
 };
}
