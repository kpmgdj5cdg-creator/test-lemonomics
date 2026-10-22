import {box,group} from './models.js';
export function createSpeaker(parent,width){
 const root=group(parent,width/2+.26,.35,.84);root.name='high-five-outdoor-speaker';
 box(root,0,.52,0,.43,1.04,.38,'#283f42');box(root,0,.54,.2,.35,.88,.045,'#182d32');
 const cone=group(root,0,.38,.235);cone.name='speaker-cone';
 box(cone,0,0,0,.28,.3,.04,'#60797a');box(cone,0,0,.03,.18,.2,.045,'#172b31');
 box(root,0,.82,.24,.11,.11,.045,'#6f8987');const led=box(root,.13,.11,.24,.035,.035,.025,'#efc744');
 return {group:root,cone,led,update(beat){cone.scale.set(1+beat*.07,1+beat*.07,1+beat*.45);root.rotation.z=beat*.014}};
}
