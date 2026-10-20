// Arrival routes follow the modeled walkways. Decisions at the end of these
// routes still belong to the business simulation; walking never generates sales.
const neighborhoodRoutes=[
  [[-23,.92],[-1,.92]],
  [[23,.92],[11.05,.92],[8,.92],[4.9,.92],[-1,.92]],
  [[4.95,-22],[4.95,.92],[-1,.92]],
  [[-20,7.08],[8,7.08],[8,.92],[-1,.92]],
  [[22,7.08],[8,7.08],[8,.92],[-1,.92]],
  [[11.05,-20],[11.05,.92],[8,.92],[-1,.92]],
];
const parkRoutes=[
  [[-23,1.05],[-1,1.05]],
  [[23,1.05],[-1,1.05]],
  [[6.8,-22],[6.8,1.05],[-1,1.05]],
  [[-17,-18],[-17,1.05],[-1,1.05]],
  [[6.8,18],[6.8,1.05],[-1,1.05]],
  [[-17,17],[-17,1.05],[-1,1.05]],
];
const downtownRoutes=[
  [[-23,.92],[-1,.92]],
  [[23,.92],[11.05,.92],[8,.92],[4.95,.92],[-1,.92]],
  [[4.95,-22],[4.95,.92],[-1,.92]],
  [[22,7.08],[8,7.08],[8,.92],[-1,.92]],
  [[-16,-22],[-16,.92],[-1,.92]],
  [[11.05,-22],[11.05,-3.4],[16,-3.4],[16,.92],[11.05,.92],[8,.92],[-1,.92]],
];
const waterfrontRoutes=[
  [[-23,1.05],[-1,1.05]],
  [[23,1.05],[-1,1.05]],
  [[17,-22],[17,1.05],[-1,1.05]],
  [[-17,-22],[-17,1.05],[-1,1.05]],
  [[7.4,21],[7.4,1.05],[-1,1.05]],
  [[3.8,-22],[3.8,1.05],[-1,1.05]],
];
export function routeLength(path){let d=0;for(let i=1;i<path.length;i++)d+=Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]);return d}
export function walkElevation(location,x,z){
  if(location==='waterfront')return (z>=-.05&&z<=2.15)||(x>=6.1&&x<=8.7&&z>=1.05&&z<=23.6)?.16:-.01;
  if(location==='park')return .11;
  return (z>1.7&&z<6.3)||(x>5.7&&x<10.3&&z<1.7)?.05:.16;
}
export function pointOnRoute(path,distance){
  for(let i=1;i<path.length;i++){
    const [x,z]=path[i-1],[nx,nz]=path[i],length=Math.hypot(nx-x,nz-z);
    if(distance<=length){const t=Math.max(0,distance)/length;return {x:x+(nx-x)*t,z:z+(nz-z)*t,angle:Math.atan2(nx-x,nz-z)}}
    distance-=length;
  }
  const [x,z]=path.at(-1);return {x,z,angle:Math.PI};
}
export function planArrivals(count,location,tickSeconds=.165){
  const routes=location==='waterfront'?waterfrontRoutes:location==='downtown'?downtownRoutes:location==='park'?parkRoutes:neighborhoodRoutes,speed=6;
  const lead=Math.max(...routes.map(route=>routeLength(route)/speed))+.35;
  return {lead,visitors:Array.from({length:count},(_,i)=>{
    const path=routes[i%routes.length].map(p=>[...p]),length=routeLength(path),arrive=lead+(i+1)*tickSeconds;
    return {person:{wait:0},path,length,speed,spawnAt:arrive-length/speed,arriveAt:arrive,route:i%routes.length};
  })};
}
