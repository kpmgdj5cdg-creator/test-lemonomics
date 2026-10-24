import {test,expect} from '@playwright/test';
import {enterGame} from './fixtures/profile-ui.js';
import {gameWithChecking} from './fixtures/market.js';
async function start(page,position,yaw=0,layoutVersion=4){const s=gameWithChecking(100);Object.assign(s,{location:'square',cash:125,upgrades:['classic'],playerView:{location:'downtown',sceneView:'store',walking:false,storeInterior:{layoutVersion,position,yaw,pitch:.02}}});await page.addInitScript(s=>localStorage.setItem('lemonadeLane_bank_v3',JSON.stringify(s)),s);await page.goto('/');await enterGame(page);return page.locator('#world3d')}
test('tall double-sided shelves and endcaps render from the wall passage and preserved parallel aisle',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const w=await start(page,{x:18.56,z:-1.95},Math.PI/2);await expect(w).toHaveAttribute('data-store-interior','true');await page.locator('#scene').screenshot({path:'artifacts/shopster-shelves-wall-endcaps.png'});
 await w.focus();await page.keyboard.down('KeyD');await expect.poll(async()=>JSON.parse(await w.getAttribute('data-store-position')).z,{timeout:30000}).toBeLessThan(-4);await page.keyboard.up('KeyD');await page.getByRole('checkbox',{name:'Night mode'}).check();await page.locator('#scene').screenshot({path:'artifacts/shopster-shelves-wall-night.png'});expect(errors).toEqual([]);
});
test('legacy store save migrates to the larger floor without changing balances',async({page})=>{
 const w=await start(page,{x:14,z:-3},0,3);await expect(w).toHaveAttribute('data-store-interior','true');const p=JSON.parse(await w.getAttribute('data-store-position'));expect(p.x).toBeCloseTo(18.2);expect(p.z).toBeCloseTo(-3.9);await page.locator('#saveMenuBtn').click();await page.locator('#saveOnly').click();const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('lemonadeLane_bank_v3')));expect(s.playerView.storeInterior.layoutVersion).toBe(4);expect(s.cash).toBe(125);expect(s.bank.checking).toBe(100);
});
test('parallel aisle shelf height and ceiling remain readable on a phone',async({page})=>{
 await page.setViewportSize({width:390,height:844});const w=await start(page,{x:-6.76,z:-6},0);await expect(w).toHaveAttribute('data-store-interior','true');await page.locator('#scene').screenshot({path:'artifacts/shopster-shelves-parallel-phone.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);const before=await w.getAttribute('data-store-position'),forward=page.getByRole('button',{name:'Move forward',exact:true});await forward.dispatchEvent('pointerdown',{pointerId:1});await expect(w).not.toHaveAttribute('data-store-position',before);await forward.dispatchEvent('pointerup',{pointerId:1});
});
