import {enterGame} from './fixtures/profile-ui.js';
import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {marketFixture,gameWithChecking} from './fixtures/market.js';
import {quotePrice} from '../src/market-data.js';
const key='lemonadeLane_bank_v3';
async function open(page,{state=gameWithChecking(),market=marketFixture(),failure=false}={}){
  await page.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state))},{key,state});
  await page.route('**/api/market',route=>route.fulfill({status:failure?503:200,contentType:'application/json',body:JSON.stringify(failure?{data:null,status:'unavailable'}:{data:market,status:'current'})}));
  await page.goto('/');await expect(page.locator('#world3d')).toHaveAttribute('data-ready','true');await enterGame(page);
  await page.locator('#visitBank').click();await page.locator('[data-bank-tab=investments]').click();
  if(!failure){await expect(page.locator('.invest-price-status')).toContainText('Latest prior trading day');await expect(page.locator('#investApp')).toContainText('TEST FIXTURE');}else await expect(page.locator('.invest-feed-note[role=status]')).toContainText('Showing saved prices.');
  return market;
}
async function buy(page,symbol,amount,mode='dollars'){
  await page.locator('#tradeFund').selectOption(symbol);await page.locator('#tradeMode').selectOption(mode);await page.locator('#tradeAmount').fill(amount);
  await page.locator('#reviewTrade').click();await expect(page.locator('.invest-confirmation')).toBeVisible();await page.locator('#confirmTrade').click();
}
test('fund comparison supports all five ranges, selectable series, hover and keyboard history',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await open(page);
  await expect(page.locator('.invest-fund-card')).toHaveCount(6);await expect(page.locator('[data-chart-series]')).toHaveCount(2);
  for(const range of ['1W','1M','YTD','1Y','5Y']){await page.locator(`[data-range="${range}"]`).click();await expect(page.locator(`[data-range="${range}"]`)).toHaveAttribute('aria-pressed','true');await expect(page.locator('#investChart svg')).toBeVisible();}
  expect((await page.locator('[data-chart-series]').first().getAttribute('d')).split('L').length).toBeGreaterThan(1200);
  await page.locator('[data-compare=GLD]').check();await expect(page.locator('[data-chart-series]')).toHaveCount(3);
  await page.locator('#investChart svg').focus();await page.keyboard.press('End');await expect(page.locator('.chart-tooltip')).toBeVisible();
  await page.locator('[data-range="1M"]').click();await page.locator('#investApp').screenshot({path:'artifacts/investments-funds.png'});
  for(const s of ['DIA','SPY','GLD'])await page.locator(`[data-compare=${s}]`).uncheck();await expect(page.locator('.invest-chart-empty')).toContainText('Select a fund');
  expect(errors).toEqual([]);
});
test('checking buys fractional shares, fees and portfolio survive reload, and sales credit checking',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await open(page);
  await page.locator('[data-chart-tab=portfolio]').click();await expect(page.locator('.invest-chart-empty')).toContainText('first purchase');
  await buy(page,'SPY','25');await expect(page.locator('#bankChecking')).toHaveText('$974.87');await expect(page.locator('#portfolioGain')).toHaveText('-$0.13');
  await buy(page,'SGOV','10');await expect(page.locator('#bankChecking')).toHaveText('$964.82');
  let state=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);expect(state.cash).toBe(40);expect(state.bank.portfolio.trades).toHaveLength(2);expect(state.bank.portfolio.positions.SPY.units).toBeGreaterThan(0);expect(state.bank.portfolio.snapshots).toHaveLength(1);
  await expect(page.locator('[data-chart-series="Portfolio net gain / loss"]')).toBeVisible();
  await page.locator('#investApp').screenshot({path:'artifacts/investments-portfolio.png'});
  await page.reload();await enterGame(page);await page.locator('#visitBank').click();await page.locator('[data-bank-tab=investments]').click();await expect(page.locator('#investApp')).toContainText('TEST FIXTURE');await expect(page.locator('[data-sell-fund=SPY]')).toBeVisible();
  await page.locator('[data-sell-fund=SPY]').click();await page.locator('#reviewTrade').click();await page.locator('#confirmTrade').click();
  await expect(page.locator('[data-sell-fund=SPY]')).toHaveCount(0);await expect(page.locator('#bankChecking')).toHaveText('$989.69');
  state=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);expect(state.bank.portfolio.trades).toHaveLength(3);expect(state.ledger.filter(x=>x.category.startsWith('investment '))).toHaveLength(3);expect(state.bank.portfolio.trades.at(-1).feeCents).toBe(13);expect(state.cash).toBe(40);
  expect(errors).toEqual([]);
});
test('failed refresh preserves real cached history; stale prices pause trading',async({page})=>{
  const future=new Date(Date.now()+7*86400000);await page.clock.setFixedTime(future);
  await open(page,{failure:true});await expect(page.locator('#reviewTrade')).toBeDisabled();await expect(page.locator('#investChart svg')).toBeVisible();
  await expect(page.locator('.invest-price-status')).toContainText('refresh required');
  const market=marketFixture(future);
  await page.route('**/api/market',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({data:market,status:'current'})}));
  await page.locator('#refreshMarket').click();await expect(page.locator('.invest-price-status')).toContainText('Latest prior trading day');await expect(page.locator('#reviewTrade')).toBeEnabled();
});
test('not enough checking, zero amounts and overselling do not mutate accounts',async({page})=>{
  await open(page,{state:gameWithChecking(5)});
  await page.locator('#tradeAmount').fill('10');await page.locator('#reviewTrade').click();await expect(page.locator('#investNotice')).toContainText('Not enough');await expect(page.locator('#confirmTrade')).toHaveCount(0);
  await page.locator('[data-trade-side=sell]').click();await page.locator('#tradeAmount').fill('1');await page.locator('#reviewTrade').click();await expect(page.locator('#investNotice')).toContainText('enough shares');
  await expect(page.locator('#bankChecking')).toHaveText('$5.00');const state=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);expect(state.bank.portfolio.trades).toHaveLength(0);expect(state.cash).toBe(40);
});
test('phone investing layout fits and trading preview shows fee before confirmation',async({page})=>{
  await page.setViewportSize({width:390,height:844});await open(page);await page.locator('#tradeFund').selectOption('GLD');await page.locator('#tradeAmount').fill('20');
  await expect(page.locator('#tradeEstimate')).toContainText('$0.10');await page.locator('#reviewTrade').click();await expect(page.locator('.invest-confirmation')).toContainText('$20.10');
  await page.locator('#bankScreen').screenshot({path:'artifacts/investments-mobile.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.locator('#cancelTrade').click();await expect(page.locator('.invest-confirmation')).toHaveCount(0);await expect(page.locator('#bankChecking')).toHaveText('$1000.00');
});
test('single HTML can explore saved market history and trade without network requests',async({page})=>{
  const market=marketFixture(),state=gameWithChecking();await page.addInitScript(()=>{});
  // Seed the standalone's browser storage through a local page, then block all requests.
  await page.goto('/');await page.evaluate(({key,state,market})=>{localStorage.setItem(key,JSON.stringify(state));localStorage.setItem('lemonadeLane_market_v1',JSON.stringify(market))},{key,state,market});
  const html=await readFile('dist/lemonade-lane.html','utf8');await page.route('**/*',r=>r.abort());
  await page.setContent(html);await expect(page.locator('#world3d')).toHaveAttribute('data-ready','true');await enterGame(page);await page.locator('#visitBank').click();await page.locator('[data-bank-tab=investments]').click();
  await expect(page.locator('#investChart svg')).toBeVisible();await buy(page,'DIA','10');await expect(page.locator('#bankChecking')).toHaveText('$989.95');
});

test('embedded preview can review, confirm and sell without native form permissions',async({page})=>{
  const snapshot=JSON.parse(await readFile('src/data/market-snapshot.json','utf8'));
  await page.clock.setFixedTime(new Date(Date.parse(snapshot.asOf+'T17:00:00Z')+86400000));
  const errors=[],blocked=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.text().includes('Blocked form submission'))blocked.push(m.text())});
  await page.route('**/*',r=>r.abort());
  await page.setContent('<iframe title="Embedded investment game" sandbox="allow-scripts" style="width:100%;height:900px;border:0"></iframe>');
  await page.locator('iframe').evaluate((el,html)=>el.srcdoc=html,await readFile('dist/lemonade-lane.html','utf8'));
  const game=page.frameLocator('iframe');await expect(game.locator('#world3d')).toHaveAttribute('data-ready','true');await enterGame(game);
  await game.locator('#visitBank').click();await game.locator('[data-bank-tab=loans]').click();await game.locator('[data-loan-apply="100"]').click();
  await game.locator('[data-bank-tab=investments]').click();await game.locator('#tradeAmount').fill('10');
  await game.locator('#reviewTrade').click();await expect(game.locator('.invest-confirmation')).toBeVisible();await expect(game.locator('#confirmTrade')).toBeFocused();
  await expect(game.locator('#bankChecking')).toHaveText('$100.00');
  await game.locator('#confirmTrade').click();await expect(game.locator('#bankChecking')).toHaveText('$89.95');await expect(game.locator('[data-sell-fund=DIA]')).toBeVisible();
  await game.locator('[data-sell-fund=DIA]').click();await game.locator('#reviewTrade').click();await game.locator('#confirmTrade').click();
  await expect(game.locator('#bankChecking')).toHaveText('$99.90');expect(errors).toEqual([]);expect(blocked).toEqual([]);
});
test('Enter reviews the entered shares and invalid amounts show a focused message',async({page})=>{
  await open(page);await page.locator('#tradeMode').selectOption('shares');await page.locator('#tradeAmount').fill('1');await page.locator('#tradeAmount').press('Enter');
  await expect(page.locator('.invest-confirmation')).toBeVisible();await expect(page.locator('#confirmTrade')).toBeFocused();
  await expect(page.locator('.invest-confirmation')).toContainText('1 DIA shares');await expect(page.locator('#bankChecking')).toHaveText('$1000.00');
  await page.locator('#cancelTrade').click();await page.locator('#tradeAmount').fill('0');await page.locator('#reviewTrade').click();
  await expect(page.locator('#investNotice')).toContainText('greater than zero');await expect(page.locator('#investNotice')).toBeFocused();
  await expect(page.locator('.invest-confirmation')).toHaveCount(0);await expect(page.locator('#bankChecking')).toHaveText('$1000.00');
});
