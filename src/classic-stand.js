import {box,group} from './models.js';
import {voxelText} from './voxel-text.js';

export const CLASSIC_ROOF_COLORS=['#f5ca35','#fff0c5'];
const cream='#f5e6c9',yellow='#f5ca35',trim='#fff0d9';
// Fits the existing stand plot and front approach in all four environments.
// Upper walls, doors and sign belong to the removable cutaway shell.
export function buildClassicStand(g,roof,w,d,{shade=false,register=false}={}){
  const body=group(g);body.name='classic-kiosk-base';
  box(body,0,.12,0,w+.35,.24,d+.35,'#b2aca0');
  box(body,0,.29,0,w+.12,.1,d+.08,'#dfd3b9');
  for(const x of [-w/2+.08,w/2-.08]){
    box(body,x,.8,0,.16,.95,d,cream);
    box(body,x,.54,0,.18,.43,d,yellow);
    box(roof,x,2.1,0,.16,1.65,d,cream);
  }
  box(body,0,.8,-d/2+.06,w,.95,.15,cream);
  box(body,0,.54,-d/2+.045,w,.43,.18,yellow);
  box(roof,0,2.1,-d/2+.06,w,1.65,.15,cream);
  // Yellow service wall to the right of the glazed entrance.
  box(body,.95,.86,1.28,2.02,1.08,.16,yellow);
  box(body,.95,1.47,1.3,2.22,.14,.42,'#d8d0b9');
  box(body,.95,1.56,1.3,2.26,.045,.45,'#fff2d7');
  const facade=group(roof);facade.name='classic-glazed-entrance';
  for(const x of [-1.91,-1.05,-.19])box(facade,x,1.57,1.31,.11,2.48,.16,trim);
  for(const y of [.38,2.78])box(facade,-1.05,y,1.31,1.83,.12,.16,trim);
  for(const x of [-1.49,-.61]){
    box(facade,x,1.59,1.32,.74,2.24,.065,'#829eae');
    box(facade,x-.23,1.78,1.361,.08,1.78,.012,'#a5b9bf');
    box(facade,x,2.24,1.361,.73,.06,.012,'#93acb9');
  }
  for(const x of [-1.19,-.91])box(facade,x,1.35,1.42,.16,.18,.12,yellow);
  // The window is an actual opening, with a clear sightline to the operator.
  box(roof,-.09,2.12,1.28,.13,1.09,.18,trim);
  box(roof,1.98,2.12,1.28,.13,1.09,.18,trim);
  box(roof,.95,2.78,1.28,2.2,.21,.18,cream);
  if(!register){
    // Basic manual cash box; the purchased EZserve model replaces it.
    box(body,1.5,1.68,1.08,.4,.18,.31,'#45463e');box(body,1.53,1.87,1.02,.3,.21,.16,'#383b34');
  }
  const awning=group(roof);awning.name='classic-striped-window-awning';
  for(let i=0;i<8;i++){
    const x=-.15+(i+.5)*2.22/8,color=i%2?trim:yellow;
    const panel=box(awning,x,2.81,shade?1.93:1.68,2.22/8+.004,.12,shade?1.32:.82,color);panel.rotation.x=.13;
    box(awning,x,2.67,shade?2.56:2.06,2.22/8,.18,.08,color);
  }
  box(roof,0,3.01,0,w+.34,.22,d+.28,cream);
  box(roof,0,3.18,-.07,w+.43,.19,d+.37,yellow);
  for(const x of [-w/2-.14,w/2+.14])box(roof,x,3.32,-.07,.13,.24,d+.37,yellow);
  box(roof,0,3.32,-d/2-.18,w+.43,.24,.13,yellow);
  const sign=group(roof);sign.name='classic-cooler-cup-sign';
  box(sign,0,3.51,1.43,w+.5,.87,.25,yellow);
  box(sign,0,3.51,1.568,w+.21,.64,.035,'#fff1c9');
  voxelText(sign,'COOLER CUP',-.35,3.51,1.625,.36,'#bd8e23');
  const lemon=group(sign,1.75,3.51,1.68);lemon.name='classic-voxel-lemon';
  box(lemon,0,0,0,.4,.52,.14,'#ffda37');box(lemon,0,.29,0,.23,.13,.13,'#ffda37');box(lemon,0,-.29,0,.23,.13,.13,'#ffda37');
  for(const x of [-.23,.23])box(lemon,x,0,0,.1,.32,.12,'#ffda37');
  box(lemon,.02,.41,-.025,.09,.16,.09,'#6e8133');box(lemon,.15,.44,-.025,.22,.14,.1,'#367c39');
  box(lemon,-.06,.11,.08,.06,.23,.012,'#ffe872');
}
