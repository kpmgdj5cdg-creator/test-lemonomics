import {test,expect} from '@playwright/test';
import {enterGame} from './fixtures/profile-ui.js';
import {gameWithChecking} from './fixtures/market.js';

test('lever drag animates once, walking pauses during play, Escape returns, and saved results survive leaving mid-spin',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});
 const state=gameWithChecking(100);Object.assign(state,{cash:100,location:'square',playerView:{location:'downtown',walking:false,sceneView:'casino',casinoInterior:{position:{x:-3.6,z:2.9},yaw:Math.PI/2,pitch:-.08}}});
 await page.addInitScript(s=>localStorage.setItem('lemonadeLane_bank_v3',JSON.stringify(s)),state);await page.goto('/');await enterGame(page);
 const world=page.locator('#world3d');await expect(world).toHaveAttribute('data-casino-interior','true');
 const target=JSON.parse(await world.getAttribute('data-casino-targets')).find(t=>t.kind==='slots'&&t.stake===.25&&t.x>.05&&t.x<.95&&t.y>.05&&t.y<.95),b=await world.boundingBox();await world.click({position:{x:target.x*b.width,y:target.y*b.height}});
 const mode=page.locator('.casino-game');await expect(mode).toBeVisible();await expect(page.locator('#modal')).not.toHaveClass(/show/);
 const before=await world.getAttribute('data-casino-position');await mode.focus();await page.keyboard.press('w');expect(await world.getAttribute('data-casino-position')).toBe(before);
 const lever=await page.locator('.slot-lever').boundingBox();await page.mouse.move(lever.x+14,lever.y+20);await page.mouse.down();await page.mouse.move(lever.x+14,lever.y+80,{steps:8});await page.mouse.up();
 await expect(mode.locator('.slot-cabinet')).toHaveClass(/is-spinning/);await expect(mode.locator('.reel-strip').first()).toHaveCSS('animation-name','reel-travel');
 await expect(page.locator('.casino-result')).toContainText('Net');await mode.screenshot({path:'artifacts/slot-cabinet-desktop.png'});
 const read=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('lemonadeLane_bank_v3')));
 const once=await read();expect(once.ledger.filter(l=>l.category==='casino')).toHaveLength(1);
 await mode.focus();await page.keyboard.press('Space');await expect(mode.locator('.slot-cabinet')).toHaveClass(/is-spinning/);await page.keyboard.press('Escape');await expect(mode).toBeHidden();
 const twice=await read();expect(twice.ledger.filter(l=>l.category==='casino')).toHaveLength(2);expect(twice.casino.sequence).toBe(once.casino.sequence+1);
 await page.locator('#saveMenuBtn').click();await page.locator('#saveOnly').click();await expect(page.locator('#modal')).not.toHaveClass(/show/);expect((await read()).cash).toBe(twice.cash);
});
