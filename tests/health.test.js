import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,validateBackup} from '../core.js';
import {emptyHealth,validateHealth,validateProfile,bmiCategory,bodyMetrics,energyPlan,upsertWeight,weightSummary,weightSeries,chartBounds,weekActivity} from '../health-core.js';

const profile={height:180,age:30,sex:'male',activity:'sedentary',goalWeight:70,goalMode:'maintain',targetDate:null};
test('Mifflin male/female formulas, BMI and TDEE have independently known results',()=>{
 const a=bodyMetrics(profile,80);assert.equal(a.bmr,1780);assert.equal(a.tdee,2136);assert.ok(Math.abs(a.bmi-24.69135802469)<1e-9);
 assert.equal(bodyMetrics({...profile,sex:'female'},80).bmr,1614);
 assert.equal(bodyMetrics({...profile,activity:'moderate'},80).tdee,2759);
});
test('Korean BMI categories use unrounded values at each boundary',()=>{
 for(const [n,label]of [[18.499,'저체중'],[18.5,'정상 범위'],[22.999,'정상 범위'],[23,'비만 전단계'],[25,'1단계 비만'],[30,'2단계 비만'],[35,'3단계 비만']])assert.equal(bmiCategory(n).label,label);
});
test('automatic energy examples respect underweight and low-calorie limits',()=>{
 assert.equal(energyPlan(profile,80).kcal,2140);
 assert.equal(energyPlan({...profile,goalMode:'lose'},80).kcal,1920);
 assert.equal(energyPlan({...profile,goalMode:'gain',goalWeight:85},80).kcal,2350);
 assert.equal(energyPlan({...profile,goalMode:'lose',goalWeight:45},80).kcal,null);
 assert.equal(energyPlan({...profile,goalMode:'lose',goalWeight:55},50).kcal,null);
 assert.equal(energyPlan({...profile,height:150,age:70,sex:'female',goalMode:'lose',goalWeight:45},50).kcal,null);
});
test('one weight per day is updated, sorted, and future measurements are excluded',()=>{
 let w=[];w=upsertWeight(w,{date:'2026-11-01',weight:80});w=upsertWeight(w,{date:'2026-11-12',weight:78.5});w=upsertWeight(w,{date:'2026-11-12',weight:78});w=upsertWeight(w,{date:'2026-12-01',weight:75});
 assert.equal(w.length,3);assert.equal(weightSummary(w,70,'2026-11-12').current.weight,78);assert.equal(weightSummary(w,70,'2026-11-12').change,-2);assert.equal(weightSummary(w,70,'2026-11-12').progress,20);
 assert.equal(weightSummary(w,70,'2026-10-01').current,null);
 const gain=[{date:'2026-11-01',weight:50},{date:'2026-11-12',weight:52}];assert.equal(weightSummary(gain,55,'2026-11-12').progress,40);
});
test('graph uses real dates, calendar ranges and available 7-day means',()=>{
 const w=[{date:'2026-11-01',weight:80},{date:'2026-11-06',weight:79},{date:'2026-11-12',weight:78},{date:'2026-11-13',weight:77}];
 const series=weightSeries(w,'2026-11-12','7');assert.equal(series.length,2);assert.equal(series[1].average,78.5);assert.equal(weightSeries(w,'2026-11-12','all').length,3);
});
test('chart bounds include averages from measurements outside the visible window',()=>{
 const records=[{date:'2026-11-01',weight:100},{date:'2026-11-06',weight:70},{date:'2026-11-12',weight:69}];
 const series=weightSeries(records,'2026-11-12','7');assert.equal(series[0].average,85);
 const bounds=chartBounds(series,null);assert.ok(bounds.max>85);assert.ok(bounds.min<69);
 const goalBounds=chartBounds(series,60);assert.ok(goalBounds.min<60);assert.ok(goalBounds.max>85);
});
test('old backups migrate to empty health and new fields survive export validation',()=>{
 const old=emptyState();delete old.health;assert.deepEqual(validateBackup(old).health,emptyHealth());
 const health={...emptyHealth(),profile,weights:[{date:'2026-11-12',weight:80,bodyFat:21,waist:85,note:'측정 <script>'}],days:{'2026-11-12':{steps:5000,exercise:30,sleep:7.5,strength:true,vegetables:true,stretch:false}},motion:false};
 const result=validateBackup({...emptyState(),health});assert.deepEqual(result.health,validateHealth(health));assert.equal(result.health.weights[0].note,'측정 <script>');assert.equal(result.health.motion,false);
});
test('invalid profile, duplicate dates, NaN and injectable payloads are rejected',()=>{
 for(const patch of [{height:0},{age:18},{sex:'other'},{activity:'unknown'},{goalWeight:-1},{goalMode:'fast'},{targetDate:'2026-02-31'}])assert.throws(()=>validateProfile({...profile,...patch}));
 for(const weights of [[{date:'2026-02-31',weight:70}],[{date:'2026-11-12',weight:NaN}],[{date:'2026-11-12',weight:70,waist:'"><img>'}],[{date:'2026-11-12',weight:70},{date:'2026-11-12',weight:71}]])assert.throws(()=>validateHealth({...emptyHealth(),weights}));
 assert.throws(()=>validateHealth({...emptyHealth(),days:{'2026-11-12':{sleep:25}}}));assert.throws(()=>validateHealth({...emptyHealth(),motion:'false'}));
});
test('weekly physical activity excludes future and out-of-week logs',()=>{
 const days={'2026-11-08':{exercise:100,strength:true},'2026-11-09':{exercise:30,strength:true},'2026-11-11':{exercise:40,strength:true},'2026-11-15':{exercise:50,strength:true}};
 assert.deepEqual(weekActivity(days,'2026-11-12'),{exercise:70,strength:2,steps:0,sleep:null});
});
