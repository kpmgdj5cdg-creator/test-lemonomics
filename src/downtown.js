import {box,group,label,bench,lamp,tree} from './models.js';
import {planter,chalkboard} from './street-details.js';
import {voxelText} from './voxel-text.js';
import {DOWNTOWN_LOTS} from './downtown-layout.js';
import {buildCasinoParking} from './casino-parking.js';
import {buildCasino} from './casino-model.js';

function window(g,x,y,z,w=1.05,h=1.15){
  box(g,x,y,z,w+.18,h+.18,.13,'#f6e7cb');box(g,x,y,z+.09,w,h,.045,'#21526f');
  box(g,x-w*.22,y+.03,z+.12,.14,h*.82,.025,'#66b8cb');box(g,x,y,z+.14,.055,h,.025,'#ebdfc4');
  box(g,x,y-h/2-.11,z+.09,w+.3,.13,.33,'#e2d4b6');
}
function cityBuilding(parent,x,z,{width=5.4,height=7.6,wall='#ca7865',trim='#f3dfbc',shop='BOOKS',sign='#3b4e72',letters='#f6b8ce',awning='#52869a'}={}){
  const g=group(parent,x,.1,z),depth=4.4,front=depth/2;
  box(g,0,.11,0,width+.28,.22,depth+.25,'#98a9a2');box(g,0,height/2+.2,0,width,height,depth,wall);
  box(g,0,.4,front+.05,width,.42,.12,trim);
  // Recessed shop glazing, a real doorway, lintels, and a striped awning.
  for(const wx of [-width*.31,width*.31]){
    box(g,wx,1.56,front+.08,width*.27,2.16,.15,trim);box(g,wx,1.56,front+.18,width*.23,1.9,.05,'#1e4a65');
    box(g,wx-width*.045,1.67,front+.22,.14,1.65,.025,'#579cae');box(g,wx,1.5,front+.24,width*.23,.055,.025,'#b4d6d1');
    // Small shelves and colorful merchandise behind the windows.
    for(let i=0;i<4;i++)box(g,wx-width*.08+i*width*.05,.89+(i%2)*.12,front+.23,.14,.38+(i%2)*.24,.04,i%2?'#e4bd64':'#db8c9b');
  }
  box(g,0,1.43,front+.1,.93,2.5,.17,trim);box(g,0,1.44,front+.21,.73,2.25,.05,'#28667c');box(g,0,1.66,front+.25,.6,1.44,.02,'#6bb7c2');box(g,.27,1.22,front+.28,.05,.24,.05,'#f2c976');
  box(g,0,3.25,front+.13,width+.05,.7,.24,sign);voxelText(g,shop,0,3.29,front+.32,Math.min(.45,(width-.7)/(shop.length*.8)),letters);
  for(let i=0;i<12;i++){
    const xx=-width/2+(i+.5)*width/12;
    const strip=box(g,xx,2.82,front+.5,width/12,.13,.83,i%2?'#fff0d4':awning);strip.rotation.x=.17;
    box(g,xx,2.63,front+.92,width/12,.22,.08,i%2?'#fff0d4':awning);
  }
  for(let y=4.45;y<height-.5;y+=1.7){
    for(const wx of [-width*.3,0,width*.3])window(g,wx,y,front+.08,.8,1.02);
    box(g,0,y-.77,front+.06,width+.12,.12,.18,trim);
    // Windows on the visible side keep the architecture dimensional.
    for(const wz of [-1.25,.65]){box(g,width/2+.035,y,wz,.1,1.17,1.12,trim);box(g,width/2+.1,y,wz,.04,.98,.91,'#20526d');box(g,width/2+.13,y,wz,.025,.99,.055,'#c8e0cf');}
  }
  // Upper and ground-floor rear windows keep the opposite street's backs inhabited.
  const rear=group(g,0,0,-front-.08);rear.rotation.y=Math.PI;
  for(let y=1.55;y<height-.5;y+=2.5)for(const wx of [-width*.30,0,width*.30])window(rear,wx,y,.04,.75,1.02);
  box(g,0,height+.28,0,width+.4,.23,depth+.45,'#577f88');
  for(const zz of [-depth/2,depth/2])box(g,0,height+.59,zz,width+.35,.45,.2,trim);
  for(const xx of [-width/2,width/2])box(g,xx,height+.59,0,.2,.45,depth,trim);
  box(g,width*.2,height+.72,-.4,1.1,.65,.9,'#a7b9c0');for(let i=0;i<5;i++)box(g,width*.2-.4+i*.2,height+1.06,-.4,.08,.025,.7,'#3c5d6c');
  box(g,-width*.3,height+.95,-.8,.38,1.2,.4,'#687d83');box(g,-width*.3,height+1.58,-.8,.55,.12,.58,'#e7d9bb');
  return g;
}
function transitShelter(parent,x,z){
  const g=group(parent,x,.1,z);
  box(g,0,.08,0,2.8,.16,1.65,'#c7d4cc');
  for(const px of [-1.16,1.16])box(g,px,1.28,-.5,.13,2.5,.13,'#326b79');
  box(g,0,1.4,-.55,2.4,1.65,.09,'#83b9bb');box(g,0,2.61,0,2.9,.17,1.8,'#347c91');box(g,0,2.78,-.65,2.7,.24,.14,'#235c72');
  box(g,0,.72,-.12,2,.14,.5,'#d5ae72');for(const xx of [-.8,.8])box(g,xx,.41,-.12,.13,.58,.35,'#426c69');
  box(g,1.65,1.55,.12,.1,3,.1,'#3b5c66');box(g,1.65,2.76,.15,.65,.73,.12,'#f8dd7e');
  voxelText(g,'BUS',1.65,2.77,.25,.19,'#27516c');
}
function cafeTable(parent,x,z){
  const g=group(parent,x,.1,z);box(g,0,.87,0,.98,.12,.98,'#f4d7a2');box(g,0,.45,0,.13,.8,.13,'#426875');box(g,0,.1,0,.62,.08,.62,'#426875');
  for(const xx of [-.85,.85]){box(g,xx,.5,0,.5,.12,.55,'#2a8799');box(g,xx,.8,-.28,.5,.55,.09,'#2a8799');for(const px of [-.18,.18])for(const pz of [-.18,.18])box(g,xx+px,.25,pz,.06,.48,.06,'#426875');}
  box(g,0,1.05,0,.13,.24,.13,'#f7edda');box(g,0,1.2,0,.09,.07,.09,'#e7a25a');
}
function taxi(parent,x,z){
  const g=group(parent,x,.1,z);
  box(g,0,.52,0,3.1,.65,1.35,'#edb72c');box(g,-.08,1.03,0,1.6,.65,1.15,'#ffce45');box(g,-.08,1.08,.6,1.29,.42,.04,'#2b627e');box(g,.77,1.06,0,.04,.44,1.04,'#68a6b9');
  for(const px of [-1.05,1.05])for(const pz of [-.68,.68]){box(g,px,.32,pz,.48,.48,.17,'#253a42');box(g,px,.32,pz*1.015,.24,.24,.18,'#b9c4ba');}
  for(let i=0;i<8;i++)box(g,-1.15+i*.3,.57,.69,.18,.16,.025,i%2?'#f7ecb8':'#29434c');
  box(g,0,1.45,0,.7,.22,.3,'#fdf0be');voxelText(g,'TAXI',0,1.46,.2,.13,'#2c4857');
  for(const pz of [-.45,.45])box(g,1.57,.61,pz,.04,.2,.26,'#fff1b5');box(g,1.59,.35,0,.06,.12,1.16,'#dce5d3');
}
function signal(parent,x,z,angle=0){
  const g=group(parent,x,.1,z);g.rotation.y=angle;
  box(g,0,1.75,0,.14,3.5,.14,'#354e5b');box(g,.2,3.55,0,.55,.11,.13,'#354e5b');box(g,.4,3.09,0,.35,.95,.3,'#354e5b');
  for(const [i,color] of ['#d97d5e','#ddb74e','#67b68a'].entries())box(g,.4,3.37-i*.28,.18,.18,.18,.06,color);
}
export function buildDowntown(g,rival){
  // Same street anchors, entirely different urban architecture and public space.
  box(g,0,-.23,0,150,.4,150,'#a6b6b3');box(g,0,.005,4,150,.07,4.6,'#304654');box(g,8,.006,-35,4.6,.07,76,'#304654');
  const paving=['#e0e5d9','#d2ded6','#e8eadd','#cbd8d1'];
  // A broad stone plaza backs onto the stand; nothing blocks the customer lane.
  for(let x=-24;x<25;x+=.8)for(let z=-4.8;z<1.3;z+=.8)if(x<5.65||x>10.35)box(g,x,.09,z,.78,.16,.78,paving[(Math.round((x+z)*5)+300)%4]);
  for(let x=-55;x<59;x+=.75)for(const z of [.92,7.08]){for(let row=0;row<2;row++)box(g,x,.1,z+(row-.5)*.72,.73,.17,.7,paving[(Math.round(x*4)+row+400)%4]);box(g,x,.18,z+(z<4?.69:-.69),.74,.18,.16,'#f3efd9');}
  for(let z=-57;z<1;z+=.75)for(const x of [4.95,11.05,-16])box(g,x,.1,z,1.4,.17,.73,paving[(Math.round(-z*4)+400)%4]);
  for(let x=-55;x<59;x+=2.4)if(x<5||x>11)box(g,x,.052,4,1.1,.018,.09,'#f1ce71');
  for(let z=-57;z<0;z+=2.4)box(g,8,.055,z,.09,.018,1.1,'#f1ce71');
  for(let i=0;i<7;i++)box(g,8,.06,2.1+i*.58,3.6,.025,.27,'#eff0dc');
  for(let i=0;i<8;i++)box(g,5.9+i*.6,.06,-.15,.27,.025,2.4,'#eff0dc');
  for(const lot of DOWNTOWN_LOTS){const building=cityBuilding(g,lot.x,lot.z,lot);building.rotation.y=lot.angle||0;}
  const parking=buildCasinoParking(g);g.userData.casinoParking=parking;const casino=buildCasino(g);g.userData.casino=casino;g.userData.buildingCount=DOWNTOWN_LOTS.length+1;
  // Front walks link every added frontage to the continuous sidewalk.
  for(const lot of DOWNTOWN_LOTS){if(Math.abs(Math.sin(lot.angle||0))>.5){const a=lot.x<8?lot.x+2.3:11.7,b=lot.x<8?4.3:lot.x-2.3;box(g,(a+b)/2,.09,lot.z,b-a,.16,1.3,'#dce4d7')}else if(lot.z>4)box(g,lot.x,.09,9.9,1.4,.16,3.9,'#dce4d7');}

  // Street trees, planters and shop furniture keep the miniature city inviting.
  for(const [x,z] of [[-13.8,-2.5],[2.6,-5.8],[17.5,-3.4],[-8,9.6],[12,10]]){
    box(g,x,.16,z,1.75,.25,1.75,'#ece5d0');box(g,x,.31,z,1.4,.08,1.4,'#3b6550');tree(g,x,z,.95,1);
  }
  planter(g,-7.3,-2.35,2.4);planter(g,-2,9.1,1.8);planter(g,12,8.8,3);
  transitShelter(g,1.5,-2.15);cafeTable(g,-11.1,-3.2);cafeTable(g,-1.3,-3.5);
  bench(g,-8.5,9.2,Math.PI);bench(g,1.5,9.2,Math.PI);
  lamp(g,-7,.18);lamp(g,11.75,6.9);lamp(g,4.1,-7);lamp(g,-14.7,6.9);
  signal(g,4.45,1.4,0);signal(g,11.55,6.6,Math.PI);
  // A transit entrance and paving inset read as a city square instead of a lawn.
  const entry=group(g,-14,0,-12.5);box(entry,0,.02,0,2.3,.04,3.5,'#465e67');for(let i=0;i<6;i++)box(entry,0,.16-i*.02,-1.1+i*.4,1.8,.1,.35,'#91a2a3');
  for(const px of [-1.1,1.1]){box(entry,px,.72,0,.09,1.4,3.5,'#527e83');box(entry,px,1.47,0,.13,.1,3.7,'#c1d6c8');}
  box(entry,0,2,-1.6,2.5,.55,.16,'#315e77');voxelText(entry,'METRO',0,2.01,-1.47,.32,'#f6de90');
  taxi(g,-12.8,4.8);
  for(const x of [-6,1]){box(g,x,.07,2.1,.65,.06,.32,'#233e4a');for(let i=0;i<4;i++)box(g,x-.24+i*.16,.11,2.1,.04,.02,.25,'#809b9c');}
  for(const x of [-6.3,12.3]){box(g,x,.56,-.28,.48,1.05,.46,'#2d6171');box(g,x,1.12,-.28,.57,.1,.55,'#254d60');}
  box(g,3.85,.35,.78,.24,.6,.24,'#dc7052');box(g,3.85,.65,.78,.34,.12,.31,'#ed9b68');
  chalkboard(g,-5.4,-.02);
  box(g,rival.x,.075,rival.z,3.8,.12,3.3,'#c2cec4');
  const plot=label(g,'MARKET PITCH',rival.x,.15,rival.z,2.5,.45,{background:'#c2cec4',color:'#59716b',size:70});plot.rotation.x=-Math.PI/2;
  return plot;
}
