import {HOME_BOUNDS,HOME_SOLIDS} from './home-model.js';
import {blocked} from './player-movement.js';
export const validHomePosition=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&!blocked(p.x,p.z,HOME_SOLIDS,HOME_BOUNDS,.16);
export function moveInHome(position,input,yaw,dt){
 const length=Math.hypot(input.x,input.z);if(!length)return {...position};const d=2*Math.min(dt,.05),x=input.x/length,z=input.z/length,p={...position};
 for(const [axis,delta]of [['x',(x*Math.cos(yaw)+z*Math.sin(yaw))*d],['z',(-x*Math.sin(yaw)+z*Math.cos(yaw))*d]]){const q={...p,[axis]:p[axis]+delta};if(validHomePosition(q))p[axis]=q[axis]}
 return p;
}
