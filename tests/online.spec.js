import {test,expect} from '@playwright/test';
import {marketFixture} from './fixtures/market.js';
async function signIn(page){await page.goto('/');await page.locator('#password').fill('family-local-testing-only');await page.getByRole('button',{name:'Play Lemonomics'}).click();await expect(page.locator('.profile-local-note')).toContainText('Saved online');const funds=[];let checks=0;await page.route('**/api/market/fund/*',r=>{funds.push(r.request().url().split('/').at(-1));return r.fulfill({contentType:'application/json',body:JSON.stringify({status:'refreshed'})})});await page.route('**/api/market',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({data:marketFixture(),status:checks++===0?'stale':'current',refreshFunds:checks===1})}));return funds;}
async function quit(page){await page.locator('#saveMenuBtn').click();await page.locator('#saveAndQuit').click();await expect(page.locator('#profileScreen')).toBeVisible();}
test('password-protected game saves online, loads on another PC, and refuses to quit after network failure',async({browser})=>{
 const first=await browser.newContext(),second=await browser.newContext(),a=await first.newPage(),b=await second.newPage(),errors=[];
 a.on('pageerror',e=>errors.push(e.message));b.on('pageerror',e=>errors.push(e.message));
 const fundRequests=await signIn(a);await a.locator('[data-new-slot="0"]').click();await a.locator('#profileName').fill('CloudTester');await a.locator('[data-submit-name]').click();await a.locator('[data-avatar=female]').click();await a.locator('#welcomeBank').click();await a.locator('[data-loan-apply="100"]').click();await expect(a.locator('#bankChecking')).toHaveText('$100.00');await quit(a);expect(new Set(fundRequests).size).toBe(6);
 await signIn(b);await expect(b.locator('[data-load-slot="0"]')).toContainText('CloudTester');await b.locator('[data-load-slot="0"]').click();await expect(b.locator('#world3d')).toHaveAttribute('data-avatar-type','female');await b.locator('#visitBank').click();await expect(b.locator('#bankChecking')).toHaveText('$100.00');
 await b.route('**/api/profiles',r=>r.abort());await b.locator('#saveMenuBtn').click();await b.locator('#saveAndQuit').click();await expect(b.locator('#saveMenuError')).toBeVisible();await expect(b.locator('#ll-app')).toBeVisible();await expect(b.locator('#profileScreen')).toBeHidden();
 await b.unroute('**/api/profiles');await b.locator('#saveAndQuit').click();await expect(b.locator('#profileScreen')).toBeVisible();
 await b.getByRole('button',{name:'Lock family playtest'}).click();await expect(b.locator('#password')).toBeVisible();expect((await b.request.get('/api/profiles')).status()).toBe(401);
 expect(errors).toEqual([]);await first.close();await second.close();
});

test('an online profile outage never presents empty local save slots',async({page})=>{
 await page.route('**/api/profiles',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Online profiles temporarily unavailable.'})}));
 await page.goto('/');await page.locator('#password').fill('family-local-testing-only');await page.getByRole('button',{name:'Play Lemonomics'}).click();
 await expect(page.locator('#profileError')).toContainText('Online profiles temporarily unavailable.');await expect(page.locator('[data-new-slot]')).toHaveCount(0);
});
