import test from 'node:test';import assert from 'node:assert/strict';
import {oneServing,foodFromServing} from '../serving-core.js';import {calculate,emptyState,validateBackup} from '../core.js';import {removeCustomGroup,restoreCustomGroup} from '../food-catalog.js';
const food={id:'custom-1',name:'내 요리',kcal:160,carbs:20,protein:8,fat:5,unit:'g',serving:210,source:'custom',kind:'homemade'};
test('one-serving display uses its actual reference grams, and never invents a portion weight',()=>{
 assert.deepEqual(oneServing(food),{weight:210,unit:'g',kcal:336,carbs:42,protein:16.8,fat:10.5});assert.equal(oneServing({...food,serving:null}).kcal,null);assert.equal(oneServing({...food,serving:null}).weight,null);assert.equal(oneServing({...food,unit:'ml'}).unit,'ml');
});
test('custom food entered per serving remains correct for grams and fractional servings after backup',()=>{
 const f=foodFromServing({...food,kcal:336,carbs:42,protein:16.8,fat:10.5});assert.equal(f.kcal,160);assert.equal(calculate(f,.5,'serving').kcal,168);assert.equal(calculate(f,210).kcal,336);assert.equal(validateBackup({...emptyState(),customFoods:[f]}).customFoods[0].serving,210);assert.throws(()=>foodFromServing({...food,serving:0}));
});
test('deleting a registered group removes catalog/favorites, preserves consumed food snapshots, and supports undo',()=>{
 const second={...food,id:'custom-2',kcal:180},other={...food,id:'custom-3',name:'다른 요리'},entry={id:'e',date:'2026-11-15',meal:'lunch',food,amount:1,mode:'serving'};
 const s={...emptyState(),customFoods:[food,second,other],favorites:[food,other],entries:[entry]},change=removeCustomGroup(s,food.id);assert.deepEqual(change.next.customFoods,[other]);assert.deepEqual(change.next.favorites,[other]);assert.deepEqual(change.next.entries,[entry]);const restored=restoreCustomGroup(change.next,change);assert.equal(restored.customFoods.length,3);assert.equal(restored.favorites.length,2);assert.equal(restoreCustomGroup(restored,change).customFoods.length,3);
});
