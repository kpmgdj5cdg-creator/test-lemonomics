import {test,expect} from '@playwright/test';
import {enterGame} from './fixtures/profile-ui.js';
import {gameWithChecking,marketFixture} from './fixtures/market.js';
const key='lemonadeLane_bank_v3';
test('purchasing Classic installs the reference kiosk in all four environments and survives reload',async({page})=>{
 test.setTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const state=gameWithChecking(0);state.cash=2000;
 await page.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state))},{key,state});
 await page.route('**/api/market',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({data:marketFixture(),status:'current'})}));
 await page.goto('/');await enterGame(page);const world=page.locator('#world3d');await expect(world).toHaveAttribute('data-stand-style','starter');
 await page.locator('[data-tab=upgrades]').click();for(let i=0;i<6;i++)await page.locator('#upgradeNext').click();await expect(page.locator('#upgradeCard')).toContainText('Classic Stand');await page.locator('#buyUpgrade').click();await expect(world).toHaveAttribute('data-stand-style','classic');
 const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);expect(saved.upgrades).toContain('classic');expect(saved.cash).toBeCloseTo(1550.01,2);
 await page.locator('[data-tab=location]').click();await page.locator('[data-scene-view=exterior]').click();await page.locator('#scene').screenshot({path:'artifacts/classic-kiosk-exterior.png'});
 for(const [loc,name] of [['neighborhood','neighborhood'],['park','park'],['square','downtown'],['beach','waterfront']]){
  await page.locator('[data-scene-view=outside]').click();await page.locator(`[data-loc=${loc}]`).click();await expect(world).toHaveAttribute('data-location',name);await expect(world).toHaveAttribute('data-stand-style','classic');
  await page.locator('[data-scene-view=inside]').click();await expect(world).toHaveAttribute('data-view','interior');await expect(world).toHaveAttribute('data-avatar-state','at-stand');
  if(name==='neighborhood'){await expect(world).toHaveAttribute('data-avatar-position',JSON.stringify({x:-2.05,z:-.38}));await page.locator('#scene').screenshot({path:'artifacts/classic-kiosk-interior.png'});}
  await page.locator('[data-scene-view=outside]').click();await page.getByRole('button',{name:'Walk around',exact:true}).click();await expect(world).toHaveAttribute('data-walking','true');await page.getByRole('button',{name:'Overview',exact:true}).click();
 }
 await page.reload();await enterGame(page);await expect(world).toHaveAttribute('data-stand-style','classic');await expect(world).toHaveAttribute('data-location','waterfront');expect(errors).toEqual([]);
});

test('saved Classic equipment, snow and interior cutaway retain their upgraded appearance',async({page})=>{
 const state=gameWithChecking(0);state.day=8;state.upgrades=['classic','juicer','powerjuicer','register','fridge','shade','dispenser','icedispenser','icemaker','music','lights'];state.location='park';
 await page.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state))},{key,state});
 await page.route('**/api/market',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({data:marketFixture(),status:'current'})}));
 await page.goto('/');await enterGame(page);await expect(page.locator('#world3d')).toHaveAttribute('data-stand-style','classic');await expect(page.locator('#world3d')).toHaveAttribute('data-weather','snow');
 await page.locator('[data-scene-view=exterior]').click();await page.locator('#scene').screenshot({path:'artifacts/classic-kiosk-snow-upgraded.png'});
 await page.locator('[data-scene-view=inside]').click();await expect(page.locator('#world3d')).toHaveAttribute('data-view','interior');
 const equipped=(await page.locator('#world3d').getAttribute('data-upgrades')).split(',');for(const id of ['register','fridge','dispenser','icemaker','music','lights'])expect(equipped).toContain(id);
 await page.locator('#scene').screenshot({path:'artifacts/classic-kiosk-equipment.png'});
});
