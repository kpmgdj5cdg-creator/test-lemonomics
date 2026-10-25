import {test,expect} from '@playwright/test';import {readFile,writeFile} from 'node:fs/promises';
// Previous production rig (acf57c7); stored as a fixture so source ZIPs need no Git history.
const previous=await readFile(new URL('./fixtures/legacy-character.txt',import.meta.url),'utf8');
test('character render budget compared with the previous production rig',async({page})=>{
 await page.route('**/character-benchmark',r=>r.fulfill({contentType:'text/html',body:'<html><body>Character render benchmark</body></html>'}));await page.goto('/character-benchmark');
 const metrics=await page.evaluate(async source=>{
  const THREE=await import('/node_modules/three/build/three.module.js'),models=await import('/src/models.js');
  const legacy=new Function('group','box','return '+source)(models.group,models.box),renderer=new THREE.WebGLRenderer({antialias:false});renderer.setSize(640,360);renderer.setPixelRatio(1);const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,640/360,.1,50);camera.position.set(0,3.8,9);camera.lookAt(0,.8,-1.5);scene.add(new THREE.HemisphereLight(0xffffff,0x777777,2));
  const measure=async(make,distance)=>{const root=new THREE.Group();scene.add(root);const rigs=[];for(let i=0;i<29;i++){const r=make(root,i,{type:i%2?'female':'male'});r.cup.visible=false;r.group.position.set((i%7-3)*.85,0,-Math.floor(i/7)*1.2);r.update?.(1,{distance});rigs.push(r)}for(let i=0;i<3;i++)renderer.render(scene,camera);const samples=[];for(let i=0;i<12;i++){const start=performance.now();for(const r of rigs)r.update?.(i/10,{moving:true,distance});renderer.render(scene,camera);renderer.getContext().finish();samples.push(performance.now()-start);await new Promise(requestAnimationFrame)}samples.sort((a,b)=>a-b);const result={drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,medianRenderMs:samples[Math.floor(samples.length/2)]};models.disposeGroup(root);return result};
  const old=await measure(legacy,0),near=await measure(models.character,0),distant=await measure(models.character,30);renderer.dispose();return {characters:29,renderer:'Chromium SwiftShader, 640x360, no shadows; warmed renderer, GPU finish, 12 samples',old,near,distant};
 },previous);
 await writeFile('artifacts/character-performance.json',JSON.stringify(metrics,null,2));console.log(JSON.stringify(metrics));expect(metrics.near.drawCalls).toBeLessThanOrEqual(metrics.old.drawCalls*1.1);expect(metrics.distant.drawCalls).toBeLessThan(metrics.near.drawCalls);expect(metrics.near.triangles).toBeLessThan(30000);
});
