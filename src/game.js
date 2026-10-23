import { Neighborhood } from './world.js';
import {CasinoDesk} from './casino-ui.js';
import { availableCups } from './capacity.js';
import {RECIPES,recipeBonus,securedLimit,originate,repay,emergencyEligible,emergencyTopup} from './business.js';
import {statements,downloadStatements} from './reports.js';
import {portfolioTotals,applyMarket} from './investments.js';
import {settleCollateral} from './secured-investments.js';
import { InvestmentDesk } from './investment-ui.js';
import {OnlineProfileStore,onlineAvailable,CLOUD_BACKUP_KEY} from './online-profiles.js';
import {LocalProfileStore,LEGACY_KEYS} from './profiles.js';
import {ProfileScreen,trapFocus} from './profile-screen.js';
import {appearanceFor} from './avatar.js';
import {activeUpgrades,equippedStand,equipUpgrade} from './equipment.js';
import {HOUSE_PRICE,DOWN_PAYMENT,monthlyPayment,downPaymentAssets,purchaseHouse,accrueMortgage,payMortgage,mortgagePayoff,validMortgageRate} from './mortgage.js';
import {MortgageRateClient} from './mortgage-rate-client.js';
import {demandFor,customerDecision,pricingFeedback} from './demand.js';
(function(){'use strict';
const root=document.getElementById('ll-app'); const $=id=>root.querySelector('#'+id);
const locs={neighborhood:{name:'Neighborhood',fee:4,foot:47,desc:'A familiar street, friendly neighbors, and your original lemonade stand.'},park:{name:'Park',fee:6,foot:47,desc:'Lower permit fee and steady family foot traffic. A forgiving place to start.'},square:{name:'Downtown',fee:9,foot:76,desc:'More people and higher spending power—but a pricier daily permit.'},beach:{name:'Waterfront',fee:17,foot:98,desc:'Huge crowds on hot days, but rainy days can be brutal.'}};
const supplies={lemons:{name:'Lemons',icon:'🍋',pack:12,price:6,unit:.5},sugar:{name:'Sugar scoops',icon:'🍬',pack:15,price:3,unit:.2},ice:{name:'Ice scoops',icon:'🧊',pack:30,price:3,unit:.1},cups:{name:'Paper cups',icon:'🥤',pack:20,price:3.2,unit:.16}};
const supplyTiers={lemons:[6,12,36],sugar:[10,30,60],ice:[50,200,500],cups:[12,24,60]};
const supplyNames={lemons:'Lemons',sugar:'Sugar',ice:'Ice cubes',cups:'Paper cups'};
const stockKeys=['lemons','sugar','ice','cups'];
let supplyCategory='lemons',pendingPacks=Object.fromEntries(stockKeys.map(k=>[k,[0,0,0]]));
const weatherPattern=[{icon:'☀️',name:'Sunny',temp:82,mult:1.12},{icon:'⛅',name:'Partly cloudy',temp:76,mult:.96},{icon:'🔥',name:'Hot & sunny',temp:93,mult:1.37},{icon:'🌧️',name:'Rainy',temp:62,mult:.57},{icon:'☀️',name:'Sunny',temp:85,mult:1.19},{icon:'🌤️',name:'Breezy',temp:73,mult:.9},{icon:'🔥',name:'Heat wave',temp:96,mult:1.48},{icon:'🌨️',name:'Snowy',temp:30,mult:.44}];
const money=v=>(v<0?'−':'')+'$'+Math.abs(v).toFixed(2), round=v=>Math.round(v*100)/100, clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const bankInitial=()=>({checking:0,investments:0,loans:[],creditScore:650,creditEstablished:false,onTime:0,missed:0,loanSequence:1});
const initial=()=>({version:5,upgrades:[],lemonLots:[],daySpoilage:{day:0,lemons:0,cost:0},day:1,cash:0,inventory:{lemons:0,sugar:0,ice:0,cups:0},recipe:{lemons:0,sugar:0,ice:0},purchasedRecipes:[],equipmentCosts:{},price:2.25,pitchers:2,location:'neighborhood',history:[],ledger:[],bank:bankInitial()});
function normalizeState(saved){const s=saved&&saved.inventory&&saved.ledger?saved:initial();if(!s.bank)s.bank=bankInitial();if((s.version||0)<5&&s.location==='park')s.location='neighborhood';s.version=5;if(!Array.isArray(s.upgrades))s.upgrades=[];if(!Array.isArray(s.lemonLots))s.lemonLots=[{day:s.day,qty:s.inventory.lemons||0}].filter(x=>x.qty>0);if(!s.daySpoilage)s.daySpoilage={day:0,lemons:0,cost:0};return s;}
let state=initial(),activeProfile=null,profileStore=null,profileScreen=null,profileBootError='',sessionPaused=false,saveBusy=false,runConfig=null,statusTimeout=null;
let upgradeIndex=0;let running=false,dayRun=null,interval=null,openingTimeout=null,closingTimeout=null,modalKind='',activeTab='location',activeBankTab='overview',currentScreen='stand',bankFeedback='',sceneView='outside';
const upgradeItems=[
 {id:'juicer',name:'High Output Citrus Juicer',price:49.99,icon:'🧃',desc:'Squeeze lemons much faster!',effect:'Cuts serving time by one step. Shorter lines mean fewer unhappy customers.'},
 {id:'powerjuicer',name:'Miracle 9000 Power Juicer',price:149.99,icon:'⚡',desc:'Lightning-fast lemon squeezing!',effect:'Cuts serving time another step; combines with other speed upgrades.'},
 {id:'shade',name:'ShadeMaker 3000 Canopy',price:129.99,icon:'⛱️',desc:'Give waiting customers some shade.',effect:'When equipped, customers wait longer before giving up. Also builds lasting price recognition.'},
 {id:'register',name:'EZserve Cash Register',price:249.99,icon:'🧮',desc:'Speed up every checkout.',effect:'Reduces service time so you can sell more cups during busy days.'},
 {id:'fridge',name:'Mr. Fridge',price:249.99,icon:'🧊',desc:'Keep lemons fresh, day after day!',effect:'Stops your lemon inventory from expiring after two days.'},
 {id:'icedispenser',name:'Ice-O-Matic Ice Dispenser',price:399.99,icon:'❄️',desc:'Make ice at your stand for free!',effect:'No more purchased ice required for your recipes, saving money.'},
 {id:'classic',name:'Classic Stand',price:449.99,icon:'🏪',desc:'Give your stand a popular new look.',effect:'Builds lasting price recognition. Adds an extra place in line when equipped.'},
 {id:'music',name:'High-Five Sound System',price:799.99,icon:'📻',desc:'Play music people notice.',effect:'Builds lasting price recognition. When equipped, helps win customers from competitors.'},
 {id:'lemonstand',name:'Lemon Stand',price:999.99,icon:'🍋',desc:'Turn your stand into a landmark.',effect:'Builds lasting price recognition. When equipped, helps win back customers from competitors.'},
 {id:'lights',name:'Bright Lights Neon System',price:1249.99,icon:'💡',desc:'Make your stand impossible to miss.',effect:'Builds lasting price recognition and, when equipped, helps win customers from competitors.'},
 {id:'dispenser',name:'Take2 Lemonade Dispenser',price:1599.99,icon:'🥤',desc:'Fill pitchers faster and serve sooner.',effect:'Reduces serving time significantly.'},
 {id:'icemaker',name:'High Output Automatic Ice Maker',price:2599.99,icon:'🧊',desc:'Never run out of ice again.',effect:'Makes all recipe ice for free and improves serving speed.'},
 {id:'castle',name:'Castle Stand',price:9999.99,icon:'🏰',desc:'The ultimate lemonade destination!',effect:'Strong price recognition. When equipped, serves faster with more queue space and more patient customers.'},
 {id:'starter',name:'Beginning Stand',price:0,icon:'🍹',desc:'Your original lemonade stand. Always available.',effect:'Return to your beginning stand without selling any purchased upgrades.'},
 {id:'house',name:'House',price:HOUSE_PRICE,icon:'🏡',desc:'The blue neighborhood home with rooftop solar panels. A place of your own!',effect:'Explore your living room, dining area, kitchen and bedroom. Pay outright or visit Bank → Loans for a 2% down mortgage.'}
];
const owns=id=>state.upgrades.includes(id);
const equipped=id=>activeUpgrades(state).includes(id);
function serviceSteps(){return clamp(5-(equipped('juicer')?1:0)-(equipped('powerjuicer')?1:0)-(equipped('register')?1:0)-(equipped('dispenser')?2:0)-(equipped('icemaker')?1:0)-(equipped('castle')?1:0),1,6)}
function queueLimit(){return 4+(equipped('classic')?1:0)+(equipped('castle')?3:0)}
function maxPatience(){return 8+(equipped('shade')?6:0)+(equipped('castle')?4:0)}
function hasIceMachine(){return equipped('icedispenser')||equipped('icemaker')}
function renderUpgrade(){
 const u=upgradeItems[upgradeIndex];if(!u)return;const owned=u.id==='starter'||owns(u.id),isHouse=u.id==='house',on=u.id==='starter'?equippedStand(state)==='starter':equipped(u.id);
 $('upgradeCard').innerHTML=`<div class="upgrade-heading"><div class="upgrade-art">${u.icon}</div><h3>${u.name}</h3></div>${owned&&!isHouse?`<label class="upgrade-equip"><input type="checkbox" id="equipUpgrade" data-equip-upgrade="${u.id}" ${on?'checked':''} ${running?'disabled':''}> Equip this upgrade</label>`:''}<p>${u.desc}</p><div class="upgrade-price">${money(u.price)}</div>${isHouse?'<p class="fine">Mortgage: $8,000 down, credit score above 660. See Bank → Loans for your dated rate quote and payment details.</p>':''}`;
 $('upgradeCount').textContent=`${upgradeIndex+1} / ${upgradeItems.length} upgrades`;$('upgradeBenefit').textContent='⭐ '+u.effect;
 const available=isHouse?state.cash+state.bank.checking:state.cash;$('buyUpgrade').hidden=u.id==='starter';$('buyUpgrade').disabled=owned||running||available+1e-7<u.price;$('buyUpgrade').textContent=owned?'✓ OWNED':available<u.price?'NEED '+money(u.price-available)+' MORE':isHouse?'BUY HOUSE · '+money(u.price):'BUY FOR '+money(u.price);
}
function buyUpgrade(){
 const u=upgradeItems[upgradeIndex];if(!u||u.id==='starter'||owns(u.id)||running)return;
 if(u.id==='house'){reviewHousePurchase(false);return}
 if(state.cash+1e-7<u.price)return;state.cash=round(state.cash-u.price);state.upgrades.push(u.id);equipUpgrade(state,u.id,true);world.audio.effect('purchase');state.equipmentCosts??={};state.equipmentCosts[u.id]=u.price;state.ledger.push({day:state.day,desc:'Purchased equipment: '+u.name,cash:-u.price,category:'equipment'});save();render();showEvent('⚙️ '+u.name+' installed!');
}
root.addEventListener('change',e=>{const id=e.target.dataset.equipUpgrade;if(!id||running||state.closed)return;equipUpgrade(state,id,e.target.checked);save();render();});
function showEvent(text){const e=$('neighborhoodEvent');if(state.dismissedEvents?.includes(state.day+':'+text)||state.dismissedEvent===state.day+':'+text)return;e.replaceChildren(document.createTextNode(text));const b=document.createElement('button');b.type='button';b.id='dismissEvent';b.textContent='OK';b.dataset.eventText=text;e.append(b);e.hidden=false;}
function competitionStrength(){if(state.day<4)return 0;const base=state.day<9?.18:.29;const defend=(equipped('classic')?.035:0)+(equipped('music')?.025:0)+(equipped('lemonstand')?.09:0)+(equipped('lights')?.035:0)+(equipped('castle')?.15:0);return clamp(base-defend,.02,.55)}
function syncNeighborhood(){world.updateState(state,weather());const comp=competitionStrength()>0;$('competitorStand').hidden=sceneView!=='outside'||!comp;$('rivalPrice').textContent=money(state.location==='beach'?2.75:state.location==='square'?2.5:2);$('playerStand').classList.toggle('fancy',equipped('classic')||equipped('lemonstand'));$('playerStand').classList.toggle('castle',equipped('castle'));$('playerStand').classList.toggle('fast',equipped('juicer')&&!equipped('classic'));$('districtTag').textContent=sceneDistrict();renderStandBadges();renderInterior();if(!running){$('queueDeck').innerHTML='';$('worldLiveStats').textContent=`🥤 ${serviceSteps()} serving steps · ${equipped('fridge')?'❄ Lemons protected':'🍋 Lemons last 2 days'}`;}if(comp){showEvent('⚔️ A competing stand moved nearby! Your pricing, service, and reputation matter now.')}else if(state.day===1){$('neighborhoodEvent').hidden=true;}setSceneView(sceneView)}
function renderQueue(){if(!dayRun)return;world.setQueue(dayRun.queue);const colors=['#698fbf','#dd8762','#ae85bd','#5eaa87','#e7ab57'];$('queueDeck').innerHTML=dayRun.queue.map((p,i)=>`<div class="queue-person" style="--shirt:${colors[i%colors.length]};--skin:${i%2?'#e4b286':'#b97c59'}" title="Waiting in line"></div>`).join('');$('worldLiveStats').textContent='👥 In line: '+dayRun.queue.length+'  ·  😠 Left upset: '+dayRun.leftUpset+'  ·  🥤 Sold: '+dayRun.sold;}
function popScene(kind){if(sceneView!=='outside')return;const el=document.createElement('div');el.className='walkaway-customer'+(kind==='rival'?' rival-walk':'');el.innerHTML='<span class="wc-mood">'+(kind==='rival'?'🪙':'😠')+'</span><span class="wc-head">'+(kind==='rival'?'☺':'⌢')+'</span><span class="wc-body"></span><span class="wc-legs"></span>';$('scene').appendChild(el);setTimeout(()=>el.remove(),2100)}
function sceneDistrict(){return state.location==='square'?'🏙️ BUSY BLOCK':state.location==='beach'?'🏖️ BOARDWALK':'🍋 YOUR STREET'}
function renderStandBadges(){const badges=[];if(equipped('lights'))badges.push('💡');if(equipped('music'))badges.push('📻');if(equipped('shade'))badges.push('⛱️');if(equipped('register'))badges.push('🧮');$('standBadges').innerHTML=badges.map(icon=>`<span>${icon}</span>`).join('')}
function renderInterior(){const equipment=[{icon:'🍹',name:'Pitcher station',desc:'Basic lemonade prep area.'}];if(equipped('juicer'))equipment.push({icon:'🧃',name:'Citrus juicer',desc:'Faster lemon prep.'});if(equipped('powerjuicer'))equipment.push({icon:'⚡',name:'Power juicer',desc:'Very fast lemon prep.'});if(equipped('register'))equipment.push({icon:'🧮',name:'Cash register',desc:'Quicker checkout.'});if(equipped('fridge'))equipment.push({icon:'🧊',name:'Mr. Fridge',desc:'Keeps lemons fresh.'});if(equipped('icedispenser'))equipment.push({icon:'❄️',name:'Ice dispenser',desc:'Makes recipe ice free.'});if(equipped('dispenser'))equipment.push({icon:'🥤',name:'Drink dispenser',desc:'Speeds up serving.'});if(equipped('icemaker'))equipment.push({icon:'🧊',name:'Auto ice maker',desc:'Plenty of ice on hand.'});if(equipped('castle'))equipment.push({icon:'🏰',name:'Castle build-out',desc:'Premium stand layout.'});if(equipped('music'))equipment.push({icon:'📻',name:'Sound system',desc:'Adds personality outside.'});if(equipped('lights'))equipment.push({icon:'💡',name:'Neon lights',desc:'Helps the stand get noticed.'});$('interiorEquipment').innerHTML=equipment.map(item=>`<div class="equip-card"><div class="equip-icon">${item.icon}</div><strong>${item.name}</strong><span>${item.desc}</span></div>`).join('');const storage=[['🍋','Lemons',Math.round(state.inventory.lemons)],['🍬','Sugar',Math.round(state.inventory.sugar)],['🧊','Ice',Math.round(state.inventory.ice)],['🥤','Cups',Math.round(state.inventory.cups)],['🍹','Can make',cupCapacity(state.inventory)]];$('interiorStorage').innerHTML=storage.map(([icon,label,qty])=>`<div class="storage-card"><div>${icon}</div><b>${qty}</b><span>${label}</span></div>`).join('');$('interiorCaption').textContent=(equipped('castle')?'Castle Stand':equipped('lemonstand')?'Landmark Lemon Stand':equipped('classic')?'Classic Stand':'Starter Stand')+' · inside view';$('insideStatus').textContent=`You can currently make ${cupCapacity(state.inventory)} cups. Service speed: ${serviceSteps()} step${serviceSteps()===1?'':'s'} per cup.`;renderStandBadges();$('insideShell').classList.toggle('castle',equipped('castle'));$('insideShell').classList.toggle('fancy',equipped('classic')||equipped('lemonstand'))}
function setSceneView(view){
 if(view==='firstperson'&&world.player?.style!=='classic')view='outside';
 if(view==='casino'&&state.location!=='square')view='outside';
 if(view==='home'&&(!owns('house')||state.location!=='neighborhood'))view='outside';
 sceneView=view==='casino'?'casino':view==='home'?'home':view==='firstperson'?'firstperson':view==='inside'?'inside':view==='exterior'?'exterior':'outside';
 $('scene').dataset.view=sceneView;
 world.setView(sceneView==='casino'?'casino':sceneView==='home'?'home':sceneView==='firstperson'?'firstperson':sceneView==='outside'?'neighborhood':sceneView==='inside'?'interior':'exterior');
 for(const b of root.querySelectorAll('[data-scene-view]')){const on=b.dataset.sceneView===sceneView;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));}
 $('sceneBack').hidden=sceneView==='outside';
 renderInterior();
}

function syncLots(){let qty=round(state.lemonLots.reduce((a,b)=>a+b.qty,0));let missing=round(state.inventory.lemons-qty);if(missing>.001)state.lemonLots.push({day:state.day,qty:missing});if(missing<-.001){let excess=-missing;for(const b of state.lemonLots){let cut=Math.min(b.qty,excess);b.qty=round(b.qty-cut);excess=round(excess-cut);if(excess<=0)break;}state.lemonLots=state.lemonLots.filter(x=>x.qty>.001)}}
function spendLemons(count){syncLots();let left=round(count);state.lemonLots.sort((a,b)=>a.day-b.day);for(const batch of state.lemonLots){const use=Math.min(left,batch.qty);batch.qty=round(batch.qty-use);left=round(left-use);if(left<=0)break}state.lemonLots=state.lemonLots.filter(x=>x.qty>.001);state.inventory.lemons=round(Math.max(0,state.inventory.lemons-count))}
function expireOldLemons(){if(equipped('fridge')){state.daySpoilage={day:state.day,lemons:0,cost:0};return}syncLots();let spoiled=0;for(const b of state.lemonLots){if(state.day-b.day>=2){spoiled=round(spoiled+b.qty);b.qty=0}}state.lemonLots=state.lemonLots.filter(b=>b.qty>.001);spoiled=Math.min(spoiled,state.inventory.lemons);state.inventory.lemons=round(Math.max(0,state.inventory.lemons-spoiled));state.daySpoilage={day:state.day,lemons:spoiled,cost:round(spoiled*supplies.lemons.unit)};if(spoiled)state.ledger.push({day:state.day,desc:spoiled+' lemons expired (inventory write-off)',cash:0,category:'spoilage',expense:state.daySpoilage.cost})}

function save(){
 if(!activeProfile)return false;
 if(running&&dayRun&&runConfig)state.session={dayRun, ...runConfig};else delete state.session;
 state.playerView=world.avatarController?.snapshot(sceneView);
 try{
  activeProfile=profileStore.save(activeProfile.id,state,state.bank.portfolio?.marketDate||investmentDesk.market.data?.asOf);
  // A compatibility mirror supports older releases; all new loads use slots.
  try{localStorage.setItem(LEGACY_KEYS[0],JSON.stringify(state))}catch{}
  return true;
 }catch(error){notifySave(profileStore.online?error.message:'Could not save. Keep this game open and allow browser storage, then try again.');return false;}
}
function notifySave(text){const el=$('saveStatus');clearTimeout(statusTimeout);el.textContent=text;el.hidden=false;statusTimeout=setTimeout(()=>{el.hidden=true},8000);}
function activeLoan(){return state.bank.loans.find(loan=>loan.balance>0.001)}
function scoreLabel(){return !state.bank.creditEstablished?'Not established':state.bank.creditScore>=720?'Excellent':state.bank.creditScore>=670?'Good':state.bank.creditScore>=620?'Fair':'Needs improvement'}
function dueSoon(){return (state.bank.mortgage?.balance>0&&state.day>=state.bank.mortgage.nextDue-2)||state.bank.loans.some(loan=>loan.balance>0&&state.day>=loan.nextDue-2)}
function loanMax(){const b=state.bank;if(!b.loans.length)return 100;if(b.onTime<3||b.creditScore<620)return 0;return b.creditScore>=780?3000:b.creditScore>=720?1500:b.creditScore>=670?500:250}

function loanPayment(loan){return Math.min(loan.balance, round(loan.total/5))}
function bankNotify(msg,error=false){bankFeedback=msg;$('bankMessage').textContent=msg;$('bankMessage').hidden=false;$('bankMessage').classList.toggle('error',error)}
function bankNav(tab){activeBankTab=tab;for(const b of root.querySelectorAll('[data-bank-tab]')){const on=b.dataset.bankTab===tab;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on))}for(const pane of root.querySelectorAll('[data-bank-pane]'))pane.hidden=pane.dataset.bankPane!==tab;renderBank();investmentDesk.setVisible(tab==='investments'&&currentScreen==='bank');if(tab==='investments')investmentDesk.open();if(tab==='loans')mortgageRates.refresh(()=>{if(activeProfile)renderBank()})}
function showScreen(screen,tab){if(screen!=='bank')investmentDesk.setVisible(false);currentScreen=screen;$('standScreen').hidden=screen!=='stand';$('bankScreen').hidden=screen!=='bank';$('cupCapacityBanner').hidden=screen!=='stand';if(screen==='bank'){bankFeedback='';$('bankMessage').hidden=true;bankNav(tab||activeBankTab)}else render();window.scrollTo({top:0,behavior:'instant'})}
function applyLoan(amount,secured=false){if(running||state.closed)return;const max=secured?securedLimit(state,investmentDesk.value()):loanMax();if(!Number.isFinite(amount)||amount<1||amount>max||(!secured&&activeLoan())||(secured&&state.bank.loans.some(l=>l.secured&&l.balance>0))){bankNotify('This loan is unavailable. Check your borrowing limit and existing loans.',true);return}originate(state,amount,secured);save();render();bankNav('overview');bankNotify(money(amount)+' credited to checking. Total term interest is 10%; five payments every five game days.');}
function transfer(direction,requested){if(running){bankNotify('Finish your business day before moving money.',true);return}let bank=state.bank;let available=direction==='withdraw'?bank.checking:state.cash;let amount=requested==='all'?available:Number(requested);amount=round(amount);if(amount<=0||!Number.isFinite(amount)||amount>available+.000001){bankNotify('There isn’t enough money in that account for this transfer.',true);return}if(direction==='withdraw'){bank.checking=round(bank.checking-amount);state.cash=round(state.cash+amount)}else{bank.checking=round(bank.checking+amount);state.cash=round(state.cash-amount)}state.ledger.push({day:state.day,desc:direction==='withdraw'?'Withdrew '+money(amount)+' to stand':'Deposited '+money(amount)+' at bank',category:'transfer',cash:direction==='withdraw'?amount:-amount,bankChange:direction==='withdraw'?-amount:amount});save();render();bankNotify(direction==='withdraw'?money(amount)+' moved to your stand. You can now buy supplies.':money(amount)+' deposited in checking.')}
function makeLoanPayment(id,full=false){const loan=state.bank.loans.find(l=>l.id===id&&l.balance>0)||activeLoan();if(!loan||running)return;if(!full&&state.day<loan.nextDue-2){bankNotify('Payment window opens Day '+(loan.nextDue-2)+'.',true);return}try{const amount=repay(state,loan,full);save();render();bankNotify(money(amount)+' paid'+(loan.balance===0?' — loan paid in full!':'.'))}catch(e){bankNotify(e.message,true)}}
function reviewDueDate(){accrueMortgage(state);for(const loan of state.bank.loans.filter(l=>l.balance>0)){loan.missedDue??=[];if(state.day>loan.nextDue&&!loan.missedDue.includes(loan.nextDue)){loan.missedDue.push(loan.nextDue);state.bank.missed++;state.bank.creditEstablished=true;state.bank.creditScore=clamp(state.bank.creditScore-35,300,850);state.ledger.push({day:state.day,desc:'Missed loan #'+loan.id+' payment due Day '+loan.nextDue,category:'credit',cash:0});if(loan.secured)loan.collateralDue=true;}if(loan.secured&&loan.collateralDue){const result=settleCollateral(state,loan,investmentDesk.market.data);if(result)showEvent(result);}}}
function renderBank(){const bank=state.bank,loan=activeLoan();bank.investments=investmentDesk.value();investmentDesk.render();$('bankDay').textContent='DAY '+state.day;$('bankChecking').textContent=money(bank.checking);$('bankDebt').textContent=money(loan?loan.balance:0);$('bankInvestments').textContent=money(bank.investments);$('bankStandCash').textContent=money(state.cash);$('bankAccountCash').textContent=money(bank.checking);$('creditScore').textContent=bank.creditEstablished?bank.creditScore:'—';$('creditCaption').textContent=scoreLabel();$('creditStats').textContent=bank.onTime+' on time · '+bank.missed+' missed';$('creditFill').style.width=bank.creditEstablished?((bank.creditScore-300)/550*100)+'%':'0%';$('bankAlert').textContent=dueSoon()?'PAYMENT!':'';$('loanTabAlert').textContent=dueSoon()?'●':'';for(const b of root.querySelectorAll('[data-transfer]')){let a=b.dataset.amount,avail=b.dataset.transfer==='withdraw'?bank.checking:state.cash;b.disabled=running||avail<=0||(a!=='all'&&avail<Number(a))}
 const loans=bank.loans.filter(l=>l.balance>0),limit=securedLimit(state,bank.investments);
 $('bankDebt').textContent=money(loans.reduce((v,l)=>v+l.balance,0)+(bank.mortgage?.balance||0));
 $('loanArea').innerHTML=loans.map(l=>`<div class="active-loan"><h4>Loan #${l.id} · ${l.secured?'Investment-secured':'Business'} · ${money(l.principal)} borrowed</h4><p>Balance ${money(l.balance)} · next installment ${money(loanPayment(l))} due Day ${l.nextDue}.<br>10% interest for the whole 25-game-day term.</p>${l.collateralDue?'<p class="error">Overdue: collateral sale pending fresh prior-close prices. New investments and collateral sales are paused.</p>':''}<button type="button" data-loan-pay="${l.id}" ${running||bank.checking<loanPayment(l)||state.day<l.nextDue-2?'disabled':''}>Pay installment ${money(loanPayment(l))}</button> <button type="button" data-loan-full="${l.id}" ${running||bank.checking<l.balance?'disabled':''}>Pay in full · ${money(l.balance)}</button>${l.secured?` <button type="button" data-loan-collateral="${l.id}" ${running||bank.investments<=0?'disabled':''}>Use investments to repay</button><p class="fine">Sell only the collateral needed to repay this loan. Ordinary trading fees apply; no collection fee for an on-time voluntary payoff. If collateral is insufficient, all sale proceeds reduce the balance.</p>`:''}</div>`).join('')+
 (!loans.length&&loanMax()?`<h4>Choose a business loan</h4><div class="loan-choices">${[...new Set([Math.min(50,loanMax()),Math.min(75,loanMax()),loanMax()])].map(a=>`<div class="loan-choice"><strong>${money(a)}</strong><p>10% total interest · 5 installments every 5 game days</p><button type="button" data-loan-apply="${a}" ${running?'disabled':''}>Apply for ${money(a)}</button></div>`).join('')}</div>`:'')+
 `<div class="active-loan"><p class="fine">First-time business loans need no credit history. Later unsecured loans require 3 on-time payments and a credit score of at least 620; repay existing loans first.</p><h4>Borrow against investments</h4><p>Minimum portfolio $100. Borrow up to ${Math.round((state.collateralRatio??.5)*100)}% of its current value, capped at $10,000, regardless of credit score. Your cash and checking remain available. Limit now: ${money(limit)}.</p><p>10% term interest, five installments every five game days. A missed installment lowers credit and sells enough pledged investments at the latest prior close to cover the installment plus a 1% collection fee (minimum $1), plus the usual 0.5% trading fee. Collateral cannot be sold voluntarily until repaid.</p>${limit&&!loans.some(l=>l.secured)?`<label>Loan amount $ <input id="securedAmount" type="number" min="1" max="${limit}" step="0.01" value="${limit}"></label><button type="button" id="applySecured" ${running?'disabled':''}>Apply for secured loan</button>`:''}</div>`+
 renderMortgage()+
 (emergencyEligible(state)&&exhaustedAssets()?'<button type="button" id="emergencyLoan">Add emergency $25 to existing loan ($2.50 interest)</button>':'');
}

let houseReview=null;
function renderMortgage(){
 const m=state.bank.mortgage,quote=mortgageRates.data,owned=owns('house'),liquid=round(state.cash+state.bank.checking),assets=downPaymentAssets(state,investmentDesk.market.data),valid=validMortgageRate(quote);
 const details='<p class="fine">30-year fixed mortgage: 360 monthly payments, one payment every 10 game days. Principal and interest only; this educational mortgage does not add taxes, insurance or PMI. Payments use checking first, then stand cash. No prepayment fee.</p>';
 if(m?.balance>0)return `<div class="active-loan mortgage-summary" id="mortgageArea"><h4>House mortgage</h4><p>House owned · $400,000 purchase price<br>Fixed rate ${m.rate.toFixed(2)}% · quoted ${m.rateDate}<br>Principal ${money(m.principal)} · unpaid interest ${money(m.accruedInterest)}<br>Monthly payment ${money(m.payment)} · due Day ${m.nextDue} · ${m.paid} of 360 payments made</p>${details}<button type="button" id="payMortgage" ${running||state.day<m.nextDue||liquid<Math.min(m.balance,m.paid>=359?m.balance:m.payment)?'disabled':''}>Pay due installment</button> <button type="button" id="payoffMortgage" ${running||liquid<mortgagePayoff(state)?'disabled':''}>Pay off mortgage · ${money(mortgagePayoff(state))}</button></div>`;
 if(owned)return '<div class="active-loan" id="mortgageArea"><h4>House</h4><p>Your house is owned outright. No mortgage balance.</p></div>';
 return `<div class="active-loan mortgage-summary" id="mortgageArea"><h4>House · $400,000</h4><p>Blue home with rooftop solar panels in the Neighborhood. Down payment: <strong>$8,000 (2%)</strong>. Mortgage: $392,000. Credit score must be <strong>above 660</strong>; yours is ${state.bank.creditScore}.</p><p>Available cash, checking and unpledged investments after estimated sale fees: ${money(assets)}. Any investments needed for the down payment are sold at verified current closes, with the usual 0.5% trading fee. Pledged investments cannot be reused.</p>${valid?`<p>30-year fixed rate: <strong>${quote.rate.toFixed(2)}%</strong> · as of ${quote.asOf}<br>Freddie Mac PMMS · 30-year fixed · via FRED<br>Monthly principal and interest: <strong>${money(monthlyPayment(392000,quote.rate))}</strong></p>`:`<p>${mortgageRates.loading?'Loading the latest published mortgage rate…':'A recent mortgage rate is unavailable. Refresh the rate to apply; no unverified rate will be used.'}</p>`}${details}<button type="button" id="refreshMortgageRate" ${mortgageRates.loading?'disabled':''}>Refresh mortgage rate</button> <button type="button" id="applyMortgage" ${running||!valid||state.bank.creditScore<=660||assets<DOWN_PAYMENT?'disabled':''}>Review mortgage & house purchase</button> <button type="button" id="buyHouseOutright" ${running||liquid<HOUSE_PRICE?'disabled':''}>Buy outright · $400,000</button></div>`;
}
function reviewHousePurchase(mortgage){
 if(running||state.closed||owns('house'))return;
 houseReview={mortgage,quote:mortgageRates.data?{...mortgageRates.data}:null};
 const q=houseReview.quote;modalKind='house';$('modalBody').innerHTML=`<h2>Purchase your house?</h2><p>Price: $400,000.</p>${mortgage?`<p>$8,000 down payment. Checking and stand cash are used first; only the remaining amount is raised from unpledged investments, including trading fees.</p><p>$392,000 mortgage · ${q?.rate.toFixed(2)}% fixed · quote ${q?.asOf}<br>360 payments of ${money(monthlyPayment(392000,q?.rate||0))}, due every 10 game days, starting Day ${state.day+10}. Final payment adjusts for rounding. Taxes, insurance and PMI are excluded.</p>`:'<p>$400,000 will be taken from checking and stand cash. No mortgage.</p>'}<p>You will own the blue Neighborhood home with rooftop solar panels.</p><button type="button" id="confirmHousePurchase" class="primary">Confirm house purchase</button> <button type="button" id="cancelHousePurchase">Cancel</button>`;openModal();
}
function confirmHousePurchase(){
 if(running||modalKind!=='house'||!houseReview)return;
 try{purchaseHouse(state,{...houseReview,market:investmentDesk.market.data});houseReview=null;world.audio.effect('purchase');closeModal();save();render();bankNotify('House purchased! Walk to the blue solar-panel house in the Neighborhood and click its front door.');showEvent('🏡 Your house is ready! Walk to the front door to enter.')}catch(e){closeModal();bankNotify(e.message,true);}
}
function mortgagePayment(full){if(running||state.closed)return;try{const amount=payMortgage(state,full);save();render();bankNotify(money(amount)+(state.bank.mortgage.balance===0?' paid — mortgage paid in full!':' mortgage payment recorded.'))}catch(e){bankNotify(e.message,true)}}

function weather(){return weatherPattern[(state.day-1)%weatherPattern.length]}
function baseTraffic(){let l=locs[state.location], w=weather();return Math.max(9,Math.round(l.foot*(state.location==='beach'&&w.name==='Rainy'?.54:w.mult)))}
function quality(){if(recipeBonus(state))return 1;let r=state.recipe;return clamp(1-(Math.abs(r.lemons-4)*.075+Math.abs(r.sugar-3)*.09+Math.abs(r.ice-(weather().temp>=90?6:5))*.025),.42,1)}
function traffic(){return Math.round(baseTraffic()*(1+recipeBonus(state)))}
function recipeCost(){let r=state.recipe;return r.lemons*.5+r.sugar*.2+(hasIceMachine()?0:r.ice*.1)+10*.16}
function totalBrewCost(){return round(recipeCost()*state.pitchers)}
function maxCups(){return state.pitchers*10}
function enough(){let missing=[];for(const key of Object.keys(state.recipe)){if(!(key==='ice'&&hasIceMachine())&&state.inventory[key]<state.recipe[key]*state.pitchers)missing.push(supplies[key].name)}if(state.inventory.cups<10*state.pitchers)missing.push('Paper cups');return missing}
function feasible(){if(state.closed)return 'This business is closed. Your Books remain available.';if(Object.values(state.recipe).some(n=>n<=0))return 'Choose a recipe with lemons, sugar and ice before opening.';if(state.cash===0&&Object.values(state.inventory).every(count=>count===0))return state.bank.checking>0?'Your money is in checking. Visit the Bank → Account and withdraw some cash for supplies.':investmentDesk.value()>0?'Visit the Bank to sell investments, or use pledged investments to repay their loan on the Loans tab.':state.upgrades.length?'Walk to Maple Market to sell equipment for 50% of its original purchase price.':emergencyEligible(state)?'Good credit qualifies you for an emergency $25 top-up. Visit Bank → Loans.':'You have $0 at the stand. Visit the Bank → Loans to borrow startup money, then withdraw it for supplies.';if(state.cash<locs[state.location].fee)return 'Not enough cash to pay this location’s permit.';const missing=enough();return missing.length?'Buy more '+missing.join(', ')+' before opening.':''}
function tasteText(){const bonus=recipeBonus(state);if(bonus)return '⭐ Recipe match! '+Math.round(bonus*100)+'% more visitors. You may change the mix to save costs.';let q=quality();if(q>.95)return '⭐ Customer taste test: Delicious! Nicely balanced for the weather.';if(q>.83)return '👍 Customer taste test: Pretty good, but the mix could be better.';if(q>.68)return '😐 Customer taste test: A little off. Try adjusting your ingredients.';return '😬 Customer taste test: Too sour, too sweet, or not refreshing enough.'}
function countDisplay(n){return Number(n.toFixed(2)).toLocaleString('en-US',{maximumFractionDigits:1})}
function cupCapacity(inventory,recipe=state.recipe){
 return availableCups(inventory,recipe,hasIceMachine());
}
function updateCapacityAndStocks(){
 world.updateState(state,weather());
 for(const key of stockKeys){const el=$('stock'+key[0].toUpperCase()+key.slice(1));if(el)el.textContent=countDisplay(state.inventory[key]);}
 $('cupCapacity').textContent=cupCapacity(state.inventory).toLocaleString('en-US');
}
function cartInfo(){
 const added={lemons:0,sugar:0,ice:0,cups:0};let cost=0,packs=0;
 for(const key of stockKeys)for(let i=0;i<3;i++){
  const count=pendingPacks[key][i];packs+=count;added[key]+=count*supplyTiers[key][i];cost+=count*supplyTiers[key][i]*supplies[key].unit;
 }
 return {added,cost:round(cost),packs,after:Object.fromEntries(stockKeys.map(k=>[k,round(state.inventory[k]+added[k])]))};
}
function renderInventory(){
 const tabs=$('supplyCategories');tabs.innerHTML=stockKeys.map(key=>`<button type="button" role="tab" class="supply-category" data-supply-category="${key}" aria-selected="${String(supplyCategory===key)}"><span class="icon">${supplies[key].icon}</span><span>${supplyNames[key]}</span></button>`).join('');
 $('inventory').innerHTML=supplyTiers[supplyCategory].map((qty,i)=>`<div class="classic-supply-row"><div class="classic-pack-icon">${supplies[supplyCategory].icon}</div><div class="classic-pack-info">${qty.toLocaleString('en-US')} ${supplyCategory==='lemons'?'lemons':supplyCategory==='cups'?'cups':supplyCategory==='ice'?'cubes':'scoops'}<small>${money(round(qty*supplies[supplyCategory].unit))} per pack</small></div><button type="button" class="classic-stepper" data-supply-step="-1" data-tier="${i}" aria-label="Remove a ${qty}-item package" ${pendingPacks[supplyCategory][i]===0||running?'disabled':''}>−</button><strong class="classic-pack-count" aria-label="Selected packages">${pendingPacks[supplyCategory][i]}</strong><button type="button" class="classic-stepper" data-supply-step="1" data-tier="${i}" aria-label="Add a ${qty}-item package" ${pendingPacks[supplyCategory][i]>=25||running?'disabled':''}>+</button></div>`).join('');
 const cart=cartInfo();$('supplyCartCount').textContent=cart.packs+' package'+(cart.packs===1?'':'s');$('supplyCartTotal').textContent=money(cart.cost);$('supplyAvailable').textContent='Stand cash: '+money(state.cash)+(cart.cost>state.cash+1e-6?' · Need '+money(cart.cost-state.cash)+' more':'');
 $('reviewSupplies').disabled=running||cart.packs===0;$('clearSupplyCart').disabled=running||cart.packs===0;
}
function stepSupply(tier,delta){if(running)return;let qty=pendingPacks[supplyCategory][tier];pendingPacks[supplyCategory][tier]=clamp(qty+delta,0,25);renderInventory()}
function clearSupplyCart(){pendingPacks=Object.fromEntries(stockKeys.map(k=>[k,[0,0,0]]));renderInventory()}
function reviewSupplies(){if(running)return;const cart=cartInfo();if(!cart.packs)return;modalKind='supplies';const canAfford=cart.cost<=state.cash+1e-6;const before=cupCapacity(state.inventory),after=cupCapacity(cart.after);
 $('modalBody').innerHTML=`<div class="kicker">SUPPLY STORE · REVIEW ORDER</div><h2>📦 Confirm your supplies</h2><p>Review what you already own, what you are adding, and your inventory <strong>after</strong> the purchase.</p><table class="supply-review-table"><thead><tr><th>SUPPLY</th><th>ON HAND</th><th>ADDING</th><th>NEW TOTAL</th></tr></thead><tbody>${stockKeys.map(key=>`<tr><td>${supplies[key].icon} ${supplyNames[key]}</td><td>${countDisplay(state.inventory[key])}</td><td class="adding">+${countDisplay(cart.added[key])}</td><td>${countDisplay(cart.after[key])}</td></tr>`).join('')}</tbody></table><div class="supply-capacity-result"><div class="capacity-label">TOTAL NUMBER OF CUPS YOU'RE ABLE TO MAKE WITH THIS INVENTORY</div><div class="capacity-result-numbers"><div><b>${before}</b><br><small>BEFORE</small></div><span class="arrow">→</span><div><b>${after}</b><br><small>AFTER PURCHASE</small></div></div></div><p><strong>Order cost: ${money(cart.cost)}</strong><br>Cash on hand: ${money(state.cash)}<br>Cash after purchase: ${money(state.cash-cart.cost)}</p>${canAfford?'':'<div class="notice">Not enough money at the stand for this order. You can change your quantities or withdraw money from the bank.</div>'}<div class="supply-modal-actions"><button type="button" class="cancel-buy" id="cancelSupplyPurchase">Cancel</button><button type="button" class="confirm-buy" id="confirmSupplyPurchase" ${!canAfford?'disabled':''}>✓ Confirm Purchase</button></div>`;openModal();
}
function confirmSupplyPurchase(){if(running||modalKind!=='supplies')return;const cart=cartInfo();if(cart.packs===0||cart.cost>state.cash+1e-6){reviewSupplies();return}state.cash=round(state.cash-cart.cost);for(const key of stockKeys){state.inventory[key]=round(state.inventory[key]+cart.added[key]);if(key==='lemons'&&cart.added[key])state.lemonLots.push({day:state.day,qty:cart.added[key]});if(cart.added[key])state.ledger.push({day:state.day,desc:'Bought '+cart.added[key]+' '+supplyNames[key].toLowerCase(),cash:-round(cart.added[key]*supplies[key].unit),category:'supplies'})}clearSupplyCart();save();closeModal();render()}
function useInventoryForCups(cups){for(const key of stockKeys){if(key==='ice'&&hasIceMachine())continue;const amount=key==='cups'?cups:state.recipe[key]*cups/10;if(key==='lemons')spendLemons(amount);else state.inventory[key]=Math.max(0,round(state.inventory[key]-amount));}}

function renderHistory(){renderResults();}
function activateTab(tab){
 activeTab=tab;
 for(const button of root.querySelectorAll('[data-tab]')){
  const on=button.dataset.tab===tab;
  button.classList.toggle('active',on);
  button.setAttribute('aria-selected',String(on));
  button.tabIndex=on?0:-1;
 }
 for(const pane of root.querySelectorAll('[data-pane]'))pane.hidden=pane.dataset.pane!==tab;
 const names={location:'Choose a spot',recipe:'Mix your recipe',price:'Set your price',supplies:'Buy supplies',upgrades:'Business upgrades',results:'Results & Projections'};
 $('panelTitle').textContent=names[tab];
}
function render(){
 const w=weather(),l=locs[state.location];
 $('standScreen').inert=Boolean(state.closed);$('bankScreen').inert=Boolean(state.closed);$('helpBtn').disabled=Boolean(state.closed);
 $('dayPill').textContent='DAY '+state.day;
 $('cashHead').textContent=money(state.cash);
 $('weatherLabel').textContent=w.icon+' '+w.name+' · '+w.temp+'°F';
 $('crowdLabel').textContent='Expected Visitors: '+traffic();
 $('scene').classList.toggle('rain',w.name==='Rainy');
 $('scene').dataset.location=state.location;
 $('standPrice').textContent=money(state.price)+' / CUP';
 $('feeBadge').textContent=money(l.fee)+' permit';
 $('placeName').textContent=l.name;
 const sceneName=state.location==='beach'?'Waterfront':state.location==='square'?'Downtown':state.location==='park'?'Park':'Neighborhood';
 $('areaHeading').textContent=sceneName==='Downtown'||sceneName==='Waterfront'?sceneName.toUpperCase():'THE '+sceneName.toUpperCase();
 root.querySelector('[data-scene-view=outside]').textContent=sceneName;
 $('sceneBack').textContent='← Back to '+sceneName.toLowerCase();
 $('locationHint').textContent=l.desc;
 $('priceValue').textContent=money(state.price);
 $('pitcherValue').textContent=state.pitchers;
 for(const x of ['lemons','sugar','ice'])$('recipe'+x[0].toUpperCase()+x.slice(1)).value=state.recipe[x].toFixed(1);
 $('tasteHint').textContent=tasteText();
 $('planCups').textContent=maxCups();
 $('planCost').textContent=money(totalBrewCost());
 $('planMax').textContent=money(maxCups()*state.price-totalBrewCost()-l.fee);
 const minCups=Math.ceil((totalBrewCost()+l.fee)/state.price);
 $('breakEven').textContent='Sell '+minCups+' cups to break even';
 for(const btn of root.querySelectorAll('[data-loc]'))btn.classList.toggle('active',btn.dataset.loc===state.location);
 updateCapacityAndStocks();
 renderInventory();renderHistory();renderBank();renderUpgrade();syncNeighborhood();
 if(!running){
  const err=feasible();$('validation').style.display=err?'block':'none';$('validation').textContent=err;
  const alreadyDone=state.history.some(d=>d.day===state.day);
  $('startBtn').disabled=Boolean(err)||alreadyDone;
  $('startBtn').textContent=alreadyDone?'Day finished ✓':'▶ START DAY';
  $('phaseLabel').dataset.closed=String(Boolean(state.closed));$('phaseLabel').textContent=state.closed?'BUSINESS CLOSED':alreadyDone?'DAY FINISHED':'READY TO OPEN';
  const failed=canClose();if(failed){$('validation').style.display='block';$('validation').textContent='Your remaining funds cannot cover the least expensive restart, and no saleable assets or credit remain. Close Business to see your final results.'}$('startBtn').disabled=state.closed||(!failed&&(Boolean(err)||alreadyDone));$('startBtn').textContent=state.closed?'Business closed':failed?'Close Business':alreadyDone?'Day finished ✓':'▶ START DAY';
  $('sceneTitle').textContent=state.history.length?'Ready for another day?':'Your lemonade stand';
  $('sceneDescription').textContent=state.history.length?'Change your plan and see what happens.':'Make your choices, then start selling!';
  if(alreadyDone&&!failed){$('validation').style.display='block';$('validation').textContent='This day is finished. Use Results to start the next day.';}
 }
 if(sceneView==='home'){$('sceneDescription').textContent='Your house · WASD / arrows to move · Drag to look';}
 if(sceneView==='inside'||sceneView==='firstperson'){
  $('sceneTitle').textContent='Inside your stand';
  $('sceneDescription').textContent='See your workspace, upgrades, and inventory storage. Click back outside whenever you want.';
 } else if(activeTab==='upgrades' && !running) {
  $('sceneDescription').textContent='Click on your stand to pop inside and see how new equipment changes the business.';
 }
 if(!dayRun){
  const last=state.history[state.history.length-1];
  $('scoreVisitors').textContent=last?last.visitors:'—';
  $('scoreSold').textContent=last?last.sold:'—';
  $('scoreRevenue').textContent=last?money(last.revenue):'—';
  $('scoreProfit').textContent=last?money(last.profit):'—';
  $('scoreProfit').className=last?(last.profit<0?'negative':'profit'):'';
  $('latestResult').textContent=last?'Day '+last.day+' · '+(last.profit>=0?'You made '+money(last.profit)+'!':'You lost '+money(-last.profit)+'.'):'Finish your first day to see your results.';
  $('resultNext').hidden=!(last&&last.day===state.day);$('competitionResults').textContent=last?`😠 ${last.leftUpset||0} customers left upset · ⚔️ ${last.lostCompetitor||0} chose a competitor · ⏳ Served each cup in ${last.serviceSteps||5} steps`:'Long lines can cost you sales. Faster equipment and patient customers help.';
 }
}
function setRecipe(key,delta){if(running)return;let maxs={lemons:10,sugar:10,ice:12};state.recipe[key]=round(clamp(state.recipe[key]+delta/10,0,maxs[key]));save();render()}
function setVar(key,delta){if(running)return;if(key==='pitchers')state.pitchers=clamp(state.pitchers+delta,1,12);else state.price=round(clamp(state.price+.25*delta,.75,5));save();render()}
function plannedDemand(){return demandFor({price:state.price,weather:weather(),location:state.location,quality:quality(),upgrades:state.upgrades})}
function buyerChance(){return plannedDemand().probability}
function spawnCustomer(type,person){world.customerEvent(type,person);}

function openStand(){
 world.audio.effect('start');
 if(running||feasible()||state.history.some(d=>d.day===state.day))return;
 running=true;const l=locs[state.location],w=weather();const brewedCost=totalBrewCost();
 state.cash=round(state.cash-l.fee);state.ledger.push({day:state.day,desc:l.name+' stand permit',cash:-l.fee,category:'permit'});
 useInventoryForCups(maxCups());
 const visitors=traffic();const steps=serviceSteps(),priceDemand=plannedDemand();
 dayRun={priceDemand,day:state.day,location:state.location,weather:w.name,visitors:0,sold:0,turnedAway:0,leftUpset:0,lostCompetitor:0,capacity:maxCups(),revenue:0,cost:brewedCost,permit:l.fee,profit:0,unsold:0,queue:[],stepsUntilSale:0,serviceSteps:steps,recipe:{...state.recipe},recipeBonus:recipeBonus(state),upgrades:[...state.upgrades],price:state.price,spoilCost:state.daySpoilage.day===state.day?state.daySpoilage.cost:0,spoiledLemons:state.daySpoilage.day===state.day?state.daySpoilage.lemons:0};
 $('scoreVisitors').textContent='0';$('scoreSold').textContent='0';$('scoreRevenue').textContent=money(0);$('scoreProfit').textContent='…';
 root.classList.add('running');$('startBtn').disabled=true;$('startBtn').textContent='Stand is open…';$('phaseLabel').textContent='🟢 OPEN FOR BUSINESS';$('sceneTitle').textContent='Visitors are walking over…';$('sceneDescription').textContent='Watch the line. Customers may leave if they wait too long.';
 $('liveDisplay').style.display='block';$('runningNote').style.display='block';$('runProgress').style.width='0%';renderInventory();renderQueue();
 runConfig={visitors,chance:priceDemand.probability,rivalChance:competitionStrength(),demandVersion:priceDemand.version,stage:'opening'};
 startSellingSession();save();
}

function startSellingSession(){
 const {visitors,chance,rivalChance}=runConfig,steps=dayRun.serviceSteps;let tick=dayRun.visitors;
 const arrivals=world.beginDay(visitors,.165);
 if(tick||runConfig.stage==='serving'){
  world.arrivalStart-=arrivals.lead+tick*.165;
  for(let i=0;i<tick;i++)arrivals.visitors[i].spawned=true;
  world.metrics={sales:dayRun.sold,upset:dayRun.leftUpset,rival:dayRun.lostCompetitor};
  renderQueue();
 }
 if(tick>=visitors){closingTimeout=setTimeout(finishDay,800);return;}
 $('worldLiveStats').textContent='🚶 Visitors are walking in from around the area';
 const beginService=()=>{openingTimeout=null;if(!running||!dayRun)return;
 const remaining=arrivals.lead-(performance.now()/1000-world.arrivalStart);
 if(sessionPaused||(runConfig.stage==='opening'&&remaining>.01)){openingTimeout=setTimeout(beginService,sessionPaused?100:Math.max(16,remaining*1000));return;}
 runConfig.stage='serving';$('sceneTitle').textContent='Open for business!';
 interval=setInterval(()=>{
  if(!dayRun||sessionPaused)return;const d=dayRun;const arrivingPerson=arrivals.visitors[tick].person;tick++;d.visitors++;
  // Customers in line become impatient with each passing visitor.
  for(const person of d.queue)person.wait++;
  let expired=d.queue.filter(person=>person.wait>maxPatience());
  if(expired.length){d.leftUpset+=expired.length;d.turnedAway+=expired.length;d.queue=d.queue.filter(person=>person.wait<=maxPatience());for(const person of expired)spawnCustomer('upset',person)}
  // Service happens at the stand independently of customer arrival.
  if(d.queue.length){d.stepsUntilSale--;if(d.stepsUntilSale<=0){const servedPerson=d.queue.shift();if(d.sold<d.capacity){d.sold++;d.revenue=round(d.revenue+d.price);state.cash=round(state.cash+d.price);updateCapacityAndStocks();spawnCustomer('sale',servedPerson)}else{d.leftUpset++;d.turnedAway++;spawnCustomer('upset',servedPerson)}d.stepsUntilSale=steps;}}
  else d.stepsUntilSale=steps;
  const decision=customerDecision(chance,rivalChance,Math.random,runConfig.demandVersion===1);
  if(decision==='rival'){d.lostCompetitor++;spawnCustomer('rival',arrivingPerson)}
  else if(decision==='interested'){
    if(d.sold+d.queue.length>=d.capacity||d.queue.length>=queueLimit()){d.leftUpset++;d.turnedAway++;spawnCustomer('upset',arrivingPerson)}
    else d.queue.push(arrivingPerson);
  }else spawnCustomer('pass',arrivingPerson);
  renderQueue();$('scoreVisitors').textContent=d.visitors;$('scoreSold').textContent=d.sold;$('scoreRevenue').textContent=money(d.revenue);$('latestResult').textContent=d.sold+' cups sold so far · '+money(d.revenue)+' in sales';$('runProgress').style.width=(100*d.visitors/visitors)+'%';
  if(d.visitors>=visitors){clearInterval(interval);interval=null;closingTimeout=setTimeout(finishDay,800)}
 },165);
 };
 openingTimeout=setTimeout(beginService,runConfig.stage==='opening'?arrivals.lead*1000:0);
}

function finishDay(){closingTimeout=null;if(!dayRun)return;if(sessionPaused){closingTimeout=setTimeout(finishDay,100);return;}const d=dayRun;
 if(d.queue.length){d.leftUpset+=d.queue.length;d.turnedAway+=d.queue.length;for(const person of d.queue)spawnCustomer('upset',person);d.queue=[];renderQueue();}
 d.unsold=d.capacity-d.sold;updateCapacityAndStocks();d.profit=round(d.revenue-d.cost-d.permit-d.spoilCost);
 state.ledger.push({day:d.day,desc:'Lemonade sales: '+d.sold+' cups',cash:d.revenue,category:'sales'});
 state.ledger.push({day:d.day,desc:'Ingredient expense: '+d.capacity+' cups brewed',cash:0,category:'cost',expense:d.cost});
 state.history.push(d);running=false;dayRun=null;runConfig=null;save();root.classList.remove('running');$('liveDisplay').style.display='none';$('runningNote').style.display='none';
 $('scoreProfit').textContent=money(d.profit);$('scoreProfit').className=d.profit<0?'negative':'profit';$('sceneTitle').textContent='Closing time!';showScreen('stand');activateTab('results');$('latestResult').textContent='Day '+d.day+' · '+(d.profit>=0?'You made '+money(d.profit)+'!':'You lost '+money(-d.profit)+'.');$('resultNext').hidden=false;$('phaseLabel').textContent='DAY FINISHED';renderHistory();showReport(d)
}

function showReport(d){let feedback=d.leftUpset>6?'Customers are walking away from long lines! Try a faster juicer or register.':d.unsold===0?'Sold out! More pitchers might mean more sales next time.':d.unsold>d.capacity*.5?'Lots of lemonade was left over. Compare your price, recipe and batch size next time.':'Compare how much you earned with what you spent.';let title=d.profit>=0?'Your stand made a profit!':'That day cost you money.';modalKind='report';
 $('modalBody').innerHTML=`<div class="kicker">DAY ${d.day} · END OF DAY REPORT</div><h2>${d.profit>=0?'🎉':'📉'} ${title}</h2><p>${feedback}</p>${d.priceDemand?`<p class="notice pricing-feedback">${pricingFeedback(d.priceDemand)}</p>`:''}
 <div class="report-grid"><div class="report-cell"><small>VISITORS</small><strong>${d.visitors}</strong></div><div class="report-cell"><small>CUPS SOLD</small><strong>${d.sold} / ${d.capacity}</strong></div><div class="report-cell"><small>LEFT UPSET</small><strong>${d.leftUpset}</strong></div><div class="report-cell"><small>CHOSE COMPETITOR</small><strong>${d.lostCompetitor}</strong></div><div class="report-cell"><small>UNSOLD · DISCARDED</small><strong>${d.unsold}</strong></div><div class="report-cell"><small>LEMONS SPOILED</small><strong>${d.spoiledLemons}</strong></div></div>
 <div class="kicker">INCOME STATEMENT</div><table class="income-table"><tr><td>Sales revenue</td><td class="win">+${money(d.revenue)}</td></tr><tr><td>Ingredients and cups used (all prepared)</td><td>−${money(d.cost)}</td></tr><tr><td>Location permit</td><td>−${money(d.permit)}</td></tr><tr><td>Lemons expired at start of day</td><td>−${money(d.spoilCost)}</td></tr><tr><td><strong>Operating profit</strong></td><td class="${d.profit>=0?'win':'lose'}">${money(d.profit)}</td></tr></table>
 <p class="fine">Stand cash: <strong>${money(state.cash)}</strong>. Equipment is a business asset, so upgrades are recorded as purchases in your books rather than as a day's lemonade expense. Prepared, unsold lemonade is discarded after closing.</p><button class="primary" id="nextDay">Plan Day ${d.day+1} →</button><button class="small-link" id="reportSaveMenu">Save or quit</button>`;openModal()}

function nextDay(){state.financialMarks??={};state.financialMarks[state.day]=portfolioTotals(state.bank,investmentDesk.market.data).unrealizedCents/100;state.day++;expireOldLemons();reviewDueDate();save();modalKind='';$('modal').classList.remove('show');activateTab('location');render();$('sceneTitle').textContent='A new day, a fresh forecast';$('lesson').textContent='Fast service wins customers. Spoilage and location fees are costs. Equipment is an asset—not a sale.';if(state.daySpoilage.lemons)showEvent('🍋 '+state.daySpoilage.lemons+' lemons expired! Loss: '+money(state.daySpoilage.cost)+'. A fridge prevents this.');}

function exportLedger(){let rows=[['Day','Description','Category','Stand cash change','Checking change','Loan change','Investment change','Trading fee','Market close date'],...state.ledger.map(x=>[x.day,x.desc,x.category,x.cash||0,x.bankChange||0,x.loanChange||0,x.investmentChange||0,x.fee||0,x.priceDate||''])];let csv=rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');let link=document.createElement('a');link.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));link.download='lemonade-lane-ledger.csv';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000)}
function showHelp(){modalKind='help';$('modalBody').innerHTML=`<div class="kicker">HOW TO PLAY</div><h2>🍋 Your first business</h2><p>You're the owner of a lemonade stand. Your goal: grow your business without running out of money.</p><div style="line-height:1.75"><p><strong>1. Choose a location.</strong> Expensive locations have more customers—but higher daily costs.</p><p><strong>2. Perfect your lemonade.</strong> More lemons, sugar, and ice affect flavor and ingredient costs.</p><p><strong>3. Choose a price and batch size.</strong> Lower prices can interest more visitors, but each cup earns less. Compare prices and profits. Unsold lemonade spoils overnight.</p><p><strong>4. Visit the Bank.</strong> Borrow startup funds on the Loans tab, withdraw money from checking, then buy supplies. Future expansion loans require good repayment history and credit scores.</p><p><strong>5. Open your stand!</strong> Watch the street, then study the end-of-day financial results.</p></div><div class="notice">You start with $0 and no supplies. Use the big Bank arrow to apply for your first loan.</div><button class="small-link" id="resetBtn">Start over / reset business</button>`;openModal()}
function openModal(){world.avatarController?.keys.clear();world.avatarController?.touch.clear();$('modal').classList.add('show')}
function focusGame(){((world.avatarController?.enabled||world.classicInterior?.active||world.homeInterior?.active||world.casinoInterior?.active)&&currentScreen==='stand'&&!state.closed?$('world3d'):$('saveMenuBtn')).focus({preventScroll:true})}
function closeModal(){if(modalKind==='report'||saveBusy)return;const wasSave=modalKind==='save',wasCasino=modalKind==='casino';if(wasSave){sessionPaused=false;world.paused=false;}$('modal').classList.remove('show');$('modalClose').hidden=false;modalKind='';if(wasSave||wasCasino)focusGame()}
function stopGameSession(){
 investmentDesk.setVisible(false);world.classicInterior?.reset();world.homeInterior?.reset();world.casinoInterior?.reset();world.audio.reset();
 clearInterval(interval);clearTimeout(openingTimeout);clearTimeout(closingTimeout);interval=null;openingTimeout=null;closingTimeout=null;
 clearTimeout(statusTimeout);$('saveStatus').hidden=true;
 running=false;dayRun=null;runConfig=null;sessionPaused=false;root.classList.remove('running');
 $('liveDisplay').style.display='none';$('runningNote').style.display='none';world.clearTraffic();
}
async function createProfile(slot,name,avatar){
 const fresh={...initial(),avatarAppearance:appearanceFor(avatar)};
 await profileStore.create(slot,name,avatar,fresh);await loadProfile(slot,true);
}
async function loadProfile(slot,isNew=false){
 if(profileStore.online)await profileStore.refresh();
 const profile=profileStore.list()[slot];if(!profile)throw new Error('This profile is not available.');
 stopGameSession();modalKind='';$('modal').classList.remove('show');$('modalClose').hidden=false;
 world.avatarController?.setEnabled(false);activeProfile=profile;state=normalizeState(profile.state);
 const savedView=state.playerView;
 state.avatarAppearance??=appearanceFor(profile.avatar);world.avatarController?.avatar.setAppearance(state.avatarAppearance);
 $('world3d').dataset.avatarType=state.avatarAppearance.type||'male';
 investmentDesk.reset();if(investmentDesk.market.data)applyMarket(state,investmentDesk.market.data);
 clearSupplyCart();upgradeIndex=0;bankFeedback='';activeBankTab='overview';sceneView='outside';world.angle=.55;world.zoom=1;
 document.getElementById('profileScreen').hidden=true;root.hidden=false;document.body.classList.remove('profile-home-visible');world.paused=false;
 $('profilePlayerLabel').textContent=profile.name+'’S BUSINESS';
 activateTab('location');showScreen('stand');reviewDueDate();render();
 if(savedView){setSceneView(savedView.sceneView);world.avatarController?.restore(savedView)}
 world.resize();
 const session=state.session;
 if(session?.dayRun?.day===state.day&&!state.history.some(d=>d.day===state.day)&&Array.isArray(session.dayRun.queue)&&Number.isInteger(session.visitors)&&session.visitors>0&&session.dayRun.visitors>=0&&session.dayRun.visitors<=session.visitors){
  dayRun=session.dayRun;runConfig={visitors:session.visitors,chance:session.chance,rivalChance:session.rivalChance,demandVersion:session.demandVersion,stage:session.stage};running=true;
  root.classList.add('running');$('liveDisplay').style.display='block';$('runningNote').style.display='block';$('startBtn').disabled=true;$('startBtn').textContent='Stand is open…';$('phaseLabel').textContent='🟢 OPEN FOR BUSINESS';
  $('scoreVisitors').textContent=dayRun.visitors;$('scoreSold').textContent=dayRun.sold;$('scoreRevenue').textContent=money(dayRun.revenue);$('scoreProfit').textContent='…';$('runProgress').style.width=(100*dayRun.visitors/runConfig.visitors)+'%';
  startSellingSession();
 }
 save();
 if(isNew){modalKind='welcome';$('modalBody').innerHTML='<h2>Welcome to Lemonomics!</h2><p>You need money to purchase supplies! Head to the bank and apply for a loan!</p><button type="button" class="primary" id="welcomeBank">Head to the bank</button><button type="button" class="small-link" id="welcomeBack">Explore the neighborhood</button>';openModal();$('welcomeBank').focus();refreshProfileMarket(state,activeProfile.id);}
 else focusGame();
 window.scrollTo({top:0,behavior:'instant'});
}
async function refreshProfileMarket(game,id){
 await investmentDesk.market.refresh(()=>{},true);
 if(state!==game||activeProfile?.id!==id)return;
 if(investmentDesk.market.data)applyMarket(state,investmentDesk.market.data);
 reviewDueDate();save();renderBank();return investmentDesk.market.error;
}
function openSaveMenu(){
 if(!activeProfile||saveBusy)return;
 sessionPaused=true;world.paused=true;modalKind='save';
 $('modalBody').innerHTML='<h2>Would you like to:</h2><p id="saveMenuNote" class="fine">'+(profileStore.temporary?'Preview mode: saves last only while this page stays open.':'Save your progress, or save and return to the main screen.')+'</p><div class="save-options"><button type="button" id="saveOnly">Save</button><button type="button" id="saveAndQuit">Save &amp; Quit</button><button type="button" id="backToGame">Back to Game</button></div><p id="saveMenuError" role="alert" hidden></p>';
 openModal();$('saveOnly').focus();
}
async function manualSave(quit){
 if(saveBusy||!activeProfile)return;saveBusy=true;
 const controls=[...$('modal').querySelectorAll('button')];controls.forEach(b=>b.disabled=true);
 $('saveMenuNote').textContent='Saving… Checking for updated fund prices.';
 let complete=false,saveError='';
 try{if(save()){await refreshProfileMarket(state,activeProfile.id);complete=save();if(complete&&profileStore.online)await profileStore.flush()}}
 catch(error){complete=false;saveError=error.message;}
 finally{saveBusy=false;controls.forEach(b=>b.disabled=false)}
 if(!complete){$('saveMenuError').textContent=saveError||profileStore.conflict?.message||(profileStore.online?'Your online save could not be confirmed. Your browser backup is kept. Keep the game open and try Save again.':'Your game could not be saved. Allow browser storage or free some space, then try again. Your previous save is still available.');$('saveMenuError').hidden=false;$('saveMenuNote').textContent='Keep this game open until your progress can be saved.';$('saveOnly').focus();return;}
 const market=investmentDesk.market,priceNote=market.error?' Last available fund prices retained.':market.data?' Fund prices checked through '+market.data.asOf+'.':'';
 closeModal();
 if(quit){
  stopGameSession();world.avatarController?.setEnabled(false);activeProfile=null;state=initial();world.paused=true;root.hidden=true;document.body.classList.add('profile-home-visible');profileScreen.show();if(profileStore.online)profileStore.refresh().then(()=>profileScreen.render()).catch(e=>profileScreen.error(e.message));window.scrollTo({top:0,behavior:'instant'});
 }else{render();focusGame();notifySave((profileStore.temporary?'Saved for this preview.':profileStore.online?'Game saved online.':'Game saved.')+priceNote)}
}
function handleProfileClick(button){
 if(button.id==='saveMenuBtn'||button.id==='reportSaveMenu'){openSaveMenu();return true;}
 if(button.id==='saveOnly'||button.id==='saveAndQuit'){manualSave(button.id==='saveAndQuit');return true;}
 if(button.id==='backToGame'){closeModal();return true;}
 if(button.id==='welcomeBank'||button.id==='welcomeBack'){closeModal();if(button.id==='welcomeBank')showScreen('bank','loans');return true;}
 return false;
}
function exhaustedAssets(){const restartCost=round(Math.min(...Object.values(locs).map(l=>l.fee))+stockKeys.reduce((sum,k)=>sum+Math.min(...supplyTiers[k])*supplies[k].unit,0));return state.cash+state.bank.checking+.00001<restartCost&&investmentDesk.value()<.01&&stockKeys.every(k=>round(state.inventory[k]*supplies[k].unit/2)<.01)&&!state.upgrades.length}
function canClose(){return !state.closed&&exhaustedAssets()&&!emergencyEligible(state)&&(Boolean(activeLoan())||loanMax()===0)}
function showLedger(){modalKind='books';$('modalBody').innerHTML='<div class="kicker">BUSINESS BOOKS</div><h2>Export results to Excel?</h2><p>Your workbook includes an Income Statement with daily columns and totals, an aggregate Balance Sheet, and a Cash Flow statement.</p><button type="button" class="primary" id="downloadBooks">Yes — download Excel workbook</button><button type="button" class="small-link" id="noBooks">No, close</button><br><button type="button" class="small-link" id="exportBtn">Download transaction ledger as CSV</button>';openModal()}
function showShop(shop){if(running||state.closed||$('modal').classList.contains('show'))return;modalKind=shop;const purchased=state.purchasedRecipes||[];
 if(shop==='bookstore'){$('modalBody').innerHTML=`<div class="kicker">DOWNTOWN BOOKSTORE</div><h2>Lemonade recipe books</h2><p>Buy a recipe once and keep it forever. Buying the book and matching its exact mix earns extra visitors. You can also guess a tasty mix or change it later, but an unpurchased recipe earns no visitor bonus.</p>${RECIPES.map(r=>`<div class="active-loan"><h3>${r.name} recipe · ${money(r.price)}</h3><p>Attracts ${r.bonus*100}% more visitors when matched.</p>${purchased.includes(r.id)?`<p>${r.lemons} lemons · ${r.sugar} sugar · ${r.ice} ice per pitcher.</p><button type="button" data-use-recipe="${r.id}">Use recipe</button>`:`<button type="button" data-buy-recipe="${r.id}" ${state.cash<r.price?'disabled':''}>Buy for ${money(r.price)} from stand cash</button>`}</div>`).join('')}`;
 }else{$('modalBody').innerHTML=`<div class="kicker">MAPLE MARKET</div><h2>Sell leftover supplies or equipment?</h2><p>Maple Market pays 50% of your original purchase price. Proceeds go to stand cash. Prepared lemonade cannot be resold.</p>${stockKeys.map(k=>`<div class="resale-row"><label>${supplies[k].name} · ${countDisplay(state.inventory[k])} available<br>${money(supplies[k].unit/2)} per unit <input type="number" min="0" max="${state.inventory[k]}" step="${k==='cups'?'1':'0.01'}" id="sell-${k}" value="${state.inventory[k]}"></label><button type="button" data-sell-stock="${k}" ${state.inventory[k]<=0?'disabled':''}>Sell selected</button></div>`).join('')}${state.upgrades.filter(id=>id!=='house').map(id=>{const u=upgradeItems.find(x=>x.id===id);return u?`<div class="resale-row">${u.name}<button type="button" data-sell-equipment="${id}">Sell for ${money(round((state.equipmentCosts?.[id]??u.price)/2))}</button></div>`:''}).join('')}`;}
 openModal();}
function shopError(text){let el=$('shopError');if(!el){el=document.createElement('p');el.id='shopError';el.className='notice';el.setAttribute('role','alert');el.tabIndex=-1;$('modalBody').prepend(el)}el.textContent=text;el.focus()}
function sellStock(key){const qty=Number($('sell-'+key)?.value);if(!Number.isFinite(qty)||qty<=0||qty>state.inventory[key]||(key==='cups'&&!Number.isInteger(qty))||Math.abs(qty*100-Math.round(qty*100))>1e-7){shopError('Enter an amount you own, with up to two decimal places; cups must be whole numbers.');return;}const inventoryValue=()=>round(stockKeys.reduce((sum,k)=>sum+state.inventory[k]*supplies[k].unit,0));const before=inventoryValue(),proceeds=round(qty*supplies[key].unit/2);if(proceeds<.01){shopError('This quantity is worth less than one cent at the resale price. Choose a larger amount.');return;}if(key==='lemons')spendLemons(qty);else state.inventory[key]=round(state.inventory[key]-qty);state.cash=round(state.cash+proceeds);state.ledger.push({day:state.day,desc:'Maple Market bought '+qty+' '+key,category:'resale',asset:'inventory',cash:proceeds,loss:round(before-inventoryValue()-proceeds)});save();render();showShopRefresh('market')}
function showShopRefresh(shop){$('modal').classList.remove('show');showShop(shop)}
function buyRecipe(id){const r=RECIPES.find(x=>x.id===id);state.purchasedRecipes??=[];if(!r||state.purchasedRecipes.includes(id)||state.cash<r.price)return;state.cash=round(state.cash-r.price);state.purchasedRecipes.push(id);state.ledger.push({day:state.day,desc:r.name+' recipe book',category:'recipes',cash:-r.price});save();render();showShopRefresh('bookstore')}
function dailyChart(history,{projection=false,all=false}={}){const reports=statements(state,upgradeItems,investmentDesk.market.data),days=all?reports.days:reports.days.slice(-7);const data=days.map(day=>{const d=reports.profits[day],h=history.find(x=>x.day===day);return {day,income:round(d.sales+d.investment+d.casino),expenses:round(d.cost+d.permit+d.interest+d.recipes+d.loss),h}});const estimate={day:'plan',income:round(Math.min(maxCups(),traffic()*buyerChance()*(1-competitionStrength()),traffic()/serviceSteps())*state.price),expenses:round(totalBrewCost()+locs[state.location].fee)};if(projection)data.push({...estimate,projected:true});
 const width=all?Math.max(490,data.length*80):490,height=205,pad=35,min=Math.min(0,...data.flatMap(d=>[d.income,d.expenses])),max=Math.max(10,...data.flatMap(d=>[d.income,d.expenses])),x=i=>pad+(width-pad*2)*(data.length===1?.5:i/(data.length-1)),y=v=>height-pad-(v-min)/(max-min)*(height-pad*2);const path=key=>data.filter(d=>!d.projected).map((d,i)=>(i?'L':'M')+x(i).toFixed(1)+','+y(d[key]).toFixed(1)).join(' ');const forecast=key=>projection&&data.length>1?`M${x(data.length-2)},${y(data.at(-2)[key])}L${x(data.length-1)},${y(data.at(-1)[key])}`:'';
 return `<div class="daily-chart-scroll"><svg class="daily-chart" viewBox="0 0 ${width} ${height}" style="min-width:${all?width:0}px" role="img" aria-label="Daily income in green and expenses in orange. Select a day for details."><text x="0" y="17" font-size="11">${money(max)}</text><text x="0" y="${height-12}" font-size="11">${money(min)}</text><path d="M${pad} 25V${height-pad}H${width-10}" fill="none" stroke="#89a28b"/><path d="${path('income')}" fill="none" stroke="#087849" stroke-width="3"/><path d="${path('expenses')}" fill="none" stroke="#c26c21" stroke-width="3"/><path d="${forecast('income')}" fill="none" stroke="#087849" stroke-width="2" stroke-dasharray="5 4"/><path d="${forecast('expenses')}" fill="none" stroke="#c26c21" stroke-width="2" stroke-dasharray="5 4"/>${data.map((d,i)=>`<g tabindex="0" role="button" aria-label="${d.projected?'Projected':'Day'} ${d.day}: income ${money(d.income)}, expenses ${money(d.expenses)}" data-result-day="${d.projected?'projection':d.day}"><rect x="${x(i)-18}" y="24" width="36" height="${height-35}" fill="transparent"/><circle cx="${x(i)}" cy="${y(d.income)}" r="5" fill="${d.projected?'white':'#087849'}" stroke="#087849"/><circle cx="${x(i)}" cy="${y(d.expenses)}" r="4" fill="#c26c21"/><text x="${x(i)}" y="${height-10}" text-anchor="middle" font-size="11">${d.projected?'Est.':'D'+d.day}</text>${state.ledger.some(l=>l.day===d.day&&l.category==='equipment')?`<text x="${x(i)}" y="22" text-anchor="middle" font-size="15">★</text>`:''}</g>`).join('')}</svg></div><p class="fine">● Income (green) · ● Expenses (orange) · ★ Equipment purchase${projection?'<br>Estimate uses current recipe bonus, weather, permit, ingredients, price, capacity, service speed and upgrade effects. Actual customers vary.':''}</p>`}
function renderResults(){const holder=$('historyBars');holder.classList.remove('history');holder.innerHTML=`<label class="projection-toggle"><input type="checkbox" id="showProjection" ${state.showProjection?'checked':''}> Show projections</label>${dailyChart(state.history,{projection:state.showProjection})}<div id="dailyDetails" aria-live="polite">Select a day on the graph to see details.</div>`;const recipeNote=$('recipeBooks');if(recipeNote)recipeNote.innerHTML='<strong>Discover your recipe.</strong> Buy Good ($10), Better ($25), or Best ($50) recipes at the Downtown bookstore for 10%, 15%, or 20% more visitors. Walk to the BOOKS door. You can guess a tasty mix, but visitor bonuses require the purchased book and its exact recipe. Adjust ingredients in tenths.'+(state.purchasedRecipes?.length?'<br>Your books: '+state.purchasedRecipes.map(id=>{const r=RECIPES.find(x=>x.id===id);return r?`${r.name}: ${r.lemons} lemons / ${r.sugar} sugar / ${r.ice} ice <button type="button" data-use-recipe="${id}">Use</button>`:''}).join(' · '):'');}
function resultDetails(day){const el=$('dailyDetails');if(!el)return;if(day==='projection'){el.textContent=`Estimate at ${locs[state.location].name}, ${weather().name}. Recipe boost ${recipeBonus(state)*100}%. Upgrades: ${state.upgrades.map(id=>upgradeItems.find(u=>u.id===id)?.name).join(', ')||'none'}.`;return}const h=state.history.find(h=>h.day===Number(day)),s=statements(state,upgradeItems,investmentDesk.market.data).profits[day];if(!s)return;el.innerHTML=`<strong>Day ${day} · ${h?locs[h.location]?.name||h.location:'Planning / bank activity'} · ${h?.weather||'No trading day'}</strong><p>Recipe visitor boost: ${Math.round((h?.recipeBonus||0)*100)}%${h?.recipe?' · Mix '+h.recipe.lemons+' / '+h.recipe.sugar+' / '+h.recipe.ice:''}</p><table class="income-table">${Object.entries({Sales:s.sales,'Investment income / loss':s.investment,'Casino winnings / (losses)':s.casino,'Ingredients and spoilage':-s.cost,Permits:-s.permit,'Loan interest and fees':-s.interest,'Recipe books':-s.recipes,'Resale loss':-s.loss}).map(([label,v])=>`<tr><td>${label}</td><td>${money(v)}</td></tr>`).join('')}</table>${h?.priceDemand?`<p class="notice pricing-feedback">${pricingFeedback(h.priceDemand)}</p>`:''}<p>Equipment purchased: ${state.ledger.filter(l=>l.day===Number(day)&&l.category==='equipment').map(l=>l.desc+' ('+money(-l.cash)+')').join(', ')||'none'}.</p>`}
function closeBusiness(){if(!canClose())return;state.closed=true;save();render();modalKind='closed';const report=statements(state,upgradeItems,investmentDesk.market.data);$('modalBody').innerHTML=`<h2>You made it to day ${state.day}!</h2><div class="closing-results"><div>${dailyChart(state.history,{all:true})}</div><div><h3>Aggregate income / loss</h3><table class="income-table">${report.income.slice(1).map(r=>`<tr><td>${r[0]}</td><td>${money(r.at(-1))}</td></tr>`).join('')}</table></div></div><p>You ran out of money and can no longer obtain a loan from the bank. Would you like to start another game?</p><button type="button" id="restartClosed" class="primary">Yes — start another game</button><button type="button" id="stayClosed" class="small-link">No — return to Books only</button>`;openModal()}
function handleBusinessClick(b){if(b.id==='applyMortgage'){reviewHousePurchase(true);return true}if(b.id==='buyHouseOutright'){reviewHousePurchase(false);return true}if(b.id==='confirmHousePurchase'){confirmHousePurchase();return true}if(b.id==='cancelHousePurchase'){houseReview=null;closeModal();return true}if(b.id==='refreshMortgageRate'){mortgageRates.refresh(()=>renderBank(),true);return true}if(b.id==='payMortgage'||b.id==='payoffMortgage'){mortgagePayment(b.id==='payoffMortgage');return true}if(b.id==='downloadBooks'){downloadStatements(state,upgradeItems,investmentDesk.market.data);closeModal();return true}if(b.id==='noBooks'||b.id==='stayClosed'){modalKind='';closeModal();return true}if(b.id==='restartClosed'){state={...initial(),avatarAppearance:state.avatarAppearance};world.clearTraffic();modalKind='';closeModal();save();showScreen('stand');activateTab('location');render();return true}if(state.closed)return false;
 if(b.id==='dismissEvent'){state.dismissedEvent=state.day+':'+b.dataset.eventText;state.dismissedEvents=[...(state.dismissedEvents||[]),state.dismissedEvent].slice(-20);$('neighborhoodEvent').hidden=true;save();return true}
 if(b.dataset.loanCollateral){const loan=state.bank.loans.find(l=>l.id===Number(b.dataset.loanCollateral)&&l.secured&&l.balance>0);if(loan&&!running){try{const result=settleCollateral(state,loan,investmentDesk.market.data,new Date(),{full:true,collection:state.day>loan.nextDue});if(result){save();render();bankNotify(result+(loan.balance>0?' Remaining loan: '+money(loan.balance):' Loan paid in full.'))}else bankNotify('Refresh prices on Investments before selling collateral. The latest prior trading day’s close is required.',true)}catch(e){save();render();bankNotify(e.message,true)}}return true}if(b.dataset.loanFull){makeLoanPayment(Number(b.dataset.loanFull),true);return true}if(b.id==='applySecured'){applyLoan(Number($('securedAmount').value),true);return true}
 if(b.id==='emergencyLoan'){if(exhaustedAssets()&&emergencyEligible(state)){emergencyTopup(state);save();render();bankNotify('$25 added to checking. Your existing loan increased by $27.50.')}return true}
 if(b.dataset.sellStock&&modalKind==='market'){sellStock(b.dataset.sellStock);return true}
 if(b.dataset.sellEquipment&&modalKind==='market'){const id=b.dataset.sellEquipment,u=upgradeItems.find(x=>x.id===id);if(u&&id!=='house'&&owns(id)){const cost=state.equipmentCosts?.[id]??u.price,proceeds=round(cost/2);state.upgrades=state.upgrades.filter(x=>x!==id);state.cash=round(state.cash+proceeds);state.ledger.push({day:state.day,desc:'Maple Market bought '+u.name,category:'resale',asset:'equipment',cash:proceeds,loss:round(cost-proceeds)});save();render();showShopRefresh('market')}return true}
 if(b.dataset.buyRecipe&&modalKind==='bookstore'){buyRecipe(b.dataset.buyRecipe);return true}if(b.dataset.useRecipe){const r=RECIPES.find(x=>x.id===b.dataset.useRecipe);if(r&&state.purchasedRecipes?.includes(r.id)&&!running){state.recipe={lemons:r.lemons,sugar:r.sugar,ice:r.ice};save();render();closeModal()}return true}return false}
root.addEventListener('change',e=>{if(e.target.dataset.recipeInput){const key=e.target.dataset.recipeInput,n=Number(e.target.value);if(!running&&!state.closed&&Number.isFinite(n)){state.recipe[key]=round(clamp(Math.round(n*10)/10,0,key==='ice'?12:10));save();render()}else render();return}if(e.target.id==='showProjection'){state.showProjection=e.target.checked;save();renderResults()}});
root.addEventListener('click',e=>{const p=e.target.closest('[data-result-day]');if(p)resultDetails(p.dataset.resultDay)});
root.addEventListener('keydown',e=>{const p=e.target.closest('[data-result-day]');if(p&&['Enter',' '].includes(e.key)){e.preventDefault();resultDetails(p.dataset.resultDay)}});

root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!root.contains(b))return;if(handleProfileClick(b)||handleBusinessClick(b))return;if(state.closed&&!['ledgerBtn','booksLink','modalClose','downloadBooks','exportBtn'].includes(b.id))return;if(b.dataset.sceneView){setSceneView(b.dataset.sceneView);return}if(b.id==='playerStand'){setSceneView('exterior');return}if(b.id==='sceneBack'){setSceneView('outside');return}if(b.id==='sceneLeft'){world.rotate(-.25);return}if(b.id==='sceneRight'){world.rotate(.25);return}if(b.id==='exitStandView'){setSceneView('outside');return}if(b.id==='visitBank'){showScreen('bank','overview');return}if(b.id==='returnToStand'){showScreen('stand');return}if(b.dataset.bankTab){bankNav(b.dataset.bankTab);return}if(b.dataset.loanApply){applyLoan(Number(b.dataset.loanApply));return}if(b.dataset.loanPay){makeLoanPayment(Number(b.dataset.loanPay));return}if(b.dataset.transfer){transfer(b.dataset.transfer,b.dataset.amount);return}if(b.dataset.supplyCategory){supplyCategory=b.dataset.supplyCategory;renderInventory();return}if(b.dataset.supplyStep){stepSupply(Number(b.dataset.tier),Number(b.dataset.supplyStep));return}if(b.id==='upgradePrev'){upgradeIndex=(upgradeIndex+upgradeItems.length-1)%upgradeItems.length;renderUpgrade();return}if(b.id==='upgradeNext'){upgradeIndex=(upgradeIndex+1)%upgradeItems.length;renderUpgrade();return}if(b.id==='buyUpgrade'){buyUpgrade();return}if(b.id==='clearSupplyCart'){clearSupplyCart();return}if(b.id==='reviewSupplies'){reviewSupplies();return}if(b.id==='cancelSupplyPurchase'){closeModal();return}if(b.id==='confirmSupplyPurchase'){confirmSupplyPurchase();return}if(b.dataset.tab){activateTab(b.dataset.tab);return}if(b.id==='resultNext'){nextDay();return}if(b.dataset.loc&&!running){state.location=b.dataset.loc;save();render()}else if(b.dataset.recipe)setRecipe(b.dataset.recipe,Number(b.dataset.change));else if(b.dataset.adjust)setVar(b.dataset.adjust,Number(b.dataset.change));else if(b.id==='startBtn'){if(canClose())closeBusiness();else openStand();}else if(b.id==='ledgerBtn'||b.id==='booksLink')showLedger();else if(b.id==='helpBtn')showHelp();else if(b.id==='modalClose')closeModal();else if(b.id==='nextDay'){modalKind='';nextDay()}else if(b.id==='exportBtn')exportLedger();else if(b.id==='resetBtn'){if(confirm('Reset your entire lemonade business? This will erase all days and transactions.')){state={...initial(),avatarAppearance:state.avatarAppearance};clearSupplyCart();running=false;dayRun=null;if(interval)clearInterval(interval);if(openingTimeout)clearTimeout(openingTimeout);if(closingTimeout)clearTimeout(closingTimeout);openingTimeout=null;closingTimeout=null;world.clearTraffic();save();modalKind='';$('modal').classList.remove('show');activateTab('location');showScreen('stand');render()}}});
$('modal').addEventListener('click',e=>{if(e.target===$('modal'))closeModal()});
const world=new Neighborhood($('world3d'),{onSelect:()=>setSceneView('exterior'),onBack:()=>setSceneView('outside'),onShop:shop=>showShop(shop),onFirstPerson:()=>setSceneView('firstperson'),onHome:()=>setSceneView('home'),onHouseDetails:()=>showScreen('bank','loans'),onCasino:()=>setSceneView('casino'),onCasinoGame:target=>{modalKind='casino';casinoDesk.show(target)}});
const casinoDesk=new CasinoDesk({getState:()=>state,change:()=>{save();render()},body:$('modalBody'),open:()=>openModal(),audio:world.audio,display:(target,result)=>world.casinoInterior.showResult(target,result)});
const mortgageRates=new MortgageRateClient();
const investmentDesk=new InvestmentDesk($('investApp'),{getState:()=>state,commit:()=>{reviewDueDate();save();renderBank()},isRunning:()=>running||state.closed,getAccount:()=>activeProfile?.id,onValuation:()=>renderBank()});
const resultsPane=$('pane-results');const graph=root.querySelector('.result-history');if(resultsPane&&graph)resultsPane.prepend(graph);
profileScreen=new ProfileScreen(document.getElementById('profileScreen'),{list:()=>{if(!profileStore)throw new Error(profileBootError||'Loading profiles. Please wait, or reload to reconnect.');return profileStore.list()},onCreate:createProfile,onLoad:loadProfile,onDelete:async(id,revision)=>{await profileStore.delete(id,revision)}});
async function initializeProfiles(){
let onlineMode=false;
try{
 if(await onlineAvailable()){
  onlineMode=true;
  profileStore=new OnlineProfileStore(window.localStorage,fetch,message=>notifySave(message));
  await profileStore.refresh();
  const note=profileScreen.host.querySelector('.profile-local-note');
  note.textContent='Family playtest · Saved online. Use Save & Quit before switching computers.';
  const recovery=document.createElement('button');recovery.type='button';recovery.className='profile-cancel';recovery.textContent='Download browser backup';
  recovery.onclick=()=>{const blob=new Blob([localStorage.getItem(CLOUD_BACKUP_KEY)||'{}'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Lemonomics-browser-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};note.after(recovery);
  const logout=document.createElement('form');logout.method='post';logout.action='/logout';logout.innerHTML='<button type="submit" class="profile-cancel">Lock family playtest</button>';recovery.after(logout);
 }else{profileStore=new LocalProfileStore(window.localStorage);profileStore.migrateLegacy();profileScreen.host.querySelector('.profile-local-note').textContent='Five players. Five businesses. Your progress is saved on this device.'}
}catch(error){
 if(error.name==='SecurityError'&&!onlineMode){
  // Opaque embedded previews cannot use browser storage. Keep that limitation
  // explicit while allowing the downloaded game to be previewed and played.
  const memory=new Map();profileStore=new LocalProfileStore({getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)});profileStore.temporary=true;
  profileScreen.host.querySelector('.profile-local-note').textContent='Preview mode: profiles last while this page stays open. Open the downloaded HTML in your browser to keep saves.';
 }else{profileStore=null;profileBootError=error.message;profileScreen.error(error.message);}
}
world.paused=true;activateTab('location');render();profileScreen.show();
}
world.paused=true;profileScreen.host.querySelector('.profile-local-note').textContent='Loading your profiles…';
initializeProfiles().catch(error=>profileScreen.error(error.message));
window.addEventListener('pagehide',()=>{if(activeProfile)save()});
$('modal').addEventListener('keydown',e=>{if(e.key==='Tab')trapFocus(e,$('modal'));if(e.key==='Escape'){e.preventDefault();closeModal()}});
})();
