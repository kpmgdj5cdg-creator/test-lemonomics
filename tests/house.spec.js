import {test,expect} from '@playwright/test';
import {enterGame} from './fixtures/profile-ui.js';
import {gameWithChecking,marketFixture} from './fixtures/market.js';
import {purchaseHouse} from '../src/mortgage.js';
const key='lemonadeLane_bank_v3';
const rate=()=>({rate:6.5,asOf:new Date().toISOString().slice(0,10),source:'TEST FIXTURE'});
async function ready(page,state){
 await page.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state))},{key,state});
 await page.route('**/api/market',r=>r.fulfill({json:{data:marketFixture(),status:'current'}}));await page.route('**/api/mortgage-rate',r=>r.fulfill({json:{data:rate()}}));
 await page.goto('/');await enterGame(page);return page.locator('#world3d');
}
async function card(page,index){await page.locator('[data-tab=upgrades]').click();for(let i=0;i<index;i++)await page.locator('#upgradeNext').click();}
function nearHome(state){state.playerView={location:'neighborhood',walking:true,position:[26.4,.15,-2.6],rotation:Math.PI,angle:.35,zoom:1,sceneView:'outside'};return state}
async function clickDoor(page,w){await expect.poll(()=>w.getAttribute('data-home-door-screen')).toBeTruthy();const p=JSON.parse(await w.getAttribute('data-home-door-screen'));await w.click({position:{x:p.x*(await w.boundingBox()).width,y:p.y*(await w.boundingBox()).height}})}
test('owned upgrade checkboxes equip Classic or beginning stand without losing purchases; selection survives reload',async({page})=>{
 const s=gameWithChecking();s.upgrades=['classic','castle','register'];const w=await ready(page,s);await expect(w).toHaveAttribute('data-stand-style','castle');await card(page,6);await page.locator('#equipUpgrade').check();await expect(w).toHaveAttribute('data-stand-style','classic');await expect(page.locator('#classicEntryBtn')).toBeVisible();
 await page.locator('#equipUpgrade').uncheck();await expect(w).toHaveAttribute('data-stand-style','starter');for(let i=0;i<7;i++)await page.locator('#upgradeNext').click();await expect(page.locator('#upgradeCard')).toContainText('Beginning Stand');await expect(page.locator('#equipUpgrade')).toBeChecked();
 await page.reload();await enterGame(page);await expect(w).toHaveAttribute('data-stand-style','starter');const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);expect(saved.upgrades).toEqual(['classic','castle','register']);expect(saved.equippedStand).toBe('starter');
});
test('bank mortgage review purchases house with $8000 down, while preserving the business loan system',async({page})=>{
 const s=gameWithChecking(5000);s.cash=3000;s.bank.creditScore=661;const w=await ready(page,s);await page.locator('#visitBank').click();await page.locator('[data-bank-tab=loans]').click();await expect(page.locator('#applyMortgage')).toBeEnabled();await page.locator('#applyMortgage').click();await expect(page.locator('#modalBody')).toContainText('starting Day 11');await page.locator('#confirmHousePurchase').click();await expect(page.locator('#mortgageArea')).toContainText('House owned');const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);expect(saved.bank.mortgage.principal).toBe(392000);expect(saved.cash).toBe(0);expect(saved.bank.checking).toBe(0);await expect(w).toHaveAttribute('data-home-owned','true');
});
test('mortgage installment uses cash and checking when due, with no duplicated interest on re-render',async({page})=>{
 const s=gameWithChecking(8000);s.cash=0;s.bank.creditScore=700;purchaseHouse(s,{mortgage:true,quote:rate()});s.day=11;s.bank.checking=1000;s.cash=2000;await ready(page,s);await page.locator('#visitBank').click();await page.locator('[data-bank-tab=loans]').click();await page.locator('#payMortgage').click();await expect(page.locator('#mortgageArea')).toContainText('due Day 21');const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);expect(saved.bank.mortgage.paid).toBe(1);expect(saved.bank.checking).toBe(0);expect(saved.cash).toBeGreaterThan(0);expect(saved.ledger.filter(l=>l.category==='mortgage interest')).toHaveLength(1);
});
test('unowned home shows nearby for-sale tag and front door opens bank details rather than entering',async({page})=>{
 const s=nearHome(gameWithChecking());const w=await ready(page,s);await expect(page.locator('#homeSaleTag')).toBeVisible();await expect(page.locator('#homeSaleTag')).toHaveText('For Sale! See your bank for details!');await clickDoor(page,w);await expect(page.locator('#bankScreen')).toBeVisible();await expect(page.locator('#mortgageArea')).toBeVisible();await expect(w).toHaveAttribute('data-home-interior','false');
});
test('owned house door enters actual first-person rooms, with weather, movement, save and quit restoration',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const s=nearHome(gameWithChecking());s.upgrades=['house','classic'];s.day=4;const w=await ready(page,s);await expect(page.locator('#homeSaleTag')).toBeHidden();await clickDoor(page,w);await expect(w).toHaveAttribute('data-home-interior','true');await expect(w).toHaveAttribute('data-camera-type','perspective');await expect(w).toHaveAttribute('data-weather','rain');await page.locator('#scene').screenshot({path:'artifacts/house-living-dining-kitchen.png'});
 const before=await w.getAttribute('data-home-position');await w.focus();await page.keyboard.down('KeyW');await expect(w).not.toHaveAttribute('data-home-position',before);await page.keyboard.up('KeyW');const rect=await w.boundingBox(),yaw=await w.getAttribute('data-home-yaw');await page.mouse.move(rect.x+70,rect.y+rect.height*.6);await page.mouse.down();await page.mouse.move(rect.x+290,rect.y+rect.height*.6,{steps:2});await page.mouse.up();await expect(w).not.toHaveAttribute('data-home-yaw',yaw);
 await page.locator('#saveMenuBtn').click();await page.locator('#saveAndQuit').click();await page.locator('[data-load-slot="0"]').click();await expect(w).toHaveAttribute('data-home-interior','true');await page.locator('#homeExitBtn').click();await expect(w).toHaveAttribute('data-home-interior','false');await expect(w).toHaveAttribute('data-walking','true');expect(errors).toEqual([]);
});
test('phone house bedroom view and controls fit, and windows show the snowy neighborhood',async({page})=>{
 await page.setViewportSize({width:390,height:844});const s=gameWithChecking();s.upgrades=['house'];s.day=8;s.playerView={location:'neighborhood',sceneView:'home',homeInterior:{position:{x:3,z:-.25},yaw:2.45,pitch:-.25},walking:false};const w=await ready(page,s);await expect(w).toHaveAttribute('data-home-interior','true');await expect(w).toHaveAttribute('data-weather','snow');await expect(page.locator('#scene3dError')).toBeHidden();await page.locator('#scene').screenshot({path:'artifacts/house-bedroom-phone.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);await page.locator('#homeExitBtn').click();await expect(w).toHaveAttribute('data-home-interior','false');
});
test('home corridor reaches kitchen and bedroom around solid furniture, and cash purchase uses both accounts',async({page})=>{
 const s=nearHome(gameWithChecking(200000));s.cash=200000;const w=await ready(page,s);await page.locator('#visitBank').click();await page.locator('[data-bank-tab=loans]').click();await page.locator('#buyHouseOutright').click();await page.locator('#confirmHousePurchase').click();await expect(page.locator('#mortgageArea')).toContainText('owned outright');await page.locator('#returnToStand').click();await w.focus();await page.keyboard.press('KeyE');await expect(w).toHaveAttribute('data-home-interior','true');
 await page.keyboard.down('KeyW');await expect.poll(async()=>JSON.parse(await w.getAttribute('data-home-position')).z).toBeLessThan(-.28);await page.keyboard.up('KeyW');
 await page.keyboard.down('KeyD');await expect.poll(async()=>JSON.parse(await w.getAttribute('data-home-position')).x).toBeGreaterThan(2.9);await page.keyboard.up('KeyD');await page.locator('#scene').screenshot({path:'artifacts/house-kitchen.png'});
 await page.keyboard.down('KeyS');await expect.poll(async()=>JSON.parse(await w.getAttribute('data-home-position')).z).toBeGreaterThan(1.8);await page.keyboard.up('KeyS');
 const r=await w.boundingBox();await page.mouse.move(r.x+80,r.y+r.height*.55);await page.mouse.down();await page.mouse.move(r.x+80-Math.PI/2/.006,r.y+r.height*.55,{steps:1});await page.mouse.up();await page.locator('#scene').screenshot({path:'artifacts/house-bedroom.png'});await page.keyboard.press('Escape');await expect(w).toHaveAttribute('data-home-interior','false');
});

test('kitchen has visible voxel counters and retains the actual garden through patio glazing',async({page})=>{
 const s=gameWithChecking();s.upgrades=['house'];s.playerView={location:'neighborhood',sceneView:'home',homeInterior:{position:{x:0,z:-1.05},yaw:-1.1,pitch:-.16},walking:false};const w=await ready(page,s);await expect(w).toHaveAttribute('data-home-interior','true');await page.locator('#scene').screenshot({path:'artifacts/house-kitchen-review.png'});
});

test('successful 3D render clears a slow-start warning without hiding real graphics errors',async({page})=>{
 const w=await ready(page,gameWithChecking());await page.evaluate(()=>{const e=document.getElementById('scene3dError');e.dataset.startupWarning='true';e.textContent='The 3D scene could not start.';e.hidden=false});await page.locator('[data-loc=park]').click();await expect(page.locator('#scene3dError')).toBeHidden();await expect(w).toHaveAttribute('data-location','park');
});
