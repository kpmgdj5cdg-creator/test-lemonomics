import {RELOCATED_HOTEL,RELOCATED_RECORDS} from './department-store-layout.js';
// Each front points toward the closest road: main road z=4; side road x=8,z<0.
export const DOWNTOWN_LOTS=[
 {x:-10,z:-6.8,width:5.6,height:6.2,wall:'#d78170',shop:'BOOKS',sign:'#72435f',letters:'#ffe5b1',awning:'#c27391'},
 {x:-3.3,z:-7.3,width:5.8,height:7.6,wall:'#3e9f9e',shop:'BAKERY'},
 {x:14.4,z:-7.2,width:4.8,height:7.2,wall:'#4d83b2',shop:'STUDIO',angle:-Math.PI/2},
 {x:-20,z:-7.5,width:5.3,height:8.5,wall:'#d2b573',shop:'CAFE'},
 {x:-22,z:14,angle:Math.PI,width:7.8,height:10.5,wall:'#8c9fa1',shop:'CITY HALL'},
 {x:1.4,z:-16,width:5.8,height:9.4,wall:'#cc9f82',shop:'MAPLE',angle:Math.PI/2},
 ...[-46,-39,24,33,42,51].map((x,i)=>({x,z:-6.8,...(i===0?RELOCATED_HOTEL:i===1?RELOCATED_RECORDS:{}),width:5.8,height:6+(i%3)*1.8,wall:['#9e839b','#b8a475','#6e9baa'][i%3],shop:['HOTEL','RECORDS','OFFICES','DINER','FLORIST','ARCADE'][i]})),
 ...[-46,-37,-31,-13,-4,16,25,34,43,52].map((x,i)=>({x,z:14,width:5.2,height:5.5+(i%4)*1.4,angle:Math.PI,wall:['#b67b70','#7e9e8b','#a28bb4','#c4a470'][i%4],shop:['COFFEE','BOOKS','LOFTS','RECORDS','GALLERY','HOTEL','BAKERY','DINER','STUDIO','FLORIST'][i]})),
 ...[-25,-34,-43,-52].flatMap((z,i)=>[{x:.4,z,width:5.8,height:7+i%3,angle:Math.PI/2,wall:['#a78388','#7c9ca8'][i%2],shop:['OFFICES','CAFE','HOTEL','BOOKS'][i]},{x:16,z,width:5.8,height:6.5+i%3,angle:-Math.PI/2,wall:['#9eae80','#b294b0'][i%2],shop:['LOFTS','DINER','STUDIO','OFFICES'][i]}]),
 {x:16,z:-16,width:5.8,height:8,angle:-Math.PI/2,wall:'#b9a56f',shop:'ARCADE'},
];
export function lotBounds(l){const side=Math.abs(Math.sin(l.angle||0))>.5,w=side?4.95:l.width+ .5,d=side?l.width+.5:4.95;return {minX:l.x-w/2,maxX:l.x+w/2,minZ:l.z-d/2,maxZ:l.z+d/2};}
