import {test,expect} from '@playwright/test';
import {enterGame} from './fixtures/profile-ui.js';
import {gameWithChecking,marketFixture} from './fixtures/market.js';
import {alpacaFixture,alpacaHistory} from './fixtures/alpaca.js';
const key='lemonadeLane_bank_v3',TIME=Date.parse('2026-10-24T02:00:00Z');
async function open(page){
 await page.clock.install({time:TIME});await page.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state))},{key,state:gameWithChecking(20)});
 const control={price:60000,status:'ok',calls:0};
 await page.route('**/api/market',r=>r.fulfill({json:{data:marketFixture(new Date(TIME)),status:'current'}}));
 await page.route('**/api/market/quotes',async r=>{control.calls++;const now=new Date(await page.evaluate(()=>Date.now())),data=alpacaFixture(now);data.retryAfterMs=20000;data.quotes['BTC/USD'].price=control.price;data.crypto.status=control.status;if(control.status!=='ok'){data.quotes['BTC/USD'].unavailable=true;data.crypto.retryAfterMs=3600000;data.retryAfterMs=300000}await r.fulfill({json:data})});
 await page.route('**/api/market/history?*',r=>{const u=new URL(r.request().url());return r.fulfill({json:alpacaHistory(u.searchParams.get('symbol'),u.searchParams.get('range'),new Date(TIME))})});
 await page.goto('/');await enterGame(page);await page.locator('#visitBank').click();await page.locator('[data-bank-tab=investments]').click();await expect(page.locator('.invest-price-status')).toContainText('Market closed');await expect(page.locator('.invest-price-status')).toContainText('Bitcoin 24/7');return control;
}
const saved=page=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
test('Bitcoin buys, reprices and sells after hours, keeps existing ETF closure, and survives a reload',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const c=await open(page);await expect(page.locator('.invest-fund-card')).toHaveCount(7);await expect(page.locator('#reviewTrade')).toBeDisabled();await page.locator('[data-select-fund="BTC/USD"]').click();await expect(page.locator('#reviewTrade')).toBeEnabled();await page.locator('#tradeAmount').fill('20');await page.locator('#reviewTrade').click();await expect(page.locator('.invest-confirmation')).toContainText('per BTC');await page.locator('#confirmTrade').click();let s=await saved(page);const balance=s.bank.checking,units=s.bank.portfolio.positions['BTC/USD'].units;expect(balance).toBe(.04);expect(s.bank.portfolio.trades[0].feed).toBe('crypto-us');
 c.price=66000;await page.clock.fastForward(21000);await expect(page.locator('#investValue')).toHaveText('$21.85');await expect(page.locator('#bankChecking')).toHaveText('$0.04');await page.locator('[data-sell-fund="BTC/USD"]').click();await page.locator('#tradeAmount').fill(String(Math.floor(units/2)/1000000));await page.locator('#reviewTrade').click();await page.locator('#confirmTrade').click();s=await saved(page);expect(s.bank.portfolio.trades[1].realizedCents).toBeGreaterThan(0);expect(s.bank.checking).toBeGreaterThan(balance);expect(s.bank.portfolio.positions['BTC/USD'].units).toBeGreaterThan(0);
 await page.reload();await enterGame(page);await page.locator('#visitBank').click();await page.locator('[data-bank-tab=investments]').click();await expect(page.locator('[data-sell-fund="BTC/USD"]')).toBeVisible();await page.locator('[data-select-fund="DIA"]').click();await expect(page.locator('#reviewTrade')).toBeDisabled();expect(errors).toEqual([]);await page.locator('#investApp').screenshot({path:'artifacts/bitcoin-night-investments.png'});
});
test('Bitcoin charts label real-shaped crypto prices and remain usable on a phone',async({page})=>{
 await page.setViewportSize({width:390,height:844});await open(page);await page.locator('[data-select-fund="BTC/USD"]').click();for(const symbol of ['DIA','SPY'])await page.locator(`[data-compare="${symbol}"]`).uncheck();
 for(const range of ['1D','1W','1M','3M','1Y','5Y']){await page.locator(`[data-range="${range}"]`).click();await page.clock.fastForward(1500);await expect(page.locator('#investChart svg')).toBeVisible()}
 await page.locator('#investChart svg').focus();await page.keyboard.press('End');await expect(page.locator('.chart-tooltip')).toContainText('/ BTC');expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);await page.locator('#investApp').screenshot({path:'artifacts/bitcoin-phone.png'});
});
test('Bitcoin failure preserves funds and disables trading without claiming the crypto market closes',async({page})=>{
 const c=await open(page);await page.locator('[data-select-fund="BTC/USD"]').click();await expect(page.locator('#reviewTrade')).toBeEnabled();c.status='configuration';await page.clock.fastForward(21000);await expect(page.locator('#reviewTrade')).toBeDisabled();await expect(page.locator('#investApp')).toContainText('Bitcoin connection needs attention');const count=c.calls;await page.locator('#refreshMarket').click();expect(c.calls).toBe(count);expect((await saved(page)).bank.checking).toBe(20);
});
