// Pixel-drawn reel symbols stay readable without depending on emoji fonts.
export function drawSlotScreen(canvas,reels){
 const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;c.fillStyle='#286ba0';c.fillRect(0,0,w,h);
 function symbol(index,x,y,size){const u=size/8,rect=(a,b,d,e,color)=>{c.fillStyle=color;c.fillRect(x+(a-4)*u,y+(b-4)*u,d*u,e*u)};
  if(index===0){rect(1,4,3,3,'#d82b48');rect(4,3,3,3,'#b8193c');rect(3,1,1,4,'#347b46');rect(4,0,3,1,'#4b9c55');rect(1,4,1,1,'#f48985')}
  else if(index===1){rect(1,2,6,4,'#f4bf22');rect(2,1,4,6,'#ffda3d');rect(4,0,3,1,'#3b8a47')}
  else if(index===2){rect(2,2,4,4,'#e9b334');rect(1,5,6,1,'#ffd661');rect(3,0,2,2,'#d09b29');rect(3,6,2,1,'#a97824')}
  else if(index===3){c.fillStyle='#c12541';c.font='900 '+size+'px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('7',x,y+size*.06)}
  else{rect(3,0,2,8,'#52b4d6');rect(2,1,4,6,'#3e9ec9');rect(1,2,6,4,'#76d0e3');rect(3,1,1,3,'#d6f9ed')}
 }
 for(let i=0;i<3;i++){const x=(i+.5)*w/3;c.fillStyle='#fff4d3';c.fillRect(i*w/3+w*.015,h*.025,w/3-w*.03,h*.95);symbol((reels[i]+1)%5,x,h*.11,h*.24);symbol(reels[i],x,h*.51,h*.52);symbol((reels[i]+4)%5,x,h*.91,h*.24)}
 c.fillStyle='#c13e4b';c.fillRect(0,h*.505,w,h*.014);
}
