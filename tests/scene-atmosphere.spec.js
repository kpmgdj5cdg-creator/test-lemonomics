import {test,expect} from '@playwright/test';
import {enterGame} from './fixtures/profile-ui.js';
import {gameWithChecking,marketFixture} from './fixtures/market.js';

async function ready(page,{location='neighborhood',day=1}={}){
 const state=gameWithChecking(0);Object.assign(state,{location,day,upgrades:['classic','music']});
 await page.addInitScript(state=>{if(!localStorage.getItem('lemonadeLane_bank_v3'))localStorage.setItem('lemonadeLane_bank_v3',JSON.stringify(state))},state);
 await page.route('**/api/market',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({data:marketFixture(),status:'current'})}));
 await page.goto('/');await enterGame(page);return page.locator('#world3d');
}
test('night checkbox follows weather, all locations, first person and reload without advancing the day',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const world=await ready(page,{day:4});
 const day=await page.locator('#dayPill').textContent();
 await expect(world).toHaveAttribute('data-weather','rain');await expect(world).toHaveAttribute('data-time-of-day','day');
 await page.getByRole('checkbox',{name:'Night mode'}).check();await expect(world).toHaveAttribute('data-time-of-day','night');await expect(world).toHaveAttribute('data-sun-intensity','0.32');
 await page.locator('#classicEntryBtn').click();await expect(world).toHaveAttribute('data-first-person','true');await expect(world).toHaveAttribute('data-weather','rain');await page.locator('#scene').screenshot({path:'artifacts/night-classic-interior.png'});
 await page.locator('#classicExitBtn').click();await page.getByRole('button',{name:'Overview',exact:true}).click();
 for(const [location,name] of [['park','park'],['square','downtown'],['beach','waterfront']]){await page.locator(`[data-loc=${location}]`).click();await expect(world).toHaveAttribute('data-location',name);await expect(world).toHaveAttribute('data-time-of-day','night');await expect(world).toHaveAttribute('data-weather','rain')}
 await page.locator('#scene').screenshot({path:'artifacts/night-waterfront.png'});
 await expect(page.locator('#dayPill')).toHaveText(day);
 await page.reload();await enterGame(page);await expect(page.getByRole('checkbox',{name:'Night mode'})).toBeChecked();await expect(world).toHaveAttribute('data-time-of-day','night');
 await page.getByRole('checkbox',{name:'Night mode'}).uncheck();await expect(world).toHaveAttribute('data-time-of-day','day');await expect(world).toHaveAttribute('data-sun-intensity','1.45');expect(errors).toEqual([]);
});
test('beach waves animate and boat bobs without horizontal drift, with a reduced-motion option',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});const world=await ready(page,{location:'beach'});await expect(world).toHaveAttribute('data-location','waterfront');
 const initial=JSON.parse(await world.getAttribute('data-boat-pose')),wave=await world.getAttribute('data-wave-height');
 await expect.poll(()=>world.getAttribute('data-wave-height')).not.toBe(wave);
 await expect.poll(async()=>Math.abs(JSON.parse(await world.getAttribute('data-boat-pose')).y-initial.y)).toBeGreaterThan(.01);
 const now=JSON.parse(await world.getAttribute('data-boat-pose'));expect(now.x).toBe(initial.x);expect(now.z).toBe(initial.z);
 await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(async()=>JSON.parse(await world.getAttribute('data-boat-pose')).y).toBeCloseTo(-.13+Math.sin(12.8*1.15-6.5*.14)*.095+Math.sin(-6.5*.65+12.8*.48)*.045,5);
 const frozen=await world.getAttribute('data-boat-pose');await page.locator('#scene').screenshot({path:'artifacts/day-waterfront-waves.png'});expect(await world.getAttribute('data-boat-pose')).toBe(frozen);
});
test('night toggle remains accessible on a phone without covering navigation',async({page})=>{
 await page.setViewportSize({width:390,height:844});const world=await ready(page);
 const toggle=page.getByRole('checkbox',{name:'Night mode'});await toggle.check();await expect(world).toHaveAttribute('data-time-of-day','night');
 await page.locator('#classicEntryBtn').click();await expect(world).toHaveAttribute('data-first-person','true');await toggle.uncheck();await expect(world).toHaveAttribute('data-time-of-day','day');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);await page.locator('#scene').screenshot({path:'artifacts/night-toggle-phone.png'});
});
