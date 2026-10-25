import {box,group} from './models.js';

// Low pedestal displays match the existing cream-topped merchandise tables.
export function storeDeviceDisplay(parent,f){
 const g=group(parent,f.x,0,f.z);g.name='shopster-'+f.kind;
 box(g,0,.36,0,f.width-.2,.12,f.depth-.16,'#828f8d');
 box(g,0,.7,0,f.width-.22,.72,f.depth-.2,'#aeb4b1');
 box(g,0,1.12,0,f.width,.14,f.depth,'#e3ded0');
 if(f.kind==='electronics-laptops')for(const x of [-1.3,-.43,.43,1.3]){
  const laptop=group(g,x,1.21,0);laptop.name='shopster-demo-laptop';
  box(laptop,0,.025,0,.64,.05,.43,'#9eafb3');
  box(laptop,0,.055,-.04,.5,.01,.21,'#465661');for(let row=0;row<3;row++)for(let col=0;col<6;col++)box(laptop,-.2+col*.08,.063,-.11+row*.065,.05,.008,.035,'#aebdc0');
  box(laptop,0,.058,.14,.18,.012,.08,'#697f8c');
  const lid=group(laptop,0,.06,-.19);lid.rotation.x=-.14;
  box(lid,0,.24,0,.64,.45,.045,'#344551');box(lid,0,.24,.03,.55,.35,.012,'#75b6ce');
  box(lid,-.1,.3,.04,.24,.12,.01,'#c1e0de');box(lid,.15,.19,.04,.14,.16,.01,'#568eae');
  box(laptop,0,.0,.17,.08,.02,.04,'#e6d9b6');
 }
 else if(f.kind==='electronics-phones')for(let i=0;i<6;i++){
  const phone=group(g,-1.35+i*.54,1.2,0);phone.name='shopster-demo-smartphone';
  box(phone,0,.04,0,.27,.08,.31,'#b9c4bd');const handset=group(phone,0,.08,0);handset.rotation.x=-.32;
  box(handset,0,.2,0,.22,.4,.035,i%2?'#334855':'#b6b5a7');box(handset,0,.2,.023,.185,.33,.012,'#4c95b0');
  for(let row=0;row<3;row++)for(let col=0;col<3;col++)box(handset,-.055+col*.055,.13+row*.065,.033,.035,.04,.008,['#f0d775','#88c6ac','#be899b'][(row+col)%3]);
  box(handset,0,.365,.024,.055,.012,.01,'#263943');
 }
 else for(let i=0;i<3;i++){
  const console=group(g,-1.2+i*1.2,1.2,0);console.name='shopster-demo-game-console';
  if(i===0){box(console,0,.26,-.08,.22,.5,.3,'#e3e3d7');box(console,0,.26,.08,.075,.46,.025,'#293f4d');box(console,.12,.26,-.08,.025,.44,.32,'#f3ecdb')}
  else if(i===1){box(console,0,.21,-.08,.34,.4,.3,'#354b56');box(console,0,.415,-.08,.27,.012,.24,'#263b43');for(let k=0;k<4;k++)box(console,-.1+k*.065,.425,-.08,.035,.01,.16,'#729480')}
  else{box(console,0,.18,-.05,.58,.32,.055,'#344958');box(console,0,.19,-.01,.39,.22,.02,'#6fa7ba');box(console,-.26,.19,-.01,.09,.27,.06,'#6eaab8');box(console,.26,.19,-.01,.09,.27,.06,'#c66d6b')}
  const controller=group(console,0,.07,.28);box(controller,0,0,0,.4,.1,.18,'#d2d7cf');for(const side of [-1,1]){box(controller,side*.15,-.025,.045,.12,.1,.16,'#d2d7cf');box(controller,side*.09,.06,0,.045,.035,.045,'#3c535e')}box(controller,.12,.06,-.04,.025,.02,.025,'#78a19a');
 }
 // Short security tethers keep the tabletop readable without adding interaction UI.
 for(const x of [-1.3,0,1.3])box(g,x,1.2,-.38,.025,.02,.22,'#d5d9ce');
 return g;
}
