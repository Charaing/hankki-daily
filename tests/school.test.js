import test from 'node:test';import assert from 'node:assert/strict';
import {defaultSchool,validateSchool,schoolDayStatus,entriesForDay,schoolNutrition} from '../school-core.js';
import {emptyState,validateBackup,summarize,entryNutrition} from '../core.js';
const config={...defaultSchool(),startDate:'2026-01-01'};
test('school lunch uses the supplied 839 kcal and estimated 107/36/30 g without inventing weight',()=>{
 const state={...emptyState(),school:config};const e=entriesForDay(state,'2026-11-13','2026-11-13');assert.equal(e.length,1);assert.equal(e[0].meal,'lunch');assert.equal(e[0].auto,true);assert.deepEqual(summarize(e),{kcal:839,carbs:107,protein:36,fat:30,incomplete:0});assert.equal(e[0].estimated,true);assert.deepEqual(entryNutrition(e[0]),{kcal:839,carbs:107,protein:36,fat:30,weight:null,unit:'portion'});assert.deepEqual(schoolNutrition(950),{kcal:950,carbs:null,protein:null,fat:null,weight:null,unit:'portion'});
});
test('weekends, observed holidays and updated Korean public holidays are excluded',()=>{
 for(const d of ['2026-11-14','2026-11-15','2026-03-02','2026-05-01','2026-06-03','2026-07-17','2026-12-25','2027-02-09','2027-05-03','2027-07-19','2027-09-15','2027-12-27'])assert.equal(schoolDayStatus(config,d,'2027-12-31').eligible,false,d);
 assert.equal(schoolDayStatus(config,'2026-06-08','2027-12-31').eligible,true);
 assert.equal(schoolDayStatus(config,'2027-11-12','2027-12-31').eligible,true);
});
test('no future, pre-start or unsupported-year records; no duplicate persisted auto meal',()=>{
 const s={...emptyState(),school:defaultSchool()};assert.equal(entriesForDay(s,'2026-11-12','2026-11-13').length,0);assert.equal(entriesForDay(s,'2026-11-16','2026-11-13').length,0);assert.equal(entriesForDay(s,'2028-01-03','2028-01-10').length,0);
 const e=entriesForDay({...s,school:config},'2026-11-13','2026-11-13')[0];assert.equal(entriesForDay({...s,school:config,entries:[e]},'2026-11-13','2026-11-13').length,1);
});
test('manual lunch stays intact and explicit day/holiday breaks override automatic records',()=>{
 const e={id:'manual',date:'2026-11-13',meal:'lunch',food:{id:'x',name:'사과',kcal:50,carbs:12,protein:0,fat:0,unit:'g',serving:100},amount:100,mode:'weight'};
 assert.equal(summarize(entriesForDay({...emptyState(),school:config,entries:[e]},e.date,e.date)).kcal,889);
 for(const school of [{...config,enabled:false},{...config,excludedDates:['2026-11-13']},{...config,breaks:[{start:'2026-11-13',end:'2026-11-16'}]}])assert.equal(entriesForDay({...emptyState(),school,entries:[e]},e.date,e.date).length,1);
});
test('legacy 950 kcal settings migrate to supplied averages while preserving closures and explicit new custom values',()=>{
 const legacy={enabled:false,kcal:950,startDate:'2026-11-01',excludedDates:['2026-11-13'],breaks:[{start:'2026-12-01',end:'2026-12-31'}]};
 const migrated=validateSchool(legacy);assert.deepEqual([migrated.kcal,migrated.carbs,migrated.protein,migrated.fat],[839,107,36,30]);assert.equal(migrated.enabled,false);assert.deepEqual(migrated.excludedDates,legacy.excludedDates);assert.deepEqual(migrated.breaks,legacy.breaks);assert.equal(migrated.startDate,legacy.startDate);
 assert.equal(validateSchool({...migrated,kcal:950}).kcal,950);assert.equal(validateSchool({...legacy,kcal:800}).kcal,800);assert.equal(validateSchool({...legacy,kcal:800}).carbs,null);
 for(const value of [-1,Infinity,'107',NaN])assert.throws(()=>validateSchool({...migrated,carbs:value}));
 assert.equal(validateSchool({...migrated,protein:null}).protein,null);assert.deepEqual(validateBackup({...emptyState(),school:migrated}).school,migrated);
});
test('old backups migrate without losing meals; school settings round-trip; malicious shapes rejected',()=>{
 const s=emptyState();delete s.school;assert.deepEqual(validateBackup(s).school,defaultSchool());assert.deepEqual(validateBackup({...s,school:config}).school,validateSchool(config));
 for(const c of [{...config,kcal:'950'},{...config,kcal:0},{...config,enabled:'true'},{...config,excludedDates:['2026-02-31']},{...config,breaks:[{start:'2026-12-01',end:'2026-11-01'}]}])assert.throws(()=>validateSchool(c));
});
