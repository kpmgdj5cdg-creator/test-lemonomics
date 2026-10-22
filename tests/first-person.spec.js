import {test,expect} from '@playwright/test';
import {enterGame} from './fixtures/profile-ui.js';
import {gameWithChecking,marketFixture} from './fixtures/market.js';
const key='lemonadeLane_bank_v3';
async function ready(page,upgrades=['classic'],day=1,extra={}){
 const state=gameWithChecking(0);state.upgrades=upgrades;state.day=day;Object.assign(state,extra);
 await page.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state))},{key,state});
 await page.route('**/api/market',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({data:marketFixture(),status:'current'})}));
 await page.goto('/');await enterGame(page);return page.locator('#world3d');
}
async function clickTarget(page,world,name){
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await expect.poll(()=>world.getAttribute(name)).toBeTruthy();const p=JSON.parse(await world.getAttribute(name)),b=await world.boundingBox();
 await world.click({position:{x:p.x*b.width,y:p.y*b.height}});
}
test('click doors to enter, walk and drag in first person, save and reload inside, then exit',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const world=await ready(page);
 await page.locator('[data-scene-view=exterior]').click();await clickTarget(page,world,'data-door-screen');
 await expect(world).toHaveAttribute('data-first-person','true',{timeout:60000});await expect(world).toHaveAttribute('data-camera-type','perspective');await expect(world).toHaveAttribute('data-door-open','true');
 await page.locator('#scene').screenshot({path:'artifacts/classic-first-person-back.png'});
 const before=await world.getAttribute('data-room-position');await world.focus();await page.keyboard.down('KeyD');await expect(world).not.toHaveAttribute('data-room-position',before);await page.keyboard.up('KeyD');
 const yaw=await world.getAttribute('data-room-yaw'),box=await world.boundingBox();await page.mouse.move(box.x+80,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+300,box.y+box.height/2,{steps:8});await page.mouse.up();await expect(world).not.toHaveAttribute('data-room-yaw',yaw);
 await page.locator('#classicDoorBtn').click();await expect(world).toHaveAttribute('data-door-open','false');
 await page.locator('#saveMenuBtn').click();await page.locator('#saveOnly').click();await expect(world).toBeFocused();await expect(world).toHaveAttribute('data-first-person','true');
 const position=await world.getAttribute('data-room-position');await page.locator('#saveMenuBtn').click();await page.locator('#saveAndQuit').click();await page.locator('[data-load-slot="0"]').click();await expect(world).toHaveAttribute('data-first-person','true');await expect(world).toHaveAttribute('data-room-position',position);await expect(world).toHaveAttribute('data-door-open','false');
 await page.locator('#classicExitBtn').click();await expect(world).toHaveAttribute('data-first-person','false');await expect(world).toHaveAttribute('data-walking','true');expect(errors).toEqual([]);
});
test('speaker mesh toggles original music and vibration, and mute stops it',async({page})=>{
 const world=await ready(page,['classic','music']);await page.locator('[data-scene-view=exterior]').click();
 await clickTarget(page,world,'data-speaker-screen');await expect(world).toHaveAttribute('data-music-playing','true');await expect(world).toHaveAttribute('data-audio-state','running');await expect.poll(async()=>Number(await world.getAttribute('data-audio-notes'))).toBeGreaterThan(2);await expect.poll(async()=>Number(await world.getAttribute('data-audio-level'))).toBeGreaterThan(.001);
 // Respect reduced motion, then verify actual beat movement when it is allowed.
 await expect(world).toHaveAttribute('data-speaker-pulse','1');await page.emulateMedia({reducedMotion:'no-preference'});await expect.poll(async()=>Number(await world.getAttribute('data-speaker-pulse'))).toBeGreaterThan(1.02);await page.emulateMedia({reducedMotion:'reduce'});await clickTarget(page,world,'data-speaker-screen');await expect(world).toHaveAttribute('data-music-playing','false');
 await page.locator('#speakerToggleBtn').click();await expect(world).toHaveAttribute('data-music-playing','true');await page.locator('#gameSoundBtn').click();await expect(world).toHaveAttribute('data-music-playing','false');
});

test('interior front window shows the real rainy street with owned rear equipment',async({page})=>{
 const upgrades=['classic','juicer','powerjuicer','icedispenser','dispenser','icemaker','fridge','register','music'];
 const world=await ready(page,upgrades,4);await page.locator('#classicEntryBtn').click();await expect(world).toHaveAttribute('data-first-person','true',{timeout:60000});await expect(world).toHaveAttribute('data-weather','rain');
 await page.locator('#scene').screenshot({path:'artifacts/classic-first-person-equipment.png'});
 await world.focus();await page.keyboard.down('KeyW');await expect.poll(async()=>JSON.parse(await world.getAttribute('data-room-position')).z).toBeLessThan(-.4);await page.keyboard.up('KeyW');
 const rect=await world.boundingBox();await page.mouse.move(rect.x+70,rect.y+rect.height*.55);await page.mouse.down();await page.mouse.move(rect.x+70+Math.PI/.006,rect.y+rect.height*.55,{steps:24});await page.mouse.up();
 await expect.poll(async()=>Math.abs(Number(await world.getAttribute('data-room-yaw')))).toBeGreaterThan(3);
 await page.locator('#classicDoorBtn').click();await expect(world).toHaveAttribute('data-door-open','false');await page.locator('#scene').screenshot({path:'artifacts/classic-first-person-rain-window.png'});
 await page.locator('#saveMenuBtn').click();await page.locator('#saveOnly').click();await expect(world).toHaveAttribute('data-first-person','true');
});
test('first-person entry is exclusive to Classic, and available across the four locations',async({page})=>{
 const world=await ready(page);for(const [loc,name] of [['park','park'],['square','downtown'],['beach','waterfront']]){
  await page.locator(`[data-loc=${loc}]`).click();await page.locator('#classicEntryBtn').click();await expect(world).toHaveAttribute('data-first-person','true',{timeout:60000});await expect(world).toHaveAttribute('data-location',name);await page.locator('#classicExitBtn').click();await page.getByRole('button',{name:'Overview',exact:true}).click();
 }
});
test('starter stand has no first-person entry or unpurchased speaker',async({page})=>{
 const world=await ready(page,[]);await expect(page.locator('#classicEntryBtn')).toBeHidden();await expect(page.locator('#speakerToggleBtn')).toBeHidden();await expect(world).toHaveAttribute('data-first-person','false');
});

test('after Start Day the same live customers arrive and leave the ordering window',async({page})=>{
 await page.addInitScript(()=>Math.random=()=>.1);
 const world=await ready(page,['classic'],1,{cash:100,inventory:{lemons:24,sugar:30,ice:100,cups:100},lemonLots:[{day:1,qty:24}],price:1,pitchers:2});
 await page.locator('#startBtn').click();await page.locator('#classicEntryBtn').click();await expect(world).toHaveAttribute('data-first-person','true',{timeout:60000});
 const rect=await world.boundingBox();await page.mouse.move(rect.x+70,rect.y+rect.height*.55);await page.mouse.down();await page.mouse.move(rect.x+70+Math.PI/.006,rect.y+rect.height*.55,{steps:1});await page.mouse.up();
 await expect.poll(async()=>Number(await world.getAttribute('data-queue')),{timeout:25000}).toBeGreaterThan(0);
 await page.locator('#scene').screenshot({path:'artifacts/classic-first-person-customers.png'});
 await expect.poll(async()=>Number(await world.getAttribute('data-sales')),{timeout:60000}).toBeGreaterThan(0);await expect(world).toHaveAttribute('data-camera-type','perspective');
 await expect(page.locator('#scoreSold')).not.toHaveText('0');
});
test('phone touch movement, door controls and exit fit the Classic interior',async({page})=>{
 await page.setViewportSize({width:390,height:844});const world=await ready(page);await page.locator('#classicEntryBtn').click();await expect(world).toHaveAttribute('data-first-person','true',{timeout:60000});
 const before=await world.getAttribute('data-room-position');const button=page.locator('[data-room-move=KeyA]');await button.dispatchEvent('pointerdown',{pointerId:1,pointerType:'touch'});await expect(world).not.toHaveAttribute('data-room-position',before);await button.dispatchEvent('pointerup',{pointerId:1,pointerType:'touch'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);await page.locator('#scene').screenshot({path:'artifacts/classic-first-person-phone.png'});await page.locator('#classicExitBtn').click();await expect(world).toHaveAttribute('data-first-person','false');
});
