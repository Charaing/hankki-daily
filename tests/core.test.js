import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate, convertAmount, summarize, validateBackup, normalizeQuery, shiftDate, formatAmount } from '../core.js';

const rice={id:'rice',name:'쌀밥',kcal:166,carbs:37.33,protein:3.36,fat:0.32,unit:'g',serving:210};
test('grams and fractional portions produce the same nutrition',()=>{
  assert.equal(calculate(rice,210,'weight').kcal,348.6);
  assert.equal(calculate(rice,1,'serving').kcal,348.6);
  assert.equal(calculate(rice,0.5,'serving').weight,105);
  assert.equal(calculate(rice,2,'serving',150).kcal,498);
});
test('invalid quantities never enter the journal',()=>{
  for(const n of [0,-1,NaN,Infinity,100001]) assert.throws(()=>calculate(rice,n,'weight'),RangeError);
  assert.throws(()=>calculate({...rice,serving:null},1,'serving'),RangeError);
});
test('switching units preserves small and fractional quantities without rounding',()=>{
  for(const grams of [1,100,210,0.01]){
    const portions=convertAmount(grams,'weight','serving',210);
    assert.ok(portions>0);
    assert.equal(calculate(rice,portions,'serving').weight,grams);
    assert.ok(Math.abs(convertAmount(portions,'serving','weight',210)-grams)<1e-10);
  }
});
test('liquids keep mL and missing nutrients remain unknown',()=>{
  const n=calculate({...rice,kcal:40,unit:'ml',protein:null},250,'weight');
  assert.equal(n.unit,'ml');assert.equal(n.kcal,100);assert.equal(n.protein,null);
  const s=summarize([{food:rice,amount:100,mode:'weight'},{food:{...rice,protein:null},amount:100,mode:'weight'}]);
  assert.equal(s.kcal,332);assert.equal(s.protein,3.36);assert.equal(s.incomplete,1);
});
test('search normalization handles spacing, Korean and case',()=>{
  assert.equal(normalizeQuery(' 닭 가슴살 '),'닭가슴살');assert.equal(normalizeQuery('LATTE'),'latte');
});
test('calendar arithmetic uses local dates without UTC date drift',()=>{
  assert.equal(shiftDate('2026-12-31',1),'2027-01-01');
  assert.equal(shiftDate('2024-03-01',-1),'2024-02-29');
  assert.equal(formatAmount(1.5),'1.5');
  assert.equal(formatAmount(0.25),'0.25');
});
test('backup import rejects malformed structures and invalid records',()=>{
  const data={version:1,entries:[{id:'a',date:'2026-11-12',meal:'lunch',food:rice,amount:100,mode:'weight'}],customFoods:[],favorites:[],water:{},goals:{kcal:2000,carbs:250,protein:100,fat:67,water:2000}};
  assert.equal(validateBackup(data).entries.length,1);
  assert.throws(()=>validateBackup({...data,entries:[{...data.entries[0],amount:-10}]}));
  assert.throws(()=>validateBackup({...data,entries:[{...data.entries[0],date:'2026-02-31'}]}));
  assert.throws(()=>validateBackup({...data,goals:{...data.goals,kcal:0}}));
  assert.throws(()=>validateBackup({...data,customFoods:[{...rice,kcal:-2}]}));
  for(const servingSize of ['"><img src=x onerror=alert(1)>',-1,0,Infinity,100001]){
    assert.throws(()=>validateBackup({...data,entries:[{...data.entries[0],servingSize}]}));
  }
});
