import {test,expect} from '@playwright/test';
import {marketFixture,gameWithChecking} from './fixtures/market.js';
import {enterGame} from './fixtures/profile-ui.js';
import {quotePrice} from '../src/market-data.js';
const profilesKey='lemonomics_profiles_v1';
const records=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).slots,profilesKey);
async function feed(page){const m=marketFixture();await page.route('**/api/market',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({data:m,status:'current'})}));return m;}
async function create(page,slot,name,avatar='male'){
 await page.locator(`[data-new-slot="${slot}"]`).click();await page.locator('#profileName').fill(name);await page.locator('#profileName').press('Enter');await page.locator(`[data-avatar=${avatar}]`).click();await expect(page.locator('#modalBody')).toContainText('You need money to purchase supplies! Head to the bank and apply for a loan!');await page.locator('#welcomeBack').click();
}
async function quit(page){await page.locator('#saveMenuBtn').click();await page.locator('#saveAndQuit').click();await expect(page.locator('#profileScreen')).toBeVisible();}

test('title screen creates five independent profiles, filters names and restores the chosen business',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await feed(page);await page.goto('/');
 await expect(page.getByRole('heading',{name:'Lemonomics',exact:true})).toBeVisible();await expect(page.locator('[data-new-slot]')).toHaveCount(5);await expect(page.locator('#ll-app')).toBeHidden();
 await page.locator('[data-new-slot="0"]').click();await page.locator('#profileName').fill('Al3 ice!');await expect(page.locator('#profileName')).toHaveValue('Alice');
 await page.locator('#profileName').fill('AbcdefghijklmnopQ');await expect(page.locator('#profileName')).toHaveValue('Abcdefghijklmnop');await page.locator('#profileName').fill('Alice');await page.locator('[data-submit-name]').click();await page.locator('[data-avatar=female]').click();await page.locator('#welcomeBank').click();
 await expect(page.locator('#world3d')).toHaveAttribute('data-avatar-type','female');await expect(page.locator('[data-bank-pane=loans]')).toBeVisible();await page.locator('[data-loan-apply="100"]').click();await expect(page.locator('#bankChecking')).toHaveText('$100.00');await quit(page);
 await expect(page.locator('[data-load-slot="0"]')).toContainText('Alice');await expect(page.locator('[data-load-slot="0"]')).toContainText('Day 1');await expect(page.locator('[data-load-slot="0"]')).toContainText(/\d{2}-\d{2}-\d{4}, \d{2}:\d{2} [AP]M/);await expect(page.locator('[data-profile-slot="0"] .profile-portrait')).toBeVisible();
 await create(page,1,'Ben');await expect(page.locator('#cashHead')).toHaveText('$0.00');await page.locator('#visitBank').click();await expect(page.locator('#bankChecking')).toHaveText('$0.00');await quit(page);
 await create(page,2,'Calvin','female');await quit(page);await create(page,3,'Drew');await quit(page);await create(page,4,'Eve','female');await quit(page);await expect(page.locator('[data-new-slot]')).toHaveCount(0);await page.reload();await expect(page.locator('#profileScreen')).toBeVisible();await expect(page.locator('[data-load-slot]')).toHaveCount(5);
 await page.locator('[data-load-slot="0"]').click();await page.locator('#visitBank').click();await expect(page.locator('#bankChecking')).toHaveText('$100.00');const saved=await records(page);expect(saved[0].state.bank.loans).toHaveLength(1);expect(saved[1].state.bank.loans).toHaveLength(0);expect(saved[2].state.bank.loans).toHaveLength(0);expect(errors).toEqual([]);
});

test('Save and Back to Game keep playing, while female avatar movement and position survive quit in all locations',async({page})=>{
 test.setTimeout(120000);
 await feed(page);await page.goto('/');await create(page,0,'Mia','female');
 await page.locator('#saveMenuBtn').click();const before=(await records(page))[0].savedAt;await page.locator('#backToGame').click();await expect(page.locator('#modal')).not.toHaveClass(/show/);expect((await records(page))[0].savedAt).toBe(before);
 await page.locator('#saveMenuBtn').click();await page.locator('#saveOnly').click();await expect(page.locator('#saveStatus')).toContainText('Game saved.');await expect(page.locator('#ll-app')).toBeVisible();
 for(const [button,location] of [['neighborhood','neighborhood'],['park','park'],['square','downtown'],['beach','waterfront']]){
  await page.locator(`[data-loc=${button}]`).click();await expect(page.locator('#world3d')).toHaveAttribute('data-location',location);await expect(page.locator('#world3d')).toHaveAttribute('data-avatar-type','female');await page.getByRole('button',{name:'Walk around',exact:true}).click();
  const world=page.locator('#world3d'),start=await world.getAttribute('data-avatar-position');await world.focus();await page.keyboard.down('KeyS');await expect(world).not.toHaveAttribute('data-avatar-position',start);await page.keyboard.up('KeyS');const position=await world.getAttribute('data-avatar-position');
  await quit(page);await page.locator('[data-load-slot="0"]').click();await expect(world).toHaveAttribute('data-location',location);await expect(world).toHaveAttribute('data-walking','true');await expect(world).toHaveAttribute('data-avatar-position',position);await expect(world).toBeFocused();
  if(location==='neighborhood'){await page.locator('#saveMenuBtn').click();await page.locator('#backToGame').click();await expect(world).toBeFocused();await page.locator('#saveMenuBtn').click();await page.locator('#saveOnly').click();await expect(page.locator('#modal')).not.toHaveClass(/show/);await expect(world).toBeFocused();}
  await page.getByRole('button',{name:'Overview',exact:true}).click();
 }
});

test('new games and manual saves refresh prices; a failed or older feed preserves saved holdings and prices',async({page})=>{
 let requests=0,failure=false,market=marketFixture();
 await page.route('**/api/market',route=>{requests++;return route.fulfill({status:failure?503:200,contentType:'application/json',body:JSON.stringify({data:market,status:'current'})})});
 await page.goto('/');await create(page,0,'Investor');await expect.poll(()=>requests).toBe(1);await expect.poll(async()=> (await records(page))[0].marketAsOf).toBe(market.asOf);
 await page.locator('#visitBank').click();await page.locator('[data-bank-tab=loans]').click();await page.locator('[data-loan-apply="100"]').click();await page.locator('[data-bank-tab=investments]').click();await page.locator('#tradeFund').selectOption('SPY');await page.locator('#tradeAmount').fill('10');await page.locator('#reviewTrade').click();await page.locator('#confirmTrade').click();
 const position=(await records(page))[0].state.bank.portfolio.positions.SPY;market=structuredClone(market);market.fetchedAt=new Date(Date.now()+1000).toISOString();market.funds.SPY.history.at(-1)[1]+=30;market.funds.SPY.history.at(-1)[2]+=30;
 await page.locator('#saveMenuBtn').click();await page.locator('#saveOnly').click();await expect(page.locator('#modal')).not.toHaveClass(/show/);expect(requests).toBe(2);let p=(await records(page))[0];expect(p.state.bank.portfolio.positions.SPY.lastPrice).toBe(quotePrice(market,'SPY'));expect(p.state.bank.portfolio.positions.SPY.units).toBe(position.units);expect(p.state.bank.portfolio.trades).toHaveLength(1);
 failure=true;await quit(page);expect(requests).toBe(3);p=(await records(page))[0];expect(p.state.bank.portfolio.positions.SPY.lastPrice).toBe(quotePrice(market,'SPY'));expect(p.state.bank.portfolio.trades).toHaveLength(1);await page.evaluate(()=>localStorage.removeItem('lemonadeLane_market_v1'));await page.reload();await page.locator('[data-load-slot="0"]').click();await page.locator('#visitBank').click();await page.locator('[data-bank-tab=investments]').click();await expect(page.locator('[data-sell-fund=SPY]')).toBeVisible();const savedValue=p.state.bank.portfolio.snapshots.at(-1).valueCents;await expect(page.locator('#investValue')).toHaveText(new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(savedValue/100));
 failure=false;const retained=p.state.bank.portfolio.positions.SPY.lastPrice;market=marketFixture(new Date(Date.now()-86400000));await quit(page);expect((await records(page))[0].state.bank.portfolio.positions.SPY.lastPrice).toBe(retained);
});

test('an active selling day pauses in the save menu and resumes once without charging supplies or permit twice',async({page})=>{
 const state=gameWithChecking(0);state.cash=100;state.inventory={lemons:12,sugar:10,ice:50,cups:24};state.lemonLots=[{day:1,qty:12}];
 await page.addInitScript(s=>{if(!localStorage.getItem('lemonadeLane_bank_v3'))localStorage.setItem('lemonadeLane_bank_v3',JSON.stringify(s));Math.random=()=>.1;},state);await feed(page);await page.goto('/');await enterGame(page);await page.locator('#startBtn').click();await expect(page.locator('#scoreVisitors')).not.toHaveText('0',{timeout:20000});
 await page.locator('#saveMenuBtn').click();const visitors=await page.locator('#scoreVisitors').textContent();await page.waitForTimeout(500);await expect(page.locator('#scoreVisitors')).toHaveText(visitors);await page.locator('#saveAndQuit').click();await expect(page.locator('#profileScreen')).toBeVisible();
 const checkpoint=(await records(page))[0].state;expect(checkpoint.session.dayRun.visitors).toBe(Number(visitors));const inventory=checkpoint.inventory;expect(checkpoint.ledger.filter(l=>l.category==='permit')).toHaveLength(1);
 await page.locator('[data-load-slot="0"]').click();expect((await records(page))[0].state.inventory).toEqual(inventory);await expect(page.locator('#nextDay')).toBeVisible({timeout:35000});const finished=(await records(page))[0].state;expect(finished.history).toHaveLength(1);expect(finished.ledger.filter(l=>l.category==='permit')).toHaveLength(1);expect(finished.ledger.filter(l=>l.category==='sales')).toHaveLength(1);expect(finished.session).toBeUndefined();expect(finished.cash).toBeCloseTo(100-4+finished.history[0].revenue,2);
});

test('a storage failure keeps the game open instead of pretending Save & Quit succeeded',async({page})=>{
 await feed(page);await page.goto('/');await create(page,0,'Saver');await expect.poll(async()=> (await records(page))[0].marketAsOf).not.toBeNull();
 await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='lemonomics_profiles_v1')throw new DOMException('Full','QuotaExceededError');return original.call(this,key,value)}});
 await page.locator('#saveMenuBtn').click();await page.locator('#saveAndQuit').click();await expect(page.locator('#saveMenuError')).toContainText('could not be saved');await expect(page.locator('#ll-app')).toBeVisible();await expect(page.locator('#profileScreen')).toBeHidden();await page.locator('#backToGame').click();await expect(page.locator('#modal')).not.toHaveClass(/show/);
});

test('opening the save menu pauses the customer approach timer as well as sales',async({page})=>{
 const state=gameWithChecking(0);state.cash=100;state.inventory={lemons:12,sugar:10,ice:50,cups:24};state.lemonLots=[{day:1,qty:12}];
 await page.addInitScript(s=>localStorage.setItem('lemonadeLane_bank_v3',JSON.stringify(s)),state);await feed(page);await page.goto('/');await enterGame(page);
 await page.locator('#startBtn').dispatchEvent('click');await page.locator('#saveMenuBtn').dispatchEvent('click');await expect(page.locator('#scoreVisitors')).toHaveText('0');
 await page.waitForTimeout(8500);await page.locator('#backToGame').click();await page.waitForTimeout(500);await expect(page.locator('#scoreVisitors')).toHaveText('0');await expect(page.locator('#scoreVisitors')).not.toHaveText('0',{timeout:20000});
});

test('phone title, avatar picker and save menu fit without horizontal overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});await feed(page);await page.goto('/');await page.screenshot({path:'artifacts/profiles-mobile-title.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
 await create(page,0,'Abcdefghijklmnop','female');await expect(page.locator('#saveMenuBtn')).toBeVisible();await page.locator('#saveMenuBtn').click();await page.locator('#modal').screenshot({path:'artifacts/profiles-mobile-save.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);await page.locator('#saveAndQuit').click();await expect(page.locator('#profileScreen')).toBeVisible();const cell=page.locator('[data-load-slot="0"]>span').first();expect(await cell.evaluate(el=>el.scrollWidth<=el.clientWidth&&el.scrollHeight<=el.clientHeight)).toBe(true);await page.screenshot({path:'artifacts/profiles-mobile-saved.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
});

test('delete requires confirmation, frees the correct slot and renders playable 3D avatars',async({page})=>{
 await feed(page);await page.goto('/');await expect(page.locator('[data-new-slot]')).toHaveCount(5);
 await create(page,4,'DeleteMe','female');await quit(page);
 const portrait=page.locator('[data-profile-slot="4"] img[data-preview="3d"]');await expect(portrait).toBeVisible();expect(await portrait.evaluate(img=>img.complete&&img.naturalWidth===240)).toBe(true);
 await page.screenshot({path:'artifacts/five-profiles-3d.png'});
 await page.locator('[data-delete-slot="4"]').click();await expect(page.locator('#deleteProfileWarning')).toContainText('DeleteMe');await page.locator('#cancelDeleteProfile').click();await expect(page.locator('[data-load-slot="4"]')).toBeVisible();
 await page.locator('[data-delete-slot="4"]').click();await page.locator('#confirmDeleteProfile').click();await expect(page.locator('[data-new-slot="4"]')).toBeVisible();await page.reload();await expect(page.locator('[data-new-slot]')).toHaveCount(5);
 await page.locator('[data-new-slot="4"]').click();await page.locator('#profileName').fill('NewPlayer');await page.locator('[data-submit-name]').click();await expect(page.locator('#avatarPicker img[data-preview="3d"]')).toHaveCount(2);await page.locator('#avatarPicker').screenshot({path:'artifacts/avatar-picker-3d.png'});
});
