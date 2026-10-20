import test from 'node:test';
import assert from 'node:assert/strict';
import {availableCups} from '../src/capacity.js';
const recipe={lemons:4,sugar:3,ice:5};
test('a new business has zero capacity, regardless of planned pitchers',()=>{
  assert.equal(availableCups({lemons:0,sugar:0,ice:0,cups:0},recipe),0);
});
for(const key of ['lemons','sugar','ice','cups'])test(`no ${key} means no production`,()=>{
  assert.equal(availableCups({...{lemons:20,sugar:20,ice:20,cups:20},[key]:0},recipe),0);
});
test('recipe quantities are per pitcher and the limiting ingredient wins',()=>{
  assert.equal(availableCups({lemons:8,sugar:6,ice:10,cups:60},recipe),20);
  assert.equal(availableCups({lemons:8,sugar:3,ice:10,cups:60},recipe),10);
  assert.equal(availableCups({lemons:8,sugar:6,ice:10,cups:7},recipe),7);
});
test('ice machines remove the ice requirement, without removing other requirements',()=>{
  assert.equal(availableCups({lemons:8,sugar:6,ice:0,cups:20},recipe,true),20);
  assert.equal(availableCups({lemons:0,sugar:6,ice:0,cups:20},recipe,true),0);
});
test('fractional leftovers remain accurate and malformed stock never grants production',()=>{
  assert.equal(availableCups({lemons:1.2,sugar:.9,ice:1.5,cups:3},recipe),3);
  assert.equal(availableCups({lemons:8,sugar:6,cups:20},recipe),0);
  assert.equal(availableCups({lemons:8,sugar:6,ice:10,cups:Infinity},recipe),0);
});
