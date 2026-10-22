import test from 'node:test';
import assert from 'node:assert/strict';
import {DEMAND_CONFIG as config} from '../src/demand-config.js';
import {demandFor,curveFactor,weatherCategory,recipeCategory,customerDecision,pricingFeedback} from '../src/demand.js';
const average={name:'Sunny',temp:76},hot={name:'Hot & sunny',temp:93},cold={name:'Snowy',temp:30};
const plan=(price,extra={})=>demandFor({price,weather:average,quality:1,location:'neighborhood',upgrades:[],...extra});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} ≠ ${b}`);
function seeded(seed=12345){return ()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296}}
test('every configured weather table point, interpolation, low-price floor and hard cutoff match the request',()=>{
 for(const [category,points]of Object.entries(config.curves)){for(const [price,factor]of points)near(curveFactor(price,category),factor);assert.equal(curveFactor(8,category),0);near(curveFactor(.75,category),points[0][1]);for(let i=1;i<points.length;i++)near(curveFactor((points[i-1][0]+points[i][0])/2,category),(points[i-1][1]+points[i][1])/2)}
 near(plan(2).factor,1);near(plan(2.25).baseFactor,.90);near(plan(2.5).baseFactor,.70);near(plan(2.75).baseFactor,.45);near(plan(3,{weather:hot}).baseFactor,.65);assert.throws(()=>plan(-1));assert.throws(()=>plan(NaN));
});
test('temperature boundaries and explicit snow select one category; weather is not applied again at the baseline price',()=>{
 assert.equal(weatherCategory({temp:40}),'cold');assert.equal(weatherCategory({temp:41}),'average');assert.equal(weatherCategory({temp:84}),'average');assert.equal(weatherCategory({temp:85}),'hot');assert.equal(weatherCategory({temp:90,name:'Snowy'}),'cold');
 near(plan(2,{weather:average}).probability,plan(2,{weather:hot}).probability);near(plan(2,{weather:cold}).probability,plan(2,{weather:average}).probability);near(plan(2).probability,.6*(.55+.52));
});
test('location and recipe sensitivity scale deviations in both directions, with quality applied only once',()=>{
 near(plan(2.75,{location:'park'}).factor,.5325);assert.ok(plan(2.75,{location:'park'}).factor>plan(2.75).factor);assert.ok(plan(1,{location:'park'}).factor<plan(1).factor);
 assert.equal(recipeCategory(.799),'good');assert.equal(recipeCategory(.8),'better');assert.equal(recipeCategory(.95),'best');
 const good=plan(2.75,{location:'square',quality:.79}),better=plan(2.75,{location:'downtown',quality:.9}),best=plan(2.75,{location:'square',quality:.95});near(good.locationSensitivity,1.2);near(better.locationSensitivity,1.1);near(best.locationSensitivity,.65);assert.ok(best.factor>better.factor&&better.factor>good.factor);near(good.probability,.6*good.factor*(.55+.52*.79));near(plan(2.75,{location:'beach'}).sensitivity,.8);
});
test('purchased branding stacks, deduplicates and caps at 30%; operational items add no recognition',()=>{
 near(plan(3,{upgrades:['classic','lemonstand']}).brandReduction,.13);near(plan(3,{upgrades:Object.keys(config.brand.reductions)}).brandReduction,.3);near(plan(3,{upgrades:['classic','classic']}).brandReduction,.05);near(plan(3,{upgrades:['juicer','powerjuicer','register','fridge','icedispenser','icemaker','house']}).brandReduction,0);
 assert.ok(plan(3,{upgrades:['classic']}).probability>plan(3).probability);assert.ok(plan(1,{upgrades:['classic']}).probability<plan(1).probability);near(plan(2,{upgrades:Object.keys(config.brand.reductions)}).probability,plan(2).probability);
});
test('prices never increase purchasing interest; discounts remain meaningful and all weather cutoffs resist every modifier',()=>{
 for(const weather of [average,hot,cold])for(const location of ['neighborhood','park','square','beach'])for(const quality of [.42,.79,.9,1])for(const upgrades of [[],Object.keys(config.brand.reductions)]){
  let previous=1;for(let cents=75;cents<=600;cents+=5){const d=plan(cents/100,{weather,location,quality,upgrades});assert.ok(d.probability<=previous+1e-10);assert.ok(d.probability>=0&&d.probability<=1);previous=d.probability;}
  for(const price of [.75,1,1.25,1.5,1.75])assert.ok(plan(price,{weather,location,quality,upgrades}).probability>plan(2,{weather,location,quality,upgrades}).probability);
  assert.equal(plan(config.curves[weatherCategory(weather)].at(-1)[0],{weather,location,quality,upgrades}).probability,0);
 }
 assert.ok(plan(1).probability<1);assert.ok(plan(1.25).probability<plan(1).probability);
});
test('seeded decisions across thousands of actual visitor draws converge to demand times retained competition',()=>{
 for(const weather of [average,hot,cold])for(const price of [1,2,2.75,4.5]){
  const d=plan(price,{weather}),random=seeded(),N=100000,counts={rival:0,pass:0,interested:0};for(let i=0;i<N;i++)counts[customerDecision(d.probability,.18,random)]++;
  assert.equal(counts.rival+counts.pass+counts.interested,N);assert.ok(Math.abs(counts.interested/N-.82*d.probability)<.005);assert.ok(Math.abs(counts.rival/N-.18)<.005);if(d.probability===0)assert.equal(counts.interested,0);
 }
 let sequence=[.1,.9],i=0;assert.equal(customerDecision(.2,.18,()=>sequence[i++],false),'interested');sequence=[.1,.9];i=0;assert.equal(customerDecision(.2,.18,()=>sequence[i++],true),'rival');
});
test('seeded expected revenue and prepared-batch profits reward experimentation rather than always discounting',()=>{
 const N=100000,costPerPreparedCup=.47,fee=17;
 function result(price,extra={}){const d=plan(price,extra),random=seeded(77);let purchases=0;for(let i=0;i<N;i++)if(customerDecision(d.probability,0,random)==='interested')purchases++;const revenue=purchases*price;return {revenue,profit:revenue-N*costPerPreparedCup-fee}}
 assert.ok(result(2).revenue>result(1).revenue);assert.ok(result(2).profit>result(1).profit);assert.ok(result(3,{weather:hot,location:'beach'}).profit>result(2,{weather:hot,location:'beach'}).profit);
});
test('feedback explains only the recorded causes and does not reveal probabilities or an optimal price',()=>{
 assert.match(pricingFeedback(plan(3,{weather:hot,upgrades:['classic']})),/heat/);assert.match(pricingFeedback(plan(3,{weather:hot,upgrades:['classic']})),/familiar upgrades/);assert.doesNotMatch(pricingFeedback(plan(3)),/heat|familiar upgrades/);assert.match(pricingFeedback(plan(4)),/nobody wanted/);assert.doesNotMatch(pricingFeedback(plan(4,{upgrades:['castle']})),/familiar upgrades/);assert.match(pricingFeedback(plan(1)),/does not always mean more profit/);assert.equal(pricingFeedback(null),'');
});
