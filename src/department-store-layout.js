export const STORE_EMPLOYEE_SCALE=1.66,STORE_EMPLOYEE_FRONT=-28,STORE_EMPLOYEE_EXTENSION=3.5*(STORE_EMPLOYEE_SCALE-1);
export const employeeRoomZ=z=>STORE_EMPLOYEE_FRONT+(z-STORE_EMPLOYEE_FRONT)*STORE_EMPLOYEE_SCALE;
// Northwest downtown parcel: old Hotel/Records frontage becomes the store lot.
export const DEPARTMENT_STORE={name:'Shopster',x:-66,z:-39,width:30,depth:42+STORE_EMPLOYEE_EXTENSION,height:5.8};
export const STORE_BUILDING_BOUNDS={minX:-81,maxX:-51,minZ:-70.5-STORE_EMPLOYEE_EXTENSION,maxZ:-28.5};
export const STORE_PARKING_BOUNDS={minX:-82,maxX:-50.4,minZ:-26.4,maxZ:.15};
export const STORE_ENTRY={x:-66,z:-27.9};
export const STORE_VIEW={x:-66,z:-41.5-STORE_EMPLOYEE_EXTENSION/2};
export const STORE_FRONT_SPACES=Array.from({length:4},(_,row)=>Array.from({length:10},(_,column)=>({x:DEPARTMENT_STORE.x-14.15+column*2.92,z:-3.2-row*6.25,row,column,accessible:row===3&&(column===3||column===6)}))).flat().filter(s=>![4,5].includes(s.column));
export const STORE_REAR_BOUNDS={minX:-88,maxX:-44,minZ:-82-STORE_EMPLOYEE_EXTENSION,maxZ:-71-STORE_EMPLOYEE_EXTENSION};
export const STORE_SIDE_LANES=[-1,1].map(side=>({x:DEPARTMENT_STORE.x+side*19.5,minZ:-78-STORE_EMPLOYEE_EXTENSION,maxZ:.15,width:5}));
export const STORE_REAR_SPACES=Array.from({length:8},(_,column)=>({x:DEPARTMENT_STORE.x-11.2+column*3.2,z:-79.6-STORE_EMPLOYEE_EXTENSION,row:4,column,accessible:false,rear:true}));
export const STORE_SPACES=[...STORE_FRONT_SPACES,...STORE_REAR_SPACES];
// The central pedestrian route stays clear; aisle islands break up the rows.
export const STORE_PARKED_SPACES=STORE_SPACES.filter(s=>!s.accessible&&((s.row*3+s.column)%3===0||s.row===3&&s.column===2));
export const RELOCATED_HOTEL={x:-63,z:14,angle:Math.PI};
export const RELOCATED_RECORDS={x:-55.3,z:14,angle:Math.PI};

// Keep the original interior origin and street entrance fixed as the building grows rearward.
export const STORE_FRONT_Z=10.5,STORE_BACK_Z=STORE_FRONT_Z-DEPARTMENT_STORE.depth,STORE_BODY_Z=(STORE_FRONT_Z+STORE_BACK_Z)/2;
