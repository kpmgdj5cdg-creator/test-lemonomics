import test from 'node:test';
import assert from 'node:assert/strict';
import {planArrivals,pointOnRoute,walkElevation} from '../src/traffic.js';
for(const location of ['neighborhood','park','downtown','waterfront']){
  test(`${location}: six distant origins and no arrivals before the approach completes`,()=>{
    const plan=planArrivals(53,location);
    assert.equal(new Set(plan.visitors.map(v=>v.path[0].join(','))).size,6);
    plan.visitors.forEach((v,i)=>{
      assert.ok(Math.hypot(v.path[0][0]+3,v.path[0][1]+.8)>15);
      assert.ok(v.spawnAt>=0);
      assert.ok(Math.abs(v.spawnAt+v.length/v.speed-v.arriveAt)<1e-9);
      assert.ok(Math.abs(v.arriveAt-(plan.lead+(i+1)*.165))<1e-9);
      assert.equal(v.person.wait,0);
      const end=pointOnRoute(v.path,v.length+.1);assert.equal(end.x,v.path.at(-1)[0]);assert.equal(end.z,v.path.at(-1)[1]);
    });
  });
}
test('walking uses path segments, including crossings, rather than cutting corners',()=>{
  const path=[[0,0],[0,10],[10,10]];
  assert.deepEqual(pointOnRoute(path,5),{x:0,z:5,angle:0});
  assert.deepEqual(pointOnRoute(path,15),{x:5,z:10,angle:Math.PI/2});
});
test('feet follow the park paving, raised sidewalks, and lower road crossings',()=>{
  assert.equal(walkElevation('park',0,1.05),.11);
  assert.equal(walkElevation('neighborhood',-3,.92),.16);
  assert.equal(walkElevation('neighborhood',8,.92),.05);
  assert.equal(walkElevation('neighborhood',8,4),.05);
  assert.equal(walkElevation('neighborhood',11.05,-5),.16);
  assert.equal(walkElevation('downtown',-16,-12),.16);
  assert.equal(walkElevation('downtown',8,.92),.05);
  assert.equal(walkElevation('waterfront',-3,1.05),.16);
  assert.equal(walkElevation('waterfront',7.4,18),.16);
  assert.equal(walkElevation('waterfront',17,-12),-.01);
});
test('waterfront visitors stay on the pier when over water, and clear huts and stands',()=>{
  const obstacles=[
    {x0:-11.65,x1:-8.35,z0:-7.93,z1:-3.5}, // Lifeguard tower and access steps
    {x0:-5.03,x1:-1.97,z0:-11.55,z1:-8.25}, // Blue beach hut
    {x0:-1.43,x1:1.63,z0:-11.55,z1:-8.25}, // Coral beach hut
    {x0:9.5,x1:14.1,z0:-2.75,z1:.725}, // Reserved rival platform
  ];
  for(const {path,length} of planArrivals(6,'waterfront').visitors)for(let distance=0;distance<=length;distance+=.1){
    const {x,z}=pointOnRoute(path,distance);
    if(z>4)assert.ok(x>=6.4&&x<=8.4&&z<=23.6,'Over-water arrival must stay within the pier rails');
    for(const o of obstacles)assert.ok(!(x>o.x0-.3&&x<o.x1+.3&&z>o.z0-.2&&z<o.z1+.2),`Waterfront route intersects obstacle at ${x}, ${z}`);
  }
});
test('downtown arrivals clear the shop walls and rival pitch, including character width',()=>{
  const obstacles=[
    {x0:-12.8,x1:-7.2,z0:-9,z1:-4.6}, // Bookshop
    {x0:-6.2,x1:-.4,z0:-9.5,z1:-5.1}, // Bakery
    {x0:12,x1:16.8,z0:-9.4,z1:-5}, // Studio
    {x0:11.55,x1:15.05,z0:-2.05,z1:.65}, // Rival stand
  ];
  for(const {path,length} of planArrivals(6,'downtown').visitors)for(let distance=0;distance<=length;distance+=.1){
    const {x,z}=pointOnRoute(path,distance);
    for(const o of obstacles)assert.ok(!(x>o.x0-.3&&x<o.x1+.3&&z>o.z0-.2&&z<o.z1+.2),`Route intersects obstacle at ${x}, ${z}`);
  }
});
