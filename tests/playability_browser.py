"""Behavioral integration checks with existing-save fixtures and real voxel collision paths."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess,json,urllib.request,time,copy
from datetime import datetime, timezone
ROOT=Path(__file__).resolve().parents[1]
server=subprocess.Popen(['python3','-m','http.server','8125','--bind','127.0.0.1','--directory',str(ROOT/'downloads')],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
BASE='http://127.0.0.1:8125/Lemonade-Lane.html'
from browser_helpers import PATH_TO_SHOP,saved,load,capture_world,enter_shop
try:
 for _ in range(50):
  try:urllib.request.urlopen(BASE);break
  except OSError:time.sleep(.1)
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1500,'height':1100});page.set_default_timeout(10000)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE)
  original=saved(page);fixture=copy.deepcopy(original)
  fixture.update(cash=100,recipe={'lemons':4,'sugar':3,'ice':5},inventory={'lemons':30,'sugar':30,'ice':50,'cups':60},lemonLots=[{'day':1,'qty':30}],upgrades=['juicer'])
  load(page,fixture);assert saved(page)['recipe']==fixture['recipe'];assert saved(page)['upgrades']==['juicer']
  capture_world(page)
  result=enter_shop(page,'books');assert 'Downtown Bookstore' in page.locator('#modalBody').inner_text()
  print('PASS bookstore physically reachable:',result['steps'],'collision-safe steps',flush=True)
  before=int(page.locator('#crowdLabel').inner_text().split(': ')[1])
  page.locator('[data-buy-recipe=good]').click();assert saved(page)['cash']==90
  page.locator('[data-use-recipe=good]').click();assert saved(page)['recipe']=={'lemons':4.2,'sugar':3.1,'ice':5.3}
  assert 'satisfaction 7/10' in page.locator('#tasteHint').inner_text()
  boosted=int(page.locator('#crowdLabel').inner_text().split(': ')[1]);assert boosted>before
  page.locator('[data-recipe=lemons][data-change="1"]').click()
  assert int(page.locator('#crowdLabel').inner_text().split(': ')[1])==before
  # Buying a recipe does not allow buying it again; reopening shows ownership.
  page.evaluate("testWorld.onShop('books')");assert page.locator('[data-buy-recipe=good]').is_disabled();page.locator('#leaveShop').click()
  result=enter_shop(page,'market',activation='click');assert 'Sell to Maple Market?' in page.locator('#modalBody').inner_text()
  print('PASS Maple Market physically reachable:',result['steps'],'collision-safe steps',flush=True)
  page.locator('[data-sell-supply=lemons]').click();page.locator('[data-confirm-supply=lemons]').click()
  assert saved(page)['inventory']['lemons']==0;assert saved(page)['cash']==97.5
  page.locator('[data-sell-equipment=juicer]').click();page.locator('[data-confirm-equipment=juicer]').click()
  assert saved(page)['cash']==122.5;assert saved(page)['upgrades']==[]
  page.locator('#leaveShop').click();page.reload();assert saved(page)['purchasedRecipes']==['good']
  print('PASS recipe purchase/exact match/visitor increase, inventory and equipment resale, reload migration',flush=True)
  # Collateral works even at low credit, independently of liquid balances.
  s=copy.deepcopy(original);s['cash']=10;s['bank']['checking']=500;s['bank']['creditScore']=400;s['bank']['creditEstablished']=True
  s['bank']['portfolio']={'version':1,'positions':{'SPY':{'units':1000000,'costCents':70000,'lastPrice':766.48}},'trades':[],'events':[],'snapshots':[],'sequence':1,'legacyCents':0,'marketDate':'2026-10-19'}
  load(page,s);page.locator('#visitBank').click();page.locator('[data-bank-tab=loans]').click()
  limit=float(page.locator('#securedAmount').get_attribute('max'));assert limit==383.24,limit
  page.locator('#securedAmount').fill('100');page.locator('#securedApply').click();assert saved(page)['bank']['loans'][0]['type']=='secured';assert saved(page)['bank']['checking']==600
  page.clock.set_fixed_time(datetime(2026,10,20,17,0,tzinfo=timezone.utc))
  page.locator('[data-bank-tab=investments]').click();page.locator('[data-trade-side=sell]').click()
  page.locator('#tradeFund').select_option('SPY');page.locator('#tradeMode').select_option('shares');page.locator('#tradeAmount').fill('0.9');page.locator('#reviewTrade').click()
  assert 'secure a loan' in page.locator('#investNotice').inner_text()
  assert saved(page)['bank']['portfolio']['positions']['SPY']['units']==1000000
  page.locator('[data-bank-tab=loans]').click();page.locator('[data-loan-full="1"]').click();assert saved(page)['bank']['loans'][0]['balance']==0
  print('PASS low-credit collateral loan, 50% limit and early full payoff',flush=True)
  # An insolvent legacy save with poor credit can close and retain exports, then restart.
  s=copy.deepcopy(original);s['day']=9;s['bank']['loans']=[{'id':1,'principal':50,'interest':5,'total':55,'balance':55,'paid':0,'nextDue':6,'missedDue':[]}];s['bank']['loanSequence']=2;s['bank']['creditScore']=400;s['bank']['creditEstablished']=True
  load(page,s);assert page.locator('#startBtn').inner_text()=='Close Business';page.locator('#startBtn').click();assert saved(page)['closed']
  assert 'You made it to day 9!' in page.locator('#modalBody').inner_text();page.locator('#keepClosed').click()
  page.locator('#visitBank').click();assert page.locator('#bankScreen').is_hidden();page.locator('#ledgerBtn').click();assert page.locator('#exportExcel').is_visible();page.locator('#declineBooks').click()
  load(page,s);page.locator('#startBtn').click();page.locator('#restartBusiness').click();assert saved(page)['day']==1 and not saved(page).get('closed')
  s['bank']['creditScore']=740;load(page,s);assert page.locator('#startBtn').inner_text()!='Close Business';page.locator('#visitBank').click();page.locator('[data-bank-tab=loans]').click();page.locator('#rescueLoan').click();assert saved(page)['bank']['checking']==25;assert saved(page)['bank']['loans'][0]['balance']==82.5
  print('PASS insolvency, closure/export-only flow, restart, and good-credit $25 rescue',flush=True)
  # A full day uses the displayed recipe-adjusted visitors and persists chart metadata.
  s=copy.deepcopy(original);s.update(cash=100,inventory={'lemons':30,'sugar':30,'ice':50,'cups':60},lemonLots=[{'day':1,'qty':30}],recipe={'lemons':4.2,'sugar':3.1,'ice':5.3},purchasedRecipes=['good'])
  load(page,s);page.locator('[data-tab=results]').click();page.locator('#showProjection').check();assert 'projection' in page.locator('#dayDetails').inner_text().lower()
  expected=int(page.locator('#crowdLabel').inner_text().split(': ')[1]);page.locator('#startBtn').click();page.wait_for_function("JSON.parse(localStorage.getItem('lemonadeLane_bank_v3')).history.length===1",timeout=60000)
  history=saved(page)['history'][0];assert history['visitors']==expected;assert history['recipeBonus']==.1;assert history['location']=='neighborhood';assert history['sold']>0
  page.locator('#nextDay').click();page.locator('[data-tab=results]').click();page.locator('[data-result-day="1"]').first.click();assert 'Recipe boost 10%' in page.locator('#dayDetails').inner_text()
  print('PASS full gameplay day, actual recipe-adjusted arrivals, projections and point details',flush=True)
  assert not errors,errors
  print('PASS no JavaScript errors across all scenarios',flush=True);browser.close()
finally:server.terminate();server.wait()
