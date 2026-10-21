import {enterGame} from './fixtures/profile-ui.js';
import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const key='lemonadeLane_bank_v3';
const saved=()=>({version:5,upgrades:[],lemonLots:[{day:4,qty:12}],daySpoilage:{day:0,lemons:0,cost:0},day:4,cash:500,inventory:{lemons:12,sugar:10,ice:50,cups:24},recipe:{lemons:4,sugar:3,ice:5},price:2.25,pitchers:2,location:'neighborhood',history:[],ledger:[],bank:{checking:0,investments:0,loans:[],creditScore:650,creditEstablished:false,onTime:0,missed:0,loanSequence:1}});
async function seed(page,state){await page.addInitScript(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key,state})}
async function ready(page){await page.goto('/');await expect(page.locator('#world3d')).toHaveAttribute('data-ready','true');await enterGame(page);}
test('new game, three camera views, geometry selection, and unchanged UI',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await ready(page);
  await expect(page.locator('#cashHead')).toHaveText('$0.00');await expect(page.locator('#cupCapacity')).toHaveText('0');await expect(page.locator('#startBtn')).toBeDisabled();
  await expect(page.locator('#world3d')).toHaveAttribute('data-competitor','false');
  await page.screenshot({path:'artifacts/neighborhood.png',fullPage:true});
  // Raycast at the actual stand, using a fixed known composition.
  const canvas=page.locator('#world3d');const rect=await canvas.boundingBox();
  await canvas.click({position:{x:rect.width*.46,y:rect.height*.46}});
  await expect(canvas).toHaveAttribute('data-view','exterior');await page.locator('#scene').screenshot({path:'artifacts/exterior.png'});
  await page.locator('[data-scene-view=inside]').click();await expect(page.locator('#sceneInventory')).toContainText('0 cups available');
  await page.locator('#scene').screenshot({path:'artifacts/interior.png'});
  await canvas.focus();await canvas.press('ArrowRight');await canvas.press('Escape');await expect(canvas).toHaveAttribute('data-view','neighborhood');
  expect(errors).toEqual([]);
});
test('bank loan, withdrawal, supplies, real upgrade purchase, and an accounted trading day',async({page})=>{
  test.setTimeout(120000);
  await page.addInitScript(()=>{Math.random=()=>.1});await ready(page);
  await page.locator('#visitBank').click();await page.locator('[data-bank-tab=loans]').click();await page.locator('[data-loan-apply="100"]').click();
  await expect(page.locator('#bankChecking')).toHaveText('$100.00');
  await page.locator('[data-bank-tab=overview]').click();await page.locator('[data-transfer=withdraw][data-amount=all]').click();await page.locator('#returnToStand').click();
  await page.locator('[data-tab=recipe]').click();for(const [k,v] of [['Lemons','4'],['Sugar','3'],['Ice','5']]){await page.locator('#recipe'+k).fill(v);await page.locator('#recipe'+k).press('Tab')}
  await expect(page.locator('#cashHead')).toHaveText('$100.00');await page.locator('[data-tab=supplies]').click();
  for(const [category,tier] of [['lemons',1],['sugar',0],['ice',0],['cups',1]]){
    await page.locator(`[data-supply-category=${category}]`).click();await page.locator(`[data-supply-step="1"][data-tier="${tier}"]`).click();
  }
  await page.locator('#reviewSupplies').click();await page.locator('#confirmSupplyPurchase').click();await expect(page.locator('#cupCapacity')).toHaveText('24');
  await page.locator('[data-tab=upgrades]').click();await page.locator('#buyUpgrade').click();await expect(page.locator('#world3d')).toHaveAttribute('data-upgrades','juicer');
  await page.locator('#startBtn').click();
  const origins=JSON.parse(await page.locator('#world3d').getAttribute('data-spawn-origins'));expect(origins.length).toBe(6);
  for(const origin of origins){const [x,z]=origin.split(',').map(Number);expect(Math.hypot(x+3,z+.8)).toBeGreaterThan(15);}
  await expect(page.locator('#scoreSold')).toHaveText('0');
  await expect(page.locator('#nextDay')).toBeVisible({timeout:45000});
  const state=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);const d=state.history[0];
  expect(d.sold).toBeGreaterThan(0);expect(d.visitors).toBe(53);expect(d.serviceSteps).toBe(4);expect(d.revenue).toBe(d.sold*2.25);
  expect(state.inventory.cups).toBe(4);expect(state.cash).toBeCloseTo(100-16.84-49.99-4+d.revenue,2);
  await expect(page.locator('#world3d')).toHaveAttribute('data-sales',String(d.sold));
  await expect(page.locator('#world3d')).toHaveAttribute('data-upset',String(d.leftUpset));
  expect(state.ledger.some(e=>e.category==='equipment')).toBe(true);expect(state.bank.loans[0].balance).toBe(110);
  await page.locator('#nextDay').click();await expect(page.locator('#dayPill')).toHaveText('DAY 2');await expect(page.locator('#cupCapacity')).toHaveText('4');
});
test('existing saves restore equipment, a day-four rival, price and capacity',async({page})=>{
  const state=saved();state.upgrades=['juicer','powerjuicer','shade','register','fridge','icedispenser','classic','music','lemonstand','lights','dispenser','icemaker'];state.inventory.ice=0;state.price=3;
  await seed(page,state);await ready(page);await expect(page.locator('#cashHead')).toHaveText('$500.00');await expect(page.locator('#cupCapacity')).toHaveText('24');
  await expect(page.locator('#world3d')).toHaveAttribute('data-competitor','true');
  for(const id of ['fridge','register','dispenser','powerjuicer','music','lights'])expect((await page.locator('#world3d').getAttribute('data-upgrades')).split(',')).toContain(id);
  await page.locator('[data-scene-view=inside]').click();await page.locator('#scene').screenshot({path:'artifacts/interior-upgraded.png'});
  await page.locator('[data-scene-view=outside]').click();await page.locator('#scene').screenshot({path:'artifacts/neighborhood-upgraded.png'});
});
test('touch layout and camera controls stay in the neighborhood panel',async({page})=>{
  await page.setViewportSize({width:390,height:844});await ready(page);await page.locator('#scene').scrollIntoViewIfNeeded();
  await page.locator('[data-scene-view=exterior]').tap();await expect(page.locator('#world3d')).toHaveAttribute('data-view','exterior');
  await page.locator('[data-scene-view=inside]').tap();await expect(page.locator('#sceneInventory')).toBeVisible();
  await page.screenshot({path:'artifacts/mobile.png',fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
test('rival decisions create rival customers without creating player sales',async({page})=>{
  await seed(page,saved());await ready(page);await page.evaluate(()=>{Math.random=()=>.1});
  await page.locator('#startBtn').click();await expect(page.locator('#nextDay')).toBeVisible({timeout:45000});
  const state=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key),d=state.history[0];
  expect(d.lostCompetitor).toBe(d.visitors);expect(d.sold).toBe(0);expect(d.revenue).toBe(0);
  await expect(page.locator('#world3d')).toHaveAttribute('data-rival',String(d.lostCompetitor));
  await expect(page.locator('#world3d')).toHaveAttribute('data-sales','0');
});
test('single HTML renders and navigates in a sandbox without network or sibling assets',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));let externalRequests=0;
  await page.route('**/*',route=>{externalRequests++;route.abort()});
  await page.setContent('<iframe title="Standalone game" sandbox="allow-scripts" style="border:0;width:100%;height:900px"></iframe>');
  await page.locator('iframe').evaluate((iframe,html)=>{iframe.srcdoc=html},await readFile('dist/lemonade-lane.html','utf8'));
  const game=page.frameLocator('iframe');await expect(game.locator('#world3d')).toHaveAttribute('data-ready','true');await enterGame(game);
  await expect(game.locator('#cashHead')).toHaveText('$0.00');await expect(game.locator('#outsideStage')).toBeHidden();
  expect(await game.locator('script[src],script[type=module],link[rel=stylesheet]').count()).toBe(0);
  await game.locator('[data-scene-view=inside]').click();await expect(game.locator('#world3d')).toHaveAttribute('data-view','interior');
  await expect(game.locator('#scene3dError')).toBeHidden();expect(externalRequests).toBe(0);expect(errors).toEqual([]);
});
test('park is a separate scene, with working views, upgrades, and reversible location switching',async({page})=>{
  const state=saved();state.day=1;state.upgrades=['register','fridge'];await seed(page,state);await ready(page);
  await page.locator('#scene').screenshot({path:'artifacts/neighborhood-preserved.png'});
  const before=await page.locator('#world3d').getAttribute('data-upgrades');
  await page.locator('[data-loc=park]').click();await expect(page.locator('#world3d')).toHaveAttribute('data-location','park');
  await expect(page.locator('#areaHeading')).toHaveText('THE PARK');await expect(page.locator('#placeName')).toHaveText('Park');
  await expect(page.locator('#world3d')).toHaveAttribute('data-upgrades',before);
  await page.locator('#scene').screenshot({path:'artifacts/park.png'});
  await page.locator('[data-scene-view=exterior]').click();await page.locator('#scene').screenshot({path:'artifacts/park-exterior.png'});
  await page.locator('[data-scene-view=inside]').click();await page.locator('#scene').screenshot({path:'artifacts/park-interior.png'});
  await page.locator('#sceneBack').click();await expect(page.locator('#world3d')).toHaveAttribute('data-view','neighborhood');
  await page.locator('[data-loc=neighborhood]').click();await expect(page.locator('#world3d')).toHaveAttribute('data-location','neighborhood');
  await expect(page.locator('#cashHead')).toHaveText('$500.00');await expect(page.locator('#stockCups')).toHaveText('24');
});
for(const [day,weather,label] of [[4,'rain','Rainy'],[8,'snow','Snowy']])test(`park forecast displays ${weather}, including after location changes`,async({page})=>{
  const state=saved();state.day=day;state.location='park';await seed(page,state);await ready(page);
  await expect(page.locator('#world3d')).toHaveAttribute('data-weather',weather);await expect(page.locator('#weatherLabel')).toContainText(label);
  await page.locator('#scene').screenshot({path:`artifacts/park-${weather}.png`});
  await page.locator('[data-loc=neighborhood]').click();await expect(page.locator('#world3d')).toHaveAttribute('data-weather',weather);
  await page.locator('#scene').screenshot({path:`artifacts/neighborhood-${weather}.png`});
  await page.locator('[data-loc=park]').click();await expect(page.locator('#world3d')).toHaveAttribute('data-location','park');
});
test('legacy park saves retain their original neighborhood, balances and inventory',async({page})=>{
  const state=saved();state.version=4;state.location='park';await seed(page,state);await ready(page);
  await expect(page.locator('#world3d')).toHaveAttribute('data-location','neighborhood');await expect(page.locator('#placeName')).toHaveText('Neighborhood');
  await expect(page.locator('#cashHead')).toHaveText('$500.00');await expect(page.locator('#cupCapacity')).toHaveText('24');
});
test('park trading day keeps financial results aligned with arrivals and service events',async({page})=>{
  const state=saved();state.location='park';state.day=1;await seed(page,state);await ready(page);await page.evaluate(()=>{Math.random=()=>.1});
  await page.locator('#startBtn').click();await expect(page.locator('#nextDay')).toBeVisible({timeout:45000});
  const result=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key),day=result.history[0];
  expect(day.location).toBe('park');expect(day.sold).toBeGreaterThan(0);expect(day.visitors).toBe(53);expect(result.inventory.cups).toBe(4);
  await expect(page.locator('#world3d')).toHaveAttribute('data-sales',String(day.sold));await expect(page.locator('#world3d')).toHaveAttribute('data-upset',String(day.leftUpset));
});
test('downtown has its own scene, labels and all three views, without changing the business balance',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await ready(page);
  await page.locator('[data-loc=square]').click();await expect(page.locator('#world3d')).toHaveAttribute('data-location','downtown');
  await expect(page.locator('#areaHeading')).toHaveText('DOWNTOWN');await expect(page.locator('#placeName')).toHaveText('Downtown');
  await expect(page.locator('#feeBadge')).toHaveText('$9.00 permit');await expect(page.locator('#crowdLabel')).toContainText('Expected Visitors: 85');
  await expect(page.locator('#cashHead')).toHaveText('$0.00');await expect(page.locator('#cupCapacity')).toHaveText('0');
  await page.locator('#scene').screenshot({path:'artifacts/downtown.png'});
  await page.locator('[data-scene-view=exterior]').click();await page.locator('#scene').screenshot({path:'artifacts/downtown-exterior.png'});
  await page.locator('[data-scene-view=inside]').click();await expect(page.locator('#sceneInventory')).toContainText('0 cups available');await page.locator('#scene').screenshot({path:'artifacts/downtown-interior.png'});
  await page.locator('#sceneBack').click();await expect(page.locator('#world3d')).toHaveAttribute('data-view','neighborhood');
  await page.locator('[data-loc=park]').click();await expect(page.locator('#areaHeading')).toHaveText('THE PARK');
  await page.locator('[data-loc=neighborhood]').click();await expect(page.locator('#areaHeading')).toHaveText('THE NEIGHBORHOOD');
  await page.locator('[data-loc=square]').click();await expect(page.locator('#world3d')).toHaveAttribute('data-location','downtown');expect(errors).toEqual([]);
});
for(const [day,weather] of [[4,'rain'],[8,'snow']])test(`downtown restores saved equipment and ${weather}`,async({page})=>{
  const state=saved();state.location='square';state.day=day;state.price=3.25;state.upgrades=['register','fridge','lights'];
  await seed(page,state);await ready(page);await expect(page.locator('#world3d')).toHaveAttribute('data-weather',weather);
  await expect(page.locator('#world3d')).toHaveAttribute('data-location','downtown');await expect(page.locator('#world3d')).toHaveAttribute('data-competitor','true');
  expect((await page.locator('#world3d').getAttribute('data-upgrades')).split(',')).toEqual(['register','fridge','lights']);
  await expect(page.locator('#cashHead')).toHaveText('$500.00');await expect(page.locator('#standPrice')).toHaveText('$3.25 / CUP');
  await page.locator('#scene').screenshot({path:`artifacts/downtown-${weather}.png`});
});
test('downtown trading retains its traffic, permit, inventory, service and financial rules',async({page})=>{
  const state=saved();state.location='square';state.day=1;await seed(page,state);await ready(page);await page.evaluate(()=>{Math.random=()=>.1});
  await page.locator('#startBtn').click();
  const origins=JSON.parse(await page.locator('#world3d').getAttribute('data-spawn-origins'));expect(origins.length).toBe(6);
  for(const origin of origins){const [x,z]=origin.split(',').map(Number);expect(Math.hypot(x+3,z+.8)).toBeGreaterThan(15);}
  await expect(page.locator('#nextDay')).toBeVisible({timeout:45000});
  const result=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key),day=result.history[0];
  expect(day.location).toBe('square');expect(day.visitors).toBe(85);expect(day.permit).toBe(9);expect(day.sold).toBeGreaterThan(0);expect(day.revenue).toBeCloseTo(day.sold*2.25,2);
  expect(day.profit).toBeCloseTo(day.revenue-day.cost-9,2);expect(result.cash).toBeCloseTo(500-9+day.revenue,2);expect(result.inventory.cups).toBe(4);
  await expect(page.locator('#world3d')).toHaveAttribute('data-sales',String(day.sold));await expect(page.locator('#world3d')).toHaveAttribute('data-upset',String(day.leftUpset));
});
test('downtown fits a phone viewport and supports touch navigation',async({page})=>{
  await page.setViewportSize({width:390,height:844});await ready(page);await page.locator('[data-loc=square]').tap();
  await page.locator('#scene').scrollIntoViewIfNeeded();await page.locator('#scene').screenshot({path:'artifacts/downtown-mobile.png'});
  await page.locator('[data-scene-view=exterior]').tap();await expect(page.locator('#world3d')).toHaveAttribute('data-view','exterior');
  await page.locator('[data-scene-view=inside]').tap();await expect(page.locator('#sceneInventory')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
test('standalone downtown works offline in a script-enabled sandbox',async({page})=>{
  let requests=0;const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>{requests++;r.abort()});
  await page.setContent('<iframe title="Standalone downtown" sandbox="allow-scripts" style="width:100%;height:1000px;border:0"></iframe>');
  await page.locator('iframe').evaluate((iframe,html)=>{iframe.srcdoc=html},await readFile('dist/lemonade-lane.html','utf8'));
  const game=page.frameLocator('iframe');await expect(game.locator('#world3d')).toHaveAttribute('data-ready','true');await enterGame(game);
  await game.locator('[data-loc=square]').click();await expect(game.locator('#world3d')).toHaveAttribute('data-location','downtown');
  await game.locator('[data-scene-view=inside]').click();await expect(game.locator('#world3d')).toHaveAttribute('data-view','interior');
  expect(requests).toBe(0);expect(errors).toEqual([]);
});
test('waterfront has distinct beach scenery, all views, and reversible location switching',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await ready(page);await page.locator('[data-loc=beach]').click();
  await expect(page.locator('#world3d')).toHaveAttribute('data-location','waterfront');await expect(page.locator('#areaHeading')).toHaveText('WATERFRONT');
  await expect(page.locator('#placeName')).toHaveText('Waterfront');await expect(page.locator('#feeBadge')).toHaveText('$17.00 permit');await expect(page.locator('#crowdLabel')).toContainText('Expected Visitors: 110');
  await expect(page.locator('#cashHead')).toHaveText('$0.00');await expect(page.locator('#cupCapacity')).toHaveText('0');await page.locator('#scene').screenshot({path:'artifacts/waterfront.png'});
  await page.locator('[data-scene-view=exterior]').click();await page.locator('#scene').screenshot({path:'artifacts/waterfront-exterior.png'});
  await page.locator('[data-scene-view=inside]').click();await expect(page.locator('#sceneInventory')).toContainText('0 cups available');await page.locator('#scene').screenshot({path:'artifacts/waterfront-interior.png'});
  await page.locator('#sceneBack').click();await expect(page.locator('#world3d')).toHaveAttribute('data-view','neighborhood');
  for(const [key,scene] of [['park','park'],['square','downtown'],['neighborhood','neighborhood'],['beach','waterfront']]){
    await page.locator(`[data-loc=${key}]`).click();await expect(page.locator('#world3d')).toHaveAttribute('data-location',scene);
  }expect(errors).toEqual([]);
});
for(const [day,weather,visitors] of [[4,'rain',53],[8,'snow',43]])test(`waterfront restores equipment and its ${weather} forecast`,async({page})=>{
  const state=saved();state.location='beach';state.day=day;state.price=3.25;state.upgrades=['register','fridge','lights'];
  await seed(page,state);await ready(page);await expect(page.locator('#world3d')).toHaveAttribute('data-weather',weather);await expect(page.locator('#world3d')).toHaveAttribute('data-location','waterfront');
  await expect(page.locator('#world3d')).toHaveAttribute('data-competitor','true');await expect(page.locator('#crowdLabel')).toContainText(`Expected Visitors: ${visitors}`);
  expect((await page.locator('#world3d').getAttribute('data-upgrades')).split(',')).toEqual(['register','fridge','lights']);await expect(page.locator('#cashHead')).toHaveText('$500.00');
  await expect(page.locator('#standPrice')).toHaveText('$3.25 / CUP');await expect(page.locator('#rivalPrice')).toHaveText('$2.75');
  await page.locator('#scene').screenshot({path:`artifacts/waterfront-${weather}.png`});
  await page.locator('[data-loc=square]').click();await expect(page.locator('#world3d')).toHaveAttribute('data-weather',weather);
  await page.locator('[data-loc=beach]').click();await expect(page.locator('#world3d')).toHaveAttribute('data-location','waterfront');
});
test('waterfront trading keeps the original permit, demand, inventory, and sales accounting',async({page})=>{
  const state=saved();state.location='beach';state.day=1;await seed(page,state);await ready(page);await page.evaluate(()=>{Math.random=()=>.1});
  await page.locator('#startBtn').click();const origins=JSON.parse(await page.locator('#world3d').getAttribute('data-spawn-origins'));expect(origins.length).toBe(6);
  for(const origin of origins){const [x,z]=origin.split(',').map(Number);expect(Math.hypot(x+3,z+.8)).toBeGreaterThan(15);}
  await expect(page.locator('#nextDay')).toBeVisible({timeout:45000});
  const result=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key),day=result.history[0];
  expect(day.location).toBe('beach');expect(day.visitors).toBe(110);expect(day.permit).toBe(17);expect(day.sold).toBeGreaterThan(0);expect(day.revenue).toBeCloseTo(day.sold*2.25,2);
  expect(day.profit).toBeCloseTo(day.revenue-day.cost-17,2);expect(result.cash).toBeCloseTo(500-17+day.revenue,2);expect(result.inventory.cups).toBe(4);
  await expect(page.locator('#world3d')).toHaveAttribute('data-sales',String(day.sold));await expect(page.locator('#world3d')).toHaveAttribute('data-upset',String(day.leftUpset));
});
test('waterfront rival choices preserve sales totals and competitor routing',async({page})=>{
  const state=saved();state.location='beach';await seed(page,state);await ready(page);await page.evaluate(()=>{Math.random=()=>.1});
  await page.locator('#startBtn').click();await expect(page.locator('#nextDay')).toBeVisible({timeout:45000});
  const day=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).history[0],key);
  expect(day.weather).toBe('Rainy');expect(day.visitors).toBe(53);expect(day.lostCompetitor).toBe(day.visitors);expect(day.sold).toBe(0);expect(day.revenue).toBe(0);
  await expect(page.locator('#world3d')).toHaveAttribute('data-rival',String(day.lostCompetitor));await expect(page.locator('#world3d')).toHaveAttribute('data-sales','0');
});
test('waterfront supports phone touch controls and offline sandbox rendering',async({page})=>{
  await page.setViewportSize({width:390,height:844});await ready(page);await page.locator('[data-loc=beach]').tap();await page.locator('#scene').scrollIntoViewIfNeeded();
  await page.locator('#scene').screenshot({path:'artifacts/waterfront-mobile.png'});await page.locator('[data-scene-view=inside]').tap();await expect(page.locator('#sceneInventory')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  let requests=0;const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>{requests++;r.abort()});
  await page.setContent('<iframe title="Standalone waterfront" sandbox="allow-scripts" style="width:100%;height:1000px;border:0"></iframe>');
  await page.locator('iframe').evaluate((iframe,html)=>{iframe.srcdoc=html},await readFile('dist/lemonade-lane.html','utf8'));
  const game=page.frameLocator('iframe');await expect(game.locator('#world3d')).toHaveAttribute('data-ready','true');await enterGame(game);await game.locator('[data-loc=beach]').tap();
  await expect(game.locator('#world3d')).toHaveAttribute('data-location','waterfront');await game.locator('[data-scene-view=inside]').tap();await expect(game.locator('#world3d')).toHaveAttribute('data-view','interior');
  expect(requests).toBe(0);expect(errors).toEqual([]);
});

test('neighborhood avatar walks, stops on blur, visits stand and resets on location changes',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await seed(page,saved());await ready(page);
  const world=page.locator('#world3d'),position=async()=>JSON.parse(await world.getAttribute('data-avatar-position'));
  const original=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
  await expect(world).toHaveAttribute('data-avatar-state','at-stand');
  expect(await position()).toEqual({x:-3,z:-.38});
  await page.locator('[data-scene-view=inside]').click();
  await page.locator('#scene').screenshot({path:'artifacts/avatar-at-stand.png'});
  await page.getByRole('button',{name:'Walk around',exact:true}).click();await expect(world).toHaveAttribute('data-walking','true');
  await expect(page.getByRole('button',{name:'Visit my stand · E',exact:true})).toBeVisible();
  await page.locator('#scene').screenshot({path:'artifacts/avatar-neighborhood.png'});
  // Walk into the real stand facade: collision must stop us outside its footprint.
  await page.keyboard.down('KeyW');await page.waitForTimeout(450);await page.keyboard.up('KeyW');
  expect((await position()).z).toBeGreaterThanOrEqual(.98);
  await page.keyboard.press('KeyE');await expect(world).toHaveAttribute('data-view','exterior');
  await page.getByRole('button',{name:'Walk around',exact:true}).click();
  const start=await position();await page.keyboard.down('KeyD');await expect.poll(async()=>Math.hypot((await position()).x-start.x,(await position()).z-start.z)).toBeGreaterThan(.8);await page.keyboard.up('KeyD');
  await page.keyboard.down('KeyD');await page.locator('[data-tab=recipe]').focus();const stopped=await position();await page.waitForTimeout(200);expect(await position()).toEqual(stopped);await page.keyboard.up('KeyD');
  // Turning off exploration restores overview. Stand inspection is still available.
  await page.getByRole('button',{name:'Overview',exact:true}).click();await expect(world).toHaveAttribute('data-walking','false');
  await expect(world).toHaveAttribute('data-avatar-state','at-stand');
  expect(await position()).toEqual({x:-3,z:-.38});
  await page.locator('[data-scene-view=inside]').click();await expect(world).toHaveAttribute('data-view','interior');
  await page.getByRole('button',{name:'Walk around',exact:true}).click();await expect(world).toHaveAttribute('data-view','neighborhood');
  expect(await position()).toEqual({x:-3,z:1.25});
  await expect(page.getByRole('button',{name:'Visit my stand · E',exact:true})).toBeVisible();
  await world.focus();await page.keyboard.press('Escape');await expect(world).toHaveAttribute('data-walking','false');
  const after=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);expect(after.cash).toBe(original.cash);expect(after.inventory).toEqual(original.inventory);
  await page.locator('[data-tab=location]').click();await page.locator('[data-loc=park]').click();await expect(page.getByRole('button',{name:'Walk around',exact:true})).toBeVisible();await expect(world).toHaveAttribute('data-walking','false');
  await expect(world).toHaveAttribute('data-avatar-state','at-stand');
  await page.locator('[data-loc=neighborhood]').click();await expect(page.getByRole('button',{name:'Walk around',exact:true})).toBeVisible();expect(errors).toEqual([]);
});
test('avatar touch controls work and cancel cleanly; nearby action opens stand',async({page})=>{
  await page.setViewportSize({width:390,height:844});await ready(page);
  await page.getByRole('button',{name:'Walk around',exact:true}).tap();const world=page.locator('#world3d');
  await page.getByRole('button',{name:'Visit my stand · E',exact:true}).tap();await expect(world).toHaveAttribute('data-view','exterior');await expect(world).toHaveAttribute('data-walking','false');
  await page.getByRole('button',{name:'Walk around',exact:true}).tap();
  const before=await world.getAttribute('data-avatar-position'),button=page.getByRole('button',{name:'Walk backward',exact:true});
  await button.dispatchEvent('pointerdown',{pointerId:1,clientX:0,clientY:0});
  await expect.poll(()=>world.getAttribute('data-avatar-position')).not.toBe(before);
  await button.dispatchEvent('pointercancel',{pointerId:1});const stop=await world.getAttribute('data-avatar-position');await page.waitForTimeout(200);await expect(world).toHaveAttribute('data-avatar-position',stop);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.locator('#scene').screenshot({path:'artifacts/avatar-mobile.png'});
});

for(const [location,name,day] of [['park','park',1],['square','downtown',4],['beach','waterfront',8]]){
  test(`${name} avatar waits at the counter, walks with keyboard and touch, and resets when changing locations`,async({page})=>{
    const errors=[];page.on('pageerror',e=>errors.push(e.message));const state=saved();state.location=location;state.day=day;await seed(page,state);await ready(page);
    const world=page.locator('#world3d'),position=async()=>JSON.parse(await world.getAttribute('data-avatar-position'));
    await expect(world).toHaveAttribute('data-avatar-state','at-stand');expect(await position()).toEqual({x:-3,z:-.38});
    await page.locator('[data-scene-view=inside]').click();await page.locator('#scene').screenshot({path:`artifacts/avatar-${name}-inside.png`});
    await page.getByRole('button',{name:'Walk around',exact:true}).click();await expect(world).toHaveAttribute('data-walking','true');
    expect(await position()).toEqual({x:-3,z:1.25});
    await page.locator('#scene').screenshot({path:`artifacts/avatar-${name}.png`});
    await page.keyboard.down('KeyS');await expect.poll(async()=>Math.hypot((await position()).x+3,(await position()).z-1.25)).toBeGreaterThan(1);await page.keyboard.up('KeyS');
    if(name==='waterfront'){
      await page.keyboard.down('KeyS');await expect.poll(async()=>(await position()).z).toBeGreaterThan(3.5);await page.waitForTimeout(400);await page.keyboard.up('KeyS');
      expect((await position()).z).toBeLessThanOrEqual(3.75);
    }
    await page.locator('[data-loc=neighborhood]').click();await expect(world).toHaveAttribute('data-walking','false');await expect(world).toHaveAttribute('data-avatar-state','at-stand');
    expect(await position()).toEqual({x:-3,z:-.38});
    await page.locator(`[data-loc=${location}]`).click();await page.setViewportSize({width:390,height:844});
    await page.getByRole('button',{name:'Walk around',exact:true}).tap();
    const start=await position(),button=page.getByRole('button',{name:'Walk backward',exact:true});
    await button.dispatchEvent('pointerdown',{pointerId:1,clientX:0,clientY:0});await expect.poll(async()=>Math.hypot((await position()).x-start.x,(await position()).z-start.z)).toBeGreaterThan(.5);
    await button.dispatchEvent('pointercancel',{pointerId:1});
    const stopped=await position();await page.waitForTimeout(200);expect(await position()).toEqual(stopped);
    await page.locator('#scene').screenshot({path:`artifacts/avatar-${name}-mobile.png`});
    await page.getByRole('button',{name:'Overview',exact:true}).tap();await expect(world).toHaveAttribute('data-avatar-state','at-stand');
    expect(await position()).toEqual({x:-3,z:-.38});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    const after=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);expect(after.cash).toBe(state.cash);expect(after.inventory).toEqual(state.inventory);expect(errors).toEqual([]);
  });
}
