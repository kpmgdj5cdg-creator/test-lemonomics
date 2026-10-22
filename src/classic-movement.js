import {blocked} from './player-movement.js';
export const ROOM={minX:-1.86,maxX:1.86,minZ:-1.2,maxZ:1.75};
export const ROOM_FLOOR=.35,ROOM_EYE=1.9;
export const DOOR_X=-1.05;
export function roomObstacles(fridge=false,doorsOpen=false){
 return [
  {minX:-2,maxX:fridge?1.12:2,minZ:-1.4,maxZ:-.75},
  {minX:-.16,maxX:2.1,minZ:1.02,maxZ:1.6},
  ...(fridge?[{minX:1.2,maxX:1.95,minZ:-1.35,maxZ:-.44}]:[]),
  ...(doorsOpen?[]:[{minX:-1.95,maxX:-.15,minZ:1.22,maxZ:1.7}]),
 ];
}
export function moveInRoom(position,input,yaw,dt,fridge=false,doorsOpen=false){
 const length=Math.hypot(input.x,input.z);if(!length)return {...position};
 const distance=1.75*Math.min(dt,.05),right=input.x/length,forward=input.z/length;
 const dx=(right*Math.cos(yaw)+forward*Math.sin(yaw))*distance,dz=(-right*Math.sin(yaw)+forward*Math.cos(yaw))*distance;
 const obstacles=roomObstacles(fridge,doorsOpen),radius=.16,p={...position};
 for(const axis of ['x','z']){const next={...p,[axis]:p[axis]+(axis==='x'?dx:dz)};if(!blocked(next.x,next.z,obstacles,ROOM,radius))p[axis]=next[axis]}
 return p;
}
export const validRoomPosition=(p,fridge,doorsOpen)=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&!blocked(p.x,p.z,roomObstacles(fridge,doorsOpen),ROOM,.16);
