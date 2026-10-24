// Northwest downtown parcel: old Hotel/Records frontage becomes the store lot.
export const DEPARTMENT_STORE={name:'Shopster',x:-52,z:-39,width:30,depth:21,height:5.8};
export const STORE_BUILDING_BOUNDS={minX:-67,maxX:-37,minZ:-49.5,maxZ:-28.5};
export const STORE_PARKING_BOUNDS={minX:-68,maxX:-36.4,minZ:-26.4,maxZ:.15};
export const STORE_ENTRY={x:-52,z:-27.9};
export const STORE_VIEW={x:-52,z:-26};
export const STORE_SPACES=Array.from({length:4},(_,row)=>Array.from({length:10},(_,column)=>({x:-66.15+column*2.92,z:-3.2-row*6.25,row,column,accessible:row===3&&(column===3||column===6)}))).flat().filter(s=>![4,5].includes(s.column));
// The central pedestrian route stays clear; aisle islands break up the rows.
export const STORE_PARKED_SPACES=STORE_SPACES.filter(s=>!s.accessible&&((s.row*3+s.column)%3===0||s.row===3&&s.column===2));
export const RELOCATED_HOTEL={x:-63,z:14,angle:Math.PI};
export const RELOCATED_RECORDS={x:-55.3,z:14,angle:Math.PI};
