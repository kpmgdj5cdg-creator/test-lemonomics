import {box,group,fence,tree,bush,bench} from './models.js';
import {buildPlayerHome,HOME_LOT} from './home-model.js';

// Doors face local +Z. Keep each home and its landscaping inside one spacious lot.
// Local backyards run from the back wall (-2) to the rear fence (-10.8).
const palette=[
  ['#dcb760','#23677a','#f3ead5'],['#71a7a0','#455b64','#fff1d4'],
  ['#df9279','#4a7180','#f8e5c9'],['#d9dfcd','#ad7056','#f3edda'],
  ['#8fadd0','#435c73','#f2dec0'],['#b1c299','#696b6a','#f8eddb'],
  ['#c9a5ba','#566879','#f6e7d0'],['#e0ceab','#476e71','#fff2d7'],
];
export const HOME_ROOF_COLORS=palette.map(([,roof])=>roof);
export const HOME_TREE_COLORS=['#73b451','#367b42','#519c48'];
export const RESIDENTIAL_LOTS=[
  // The former far-left house now shares Maple Market's front-door line (z=-3.7).
  ...[-40,-30,-20].map((x,i)=>({x,z:-5.8,angle:0,style:i,walkEnd:5.95})),
  {x:-2.1,z:-7.5,angle:0,style:2,walkEnd:3.45,standNeighbor:true},
  ...[16.4,26.4,36.4,46.4].map((x,i)=>({x,z:-5.8,angle:0,style:i+3,walkEnd:5.95})),
  ...[-40,-30,-20,-10,0,14,24,34,44].map((x,i)=>({x,z:14.6,angle:Math.PI,style:i+1,walkEnd:6.7})),
  // Both sides of the side street have their own drive-up frontages and deep yards.
  ...[-27,-39,-51].flatMap((z,i)=>[
    {x:.4,z,angle:Math.PI/2,style:i+4,walkEnd:3.85},
    {x:15.6,z,angle:-Math.PI/2,style:i+6,walkEnd:3.85},
  ]),
];

function window(g,x,y,z,w,h){
  box(g,x,y,z,w+.18,h+.18,.13,'#f7efdd');
  box(g,x,y,z+.09,w,h,.045,'#286078');
  box(g,x-w*.25,y+.03,z+.12,.13,h*.86,.025,'#7dbac5');
  box(g,x,y,z+.13,.055,h,.03,'#f5ead6');
  box(g,x,y-h/2-.14,z+.03,w+.32,.12,.32,'#d9c9aa');
}

function modernHome(parent,style){
  const [wall,roof,trim]=palette[style%palette.length],width=5.2+(style%3)*.2;
  const home=group(parent,0,.12,0);home.userData.kind='house';
  box(home,0,.1,0,width+.35,.2,4.35,'#adb7a4');
  box(home,0,1.65,0,width,3,4,wall);
  box(home,0,.37,2.035,width,.22,.12,trim);
  box(home,0,3.08,2.035,width,.16,.12,trim);
  // Three contemporary silhouettes share the original crisp voxel construction.
  if(style%3===0){
    for(let i=0;i<8;i++)box(home,0,3.24+i*.15,0,width+.65,.18,4.5-i*.52,roof);
    box(home,width*.31,3.85,-.7,.4,1.15,.48,'#ad9982');
    box(home,width*.31,4.47,-.7,.53,.13,.6,trim);
  }else if(style%3===1){
    box(home,0,3.26,0,width+.55,.23,4.5,roof);
    for(const z of [-2.13,2.13])box(home,0,3.48,z,width+.55,.24,.15,trim);
    for(const x of [-(width+.4)/2,(width+.4)/2])box(home,x,3.48,0,.15,.24,4.25,trim);
    for(let i=0;i<3;i++){
      box(home,.15+i*.62,3.49,-.25,.53,.08,1.4,'#284f68');
      box(home,.15+i*.62,3.54,-.25,.025,.02,1.4,'#8ea9ad');
    }
  }else{
    for(let i=0;i<9;i++)box(home,0,3.24+i*.07,-2+i*.5,width+.6,.18,.53,roof);
  }
  // The door leaf is at +2.1, exactly like the market's leaf.
  box(home,0,1.3,2.04,1.12,2.36,.14,trim);
  box(home,0,1.28,2.1,.86,2.16,.05,'#59786e');
  box(home,0,1.65,2.14,.57,.85,.025,'#8dbbbd');
  box(home,.29,1.16,2.15,.06,.15,.04,'#e6bf6b');
  window(home,-width*.31,1.75,2.07,1.18,1.26);
  window(home,width*.31,1.75,2.07,1.18,1.26);
  for(const side of [-1,1]){
    box(home,side*(width/2+.035),1.8,-.2,.1,1.42,1.75,trim);
    box(home,side*(width/2+.1),1.8,-.2,.04,1.22,1.55,'#578fa0');
    box(home,side*(width/2+.13),1.8,-.2,.03,1.23,.06,trim);
  }
  const rear=group(home);rear.rotation.y=Math.PI;window(rear,-1.45,1.75,2.07,1.15,1.15);
  box(home,0,1.2,-2.055,.95,2.1,.12,trim);
  box(home,0,1.2,-2.13,.75,1.9,.04,'#5d8c91');
  box(home,0,.08,2.55,1.8,.18,.8,'#ddcfb4');
  box(home,0,2.62,2.37,1.9,.14,1.1,roof);
  for(const x of [-.69,.69])box(home,x,1.35,2.65,.11,2.4,.11,trim);
  for(const x of [-width*.31,width*.31]){
    box(home,x,.38,2.56,1.2,.36,.42,'#b48f6e');
    for(let i=0;i<4;i++){
      box(home,x-.43+i*.28,.63,2.56,.16,.2,.22,'#538247');
      box(home,x-.43+i*.28,.77,2.56,.14,.12,.14,style%2?'#f3ce73':'#ed9eaa');
    }
  }
  return home;
}

function path(parent,from,to,width=.95){
  const length=Math.hypot(to.x-from.x,to.z-from.z),count=Math.ceil(length/.6);
  for(let i=0;i<count;i++){
    const t=(i+.5)/count;
    box(parent,from.x+(to.x-from.x)*t,.09,from.z+(to.z-from.z)*t,
      from.x===to.x?width:length/count-.025,.16,
      from.x===to.x?length/count-.025:width,i%2?'#dce4d5':'#e8e9dc');
  }
}

// A voxel sphere keeps the round silhouette while matching the block-built homes.
function roundTree(parent){
  const g=group(parent,-2.35,0,-7.7);g.userData.kind='round-yard-tree';
  box(g,0,1.1,0,.34,2.2,.34,'#997350');
  const step=.38,radius=1.3;
  for(let x=-3;x<=3;x++)for(let y=-3;y<=3;y++)for(let z=-3;z<=3;z++){
    if(Math.hypot(x*step,y*step,z*step)>radius)continue;
    // Only the shell needs geometry; buried cubes would add no visible detail.
    if(Math.hypot(x*step,y*step,z*step)<radius-step*1.25)continue;
    box(g,x*step,2.7+y*step,z*step,step,step,step,HOME_TREE_COLORS[y>1?0:x<0?1:2]);
  }
}
function circularPatio(parent){
  const g=group(parent,1.35,0,-4.35);g.userData.kind='circular-patio';
  // The patio and furniture sit beside the back door, clear of the rear tree.
  for(let x=-4;x<=4;x++)for(let z=-4;z<=4;z++)if(Math.hypot(x,z)<4.5)
    box(g,x*.31,.04,z*.31,.3,.09,.3,'#d5cfb8');
  box(g,0,.48,0,.16,.86,.16,'#536956');
  for(let x=-3;x<=3;x++)for(let z=-3;z<=3;z++)if(Math.hypot(x,z)<3.2)
    box(g,x*.22,.96,z*.22,.225,.13,.225,'#dbc49b');
  for(const x of [-1.05,1.05]){
    box(g,x,.55,0,.44,.12,.5,'#b88c5c');
    for(const z of [-.16,.16])box(g,x,.27,z,.09,.5,.09,'#536956');
    box(g,x+Math.sign(x)*.2,.88,0,.09,.58,.5,'#b88c5c');
  }
}

export function buildNeighborhoodHomes(parent){
  const homes=[];
  for(const [index,lot] of RESIDENTIAL_LOTS.entries()){
    const plot=group(parent,lot.x,0,lot.z);plot.rotation.y=lot.angle;
    plot.userData.kind='residential-lot';plot.userData.lot=lot;
    // Rear plots are over twice the depth of the old small fenced yards.
    box(plot,0,-.015,-6.3,8.2,.025,8.9,lot.style%2?'#74b866':'#6db15f');
    fence(plot,-4.2,-10.8,8.4);
    fence(plot,-4.2,-10.8,9.1,'z');fence(plot,4.2,-10.8,9.1,'z');
    const home=lot.x===HOME_LOT.x&&lot.z===HOME_LOT.z?buildPlayerHome(plot):modernHome(plot,lot.style);homes.push(home);
    const yard=index%4;plot.userData.yardStyle=['seating','round-tree','tree-and-table','garden'][yard];
    if(yard===0){
      const yardTree=group(plot,-2.5,-.1225,-7.7);tree(yardTree,0,0,.78,lot.style%2);yardTree.userData.kind='yard-tree';
      box(plot,1.2,.035,-4.65,2.6,.1,2.6,'#d5cfb8');
      const seat=group(plot,1.2,-.04,-5.05);bench(seat,0,0);seat.userData.kind='garden-seat';
      box(plot,1.2,.48,-3.72,.8,.83,.65,'#b18c62');
      box(plot,1.2,.93,-3.72,.93,.12,.78,'#dbc49b');
    }else if(yard===1||yard===2){
      roundTree(plot);if(yard===2)circularPatio(plot);
    }else{
      const garden=group(plot,1.7,0,-8.5);garden.userData.kind='flower-garden';
      for(const x of [-.75,.75]){
        box(garden,x,.14,0,1.1,.28,2,'#b48f6e');box(garden,x,.3,0,.95,.06,1.85,'#76563d');
        for(let i=0;i<4;i++){box(garden,x,.49,-.65+i*.43,.1,.32,.1,'#538247');box(garden,x,.68,-.65+i*.43,.25,.16,.25,i%2?'#efb2b9':'#f3ce73')}
      }
    }
    bush(plot,3.35,home.userData.purchasable?3.4:1.05,.65);
    // Front paths finish at the street sidewalk; the stand's house uses a clear side exit.
    if(lot.standNeighbor){
      path(plot,{x:0,z:3.05},{x:0,z:3.45});
      path(parent,{x:lot.x,z:-4.05},{x:3.9,z:-4.05});
      path(parent,{x:3.9,z:-4.05},{x:3.9,z:.15});
    }else path(plot,{x:0,z:3.05},{x:0,z:lot.walkEnd});
    const mailboxZ=lot.standNeighbor?3.2:lot.walkEnd-.5;
    box(plot,3.25,.65,mailboxZ,.12,1.3,.12,'#887658');
    box(plot,3.25,1.33,mailboxZ,.48,.34,.38,lot.style%2?'#486d75':'#d4ad61');
    box(plot,3.52,1.38,mailboxZ+.06,.035,.26,.04,'#d67c63');
  }
  return homes;
}
