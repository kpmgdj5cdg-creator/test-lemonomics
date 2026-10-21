import json
PATH_TO_SHOP='''shop => {
 const world=window.testWorld,c=world.avatarController;
 c.setEnabled(true);world.angle=0;
 const start=c.avatar.group.position,obs=c.obstacles(),bounds={minX:-24,maxX:21,minZ:-20,maxZ:12};
 const dest=shop==='books'?{x:-10,z:-3.45}:{x:1.4,z:-12.6};
 const blocked=(x,z)=>x<bounds.minX+.25||x>bounds.maxX-.25||z<bounds.minZ+.25||z>bounds.maxZ-.25||obs.some(o=>{const dx=x-Math.max(o.minX,Math.min(x,o.maxX)),dz=z-Math.max(o.minZ,Math.min(z,o.maxZ));return dx*dx+dz*dz<.0625;});
 const key=(x,z)=>`${x},${z}`,sx=Math.round(start.x*4),sz=Math.round(start.z*4),queue=[[sx,sz]],seen=new Map([[key(sx,sz),null]]);let found=null;
 for(let i=0;i<queue.length;i++){
  const [x,z]=queue[i];
  if(Math.hypot(x/4-dest.x,z/4-dest.z)<1.1){found=[x,z];break;}
  for(const [dx,dz] of [[0,1],[0,-1],[1,0],[-1,0]]){
   const nx=x+dx,nz=z+dz,k=key(nx,nz);
   if(!seen.has(k)&&!blocked(nx/4,nz/4)&&!blocked(x/4+dx/8,z/4+dz/8)){seen.set(k,[x,z]);queue.push([nx,nz]);}
  }
 }
 if(!found)throw Error('No traversable path to '+shop+'; visited '+seen.size);
 const path=[];for(let node=found;node;node=seen.get(key(...node)))path.unshift(node);
 for(let i=1;i<path.length;i++){
  const [x,z]=path[i],prev=path[i-1],code=x>prev[0]?'KeyD':x<prev[0]?'KeyA':z>prev[1]?'KeyS':'KeyW';
  c.keys.clear();c.keys.add(code);
  c.update(.125/3.6,i,false);c.update(.125/3.6,i,false);
  if(document.querySelector('#modal.show'))break;
 }
 c.keys.clear();return {steps:path.length,position:{x:c.avatar.group.position.x,z:c.avatar.group.position.z},near:c.nearShop(),modal:document.querySelector('#modalBody').textContent};
}'''
def saved(page): return page.evaluate("JSON.parse(localStorage.getItem('lemonadeLane_bank_v3'))")
def load(page,state):
 page.evaluate('(s)=>localStorage.setItem("lemonadeLane_bank_v3",JSON.stringify(s))',state);page.reload();page.wait_for_function('window.LemonadeEngine !== undefined')
def capture_world(page):
 page.evaluate('''()=>{const p=window.LemonadeEngine.World.prototype,original=p.updateState;p.updateState=function(...args){window.testWorld=this;return original.apply(this,args)}}''')
 page.locator('[data-loc=square]').click()

def enter_shop(page,shop,activation='keyboard'):
 result=page.evaluate(PATH_TO_SHOP,shop)
 assert result['near']==shop,result
 assert not page.locator('#modal').evaluate('(el)=>el.classList.contains("show")'), 'Walking near a door must not open it'
 if activation=='keyboard':page.locator('#world3d').press('KeyE')
 else:
  page.wait_for_timeout(800)
  point=page.evaluate("""shop=>{const w=testWorld,door=w.shopDoors.find(d=>d.userData.shop===shop);const v=door.position.clone().project(w.camera),r=w.container.getBoundingClientRect();return {x:r.x+(v.x+1)*r.width/2,y:r.y+(1-v.y)*r.height/2}}""",shop)
  page.mouse.click(point['x'],point['y'])
 page.locator('#modal.show').wait_for()
 return result

def house_screen_bounds(page):
 # Conservative house envelopes include the chimney and porch after renderer mesh batching.
 return page.evaluate("""()=>{const w=testWorld;return w.environment.userData.houses.map(h=>{let points=[];for(const x of [-2.75,2.75])for(const y of [0,5])for(const z of [-2.1,2.4])points.push(w.camera.position.clone().set(h.x+x*Math.cos(h.yaw)+z*Math.sin(h.yaw),y,h.z-x*Math.sin(h.yaw)+z*Math.cos(h.yaw)).project(w.camera));return {name:h.id,minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),minY:Math.min(...points.map(p=>p.y)),maxY:Math.max(...points.map(p=>p.y))}})}""")
