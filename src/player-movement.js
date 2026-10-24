// World-space movement is independent of Three.js and avatar appearance.
export const NEIGHBORHOOD_BOUNDS={minX:-49,maxX:55,minZ:-58,maxZ:29};
// Geometry capture handles props; these semantic barriers keep players out of water
// and the decorative subway stairwell, even where the surface is below knee height.
export const WALKING_AREAS={
  neighborhood:{bounds:NEIGHBORHOOD_BOUNDS,barriers:[]},
  park:{bounds:{minX:-20,maxX:20,minZ:-17,maxZ:15},barriers:[{minX:-9,maxX:-1,minZ:-10.5,maxZ:-4.5}]},
  downtown:{bounds:{minX:-92,maxX:58,minZ:-89,maxZ:28},barriers:[{minX:-15.2,maxX:-12.8,minZ:-14.3,maxZ:-10.7},{minX:-33.47,maxX:-25.53,minZ:-17.83,maxZ:-11.24}]},
  waterfront:{bounds:{minX:-24,maxX:24,minZ:-20,maxZ:23.6},barriers:[
    {minX:-100,maxX:6.1,minZ:4,maxZ:100},
    {minX:8.7,maxX:100,minZ:4,maxZ:100},
  ]},
};
export const PLAYER_RADIUS=.25;
export function blocked(x,z,obstacles,bounds=NEIGHBORHOOD_BOUNDS,radius=PLAYER_RADIUS){
  if(x<bounds.minX+radius||x>bounds.maxX-radius||z<bounds.minZ+radius||z>bounds.maxZ-radius)return true;
  return obstacles.some(b=>{
    const dx=x-Math.max(b.minX,Math.min(x,b.maxX)),dz=z-Math.max(b.minZ,Math.min(z,b.maxZ));
    return dx*dx+dz*dz<radius*radius;
  });
}
export function movePlayer(position,input,angle,dt,obstacles,bounds){
  const length=Math.hypot(input.x,input.z);if(!length)return {...position};
  // Screen-relative controls follow the orbit angle; diagonal travel has the same speed.
  const distance=3.6*Math.min(dt,.05),x=input.x/length,z=input.z/length;
  const dx=(x*Math.cos(angle)+z*Math.sin(angle))*distance,dz=(-x*Math.sin(angle)+z*Math.cos(angle))*distance;
  let next={...position};
  // Small substeps prevent tunneling through a narrow fence during a slow frame.
  const steps=Math.max(1,Math.ceil(distance/.05));
  for(let i=0;i<steps;i++){
    if(!blocked(next.x+dx/steps,next.z,obstacles,bounds))next.x+=dx/steps;
    if(!blocked(next.x,next.z+dz/steps,obstacles,bounds))next.z+=dz/steps;
  }
  return next;
}
export function nearStand(position){return Math.hypot(position.x+3,position.z-.9)<2.7}

export function groundElevation(surfaces,x,z){
  let height=-.03;
  for(const s of surfaces||[])if(x>=s.minX&&x<=s.maxX&&z>=s.minZ&&z<=s.maxZ)height=Math.max(height,s.height);
  // The voxel rig's sole lies .025 units above its root.
  return height-.025;
}
