"""Regression checks for the user's second testing document and workbook layout."""
from pathlib import Path
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright
from browser_helpers import saved,load,capture_world
import subprocess,urllib.request,time,copy,openpyxl
ROOT=Path(__file__).resolve().parents[1]
server=subprocess.Popen(['python3','-m','http.server','8128','--bind','127.0.0.1','--directory',str(ROOT/'downloads')],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
BASE='http://127.0.0.1:8128/Lemonade-Lane.html'
try:
 for _ in range(50):
  try:urllib.request.urlopen(BASE);break
  except OSError:time.sleep(.1)
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1500,'height':1100});page.set_default_timeout(10000)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE);original=saved(page)
  # Delayed price feeds must not disable small dollar trades or charge sellers' checking.
  page.clock.set_fixed_time(datetime(2027,1,12,17,0,tzinfo=timezone.utc))
  s=copy.deepcopy(original);s['bank']['checking']=5.84;load(page,s)
  page.locator('#visitBank').click();page.locator('[data-bank-tab=investments]').click()
  assert 'last available' in page.locator('#investApp').inner_text()
  symbols=['DIA','SPY','ARKK','SGOV','GLD','SLV']
  for symbol in symbols:
   page.locator('[data-trade-side=buy]').click();page.locator('#tradeFund').select_option(symbol);page.locator('#tradeMode').select_option('dollars');page.locator('#tradeAmount').fill('1')
   assert page.locator('#reviewTrade').is_enabled();page.locator('#reviewTrade').click()
   assert '10.0%' in page.locator('.invest-fee-note').inner_text()
   assert '$0.10' in page.locator('.invest-confirmation').inner_text()
   page.locator('#confirmTrade').click();assert saved(page)['bank']['portfolio']['trades'][-1]['feeCents']==10
   assert saved(page)['bank']['portfolio']['trades'][-1]['priceDate']=='2026-10-19'
   page.locator('[data-trade-side=sell]').click();page.locator('#tradeAmount').fill('1');page.locator('#reviewTrade').click();page.locator('#confirmTrade').click()
   assert saved(page)['bank']['portfolio']['trades'][-1]['feeCents']==10
  assert saved(page)['bank']['checking']==4.64
  s=saved(page);s['bank']['checking']=0;s['bank']['portfolio']['positions']={'SPY':{'units':1000000,'costCents':76648,'lastPrice':766.48}}
  load(page,s);page.locator('#visitBank').click();page.locator('[data-bank-tab=investments]').click();page.locator('[data-trade-side=sell]').click();page.locator('#tradeFund').select_option('SPY');page.locator('#tradeMode').select_option('dollars');page.locator('#tradeAmount').fill('1');page.locator('#reviewTrade').click();page.locator('#confirmTrade').click()
  assert saved(page)['bank']['checking']==.9
  page.locator('[data-trade-side=buy]').click();page.locator('#tradeAmount').fill('1');page.locator('#reviewTrade').click()
  assert 'Not enough money in checking' in page.locator('#investNotice').inner_text()
  print('PASS last-known offline prices, all six $1 fund buys/sells, 10% fee, zero-checking sales, real insufficient-funds error',flush=True)
  # Owner tests must affect the ledger and be retained only for the tested mix/weather.
  s=copy.deepcopy(original);s.update(cash=2,recipe={'lemons':4.2,'sugar':3.1,'ice':5.3},purchasedRecipes=['good'])
  load(page,s);page.locator('[data-tab=recipe]').click()
  assert page.locator('#tasteHint').inner_text().startswith('Recipes can be bought at the Downtown Bookstore!')
  page.locator('#ownerTasteTest').click();assert saved(page)['cash']==1.5
  assert '7/10' in page.locator('#ownerTasteResult').inner_text()
  assert saved(page)['ledger'][-1]['expense']==.5
  page.reload();page.locator('[data-tab=recipe]').click();assert '7/10' in page.locator('#ownerTasteResult').inner_text()
  page.locator('[data-recipe=lemons][data-change="1"]').click();assert '7/10' not in page.locator('#ownerTasteResult').inner_text()
  s=copy.deepcopy(original);s['cash']=.49;load(page,s);page.locator('[data-tab=recipe]').click();assert page.locator('#ownerTasteTest').is_disabled()
  print('PASS paid owner tests, owned-recipe satisfaction, accounting and reload behavior',flush=True)
  # The original notification must accept a real mouse click and stay dismissed across redraw/reload.
  s=copy.deepcopy(original);s['day']=5;s['cash']=4;s['recipe']={'lemons':4.2,'sugar':3.1,'ice':5.3}
  load(page,s);notice=page.locator('#neighborhoodEvent');assert notice.is_visible();notice.get_by_role('button',name='OK',exact=True).click();assert notice.is_hidden()
  page.locator('[data-tab=recipe]').click();assert notice.is_hidden();page.reload();assert notice.is_hidden()
  capture_world(page);page.locator('[data-loc=neighborhood]').click()
  layout=page.evaluate('''()=>{const w=testWorld;return {houses:w.environment.userData.houses,trees:w.environment.children.filter(c=>c.name.startsWith('backyard-')).map(c=>c.userData.treeCount),rival:w.rivalPosition,position:w.rival.group.position}}''')
  assert len(layout['houses'])==4 and layout['trees']==[2,2,2,2]
  assert layout['rival']['x']==14.7 and layout['rival']['z']==-1.7
  page.screenshot(path='/tmp/lemon-part2-neighborhood.png',full_page=True)
  print('PASS notification dismissal and rebuilt neighborhood scene metadata',flush=True)
  # A full selling day must respect limited stock and expense only the actual prepared amount.
  s=copy.deepcopy(original);s.update(cash=4,pitchers=3,recipe={'lemons':4.2,'sugar':3.1,'ice':5.3},inventory={'lemons':12,'sugar':30,'ice':50,'cups':24},lemonLots=[{'day':1,'qty':12}])
  load(page,s);assert page.locator('#startBtn').is_enabled();assert '24 of 30' in page.locator('#validation').inner_text()
  page.locator('#startBtn').click();page.wait_for_function("JSON.parse(localStorage.getItem('lemonadeLane_bank_v3')).history.length===1",timeout=60000)
  state=saved(page);day=state['history'][0]
  assert day['capacity']==24 and day['sold']<=24 and day['cost']==11.64 and day['permit']==4
  assert state['inventory']['cups']==0 and state['inventory']['lemons']==1.92
  assert all(qty>=0 for qty in state['inventory'].values())
  page.locator('#nextDay').click();page.locator('#ledgerBtn').click()
  with page.expect_download() as result:page.locator('#exportExcel').click()
  book=openpyxl.load_workbook(open(result.value.path(),'rb'))
  income=book['Income Statement'];assert income['A7'].value=='Expenses' and income['A14'].value=='Net income / (loss)'
  assert income['A1'].font.bold and income.column_dimensions['A'].width>=34
  assert income['B13'].font.bold and income['B14'].border.bottom.style=='double' and '[Red]' in income['B14'].number_format
  assert income.freeze_panes=='B2' and income['B8'].value==11.64
  assert book['Balance Sheet']['A2'].value=='Assets' and book['Balance Sheet'].column_dimensions['A'].width>=58
  assert book['Statement of Cash Flow']['B1'].value.startswith('Totals as of Day')
  print('PASS limited-stock day, no negative inventory, correct costs, and independently verified formatted workbook',flush=True)
  # Opening with no stock is a permitted decision, with no invented sales or ingredient costs.
  s=copy.deepcopy(original);s.update(cash=4,recipe={'lemons':4,'sugar':3,'ice':5})
  load(page,s);assert page.locator('#startBtn').is_enabled();page.locator('#startBtn').click();page.wait_for_function("JSON.parse(localStorage.getItem('lemonadeLane_bank_v3')).history.length===1",timeout=60000)
  state=saved(page);day=state['history'][0];assert day['capacity']==0 and day['sold']==0 and day['cost']==0 and day['profit']==-4
  assert not errors,errors
  print('PASS zero-stock opening charges permit only; no JavaScript errors',flush=True);browser.close()
finally:server.terminate();server.wait()
