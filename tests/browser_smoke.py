"""Run with python3 tests/browser_smoke.py; needs Python Playwright + Chromium."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import subprocess,json,zipfile,tempfile,urllib.request,time
ROOT=Path(__file__).resolve().parents[1]
server=subprocess.Popen(['python3','-m','http.server','8124','--bind','127.0.0.1','--directory',str(ROOT/'downloads')],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
BASE='http://127.0.0.1:8124/Lemonade-Lane.html'
try:
 for _ in range(50):
  try: urllib.request.urlopen(BASE);break
  except OSError: time.sleep(.1)
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1440,'height':1100});errors=[];page.on('pageerror',lambda err:errors.append(str(err)))
  page.goto(BASE);page.wait_for_timeout(400)
  print('initial errors',errors)
  assert page.locator('#recipeLemons').inner_text()=='0.0'
  for loc in ['neighborhood','park','square','beach']:
   page.locator(f'[data-loc={loc}]').click()
   assert page.locator('#world3d canvas').count()==1
   page.get_by_role('button',name='Walk around',exact=True).click()
   before=json.loads(page.locator('#world3d').get_attribute('data-avatar-position'))
   page.locator('#world3d').press('KeyD',delay=250)
   after=json.loads(page.locator('#world3d').get_attribute('data-avatar-position'))
   assert before!=after,(loc,before,after)
   page.locator('#world3d').press('Escape')
  print('PASS: four voxel environments, walking and Escape controls')
  page.locator('#visitBank').click();page.locator('[data-bank-tab=loans]').click();page.get_by_role('button',name='Apply for $50.00',exact=True).click()
  page.locator('[data-transfer=withdraw][data-amount="25"]').click()
  page.reload();page.locator('#visitBank').click()
  assert page.locator('#bankChecking').inner_text()=='$25.00'
  assert page.locator('#bankDebt').inner_text()=='$55.00'
  page.locator('#returnToStand').click();page.locator('#ledgerBtn').click();page.locator('#declineBooks').click();assert 'show' not in page.locator('#modal').get_attribute('class')
  page.locator('#ledgerBtn').click()
  with page.expect_download() as dl: page.locator('#exportExcel').click()
  path=dl.value.path()
  with zipfile.ZipFile(path) as z:
   assert len([name for name in z.namelist() if name.startswith('xl/worksheets/')])==3
   from xml.etree import ElementTree as ET
   for name in z.namelist(): ET.fromstring(z.read(name))
  print('PASS: banking, save reload, Books Yes/No, three-sheet Excel ZIP and XML validation')
  assert not errors,errors
  browser.close()
finally: server.terminate();server.wait()
