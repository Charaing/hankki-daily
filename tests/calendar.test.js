import test from 'node:test';import assert from 'node:assert/strict';
import {monthDays,shiftMonth,dayBalance,goalForDate,recordGoalChange} from '../calendar-core.js';import {emptyState,validateBackup} from '../core.js';
test('calendar supports leap years, Sunday alignment and month/year navigation',()=>{
 const days=monthDays('2028-02');assert.equal(days.length,42);assert.equal(days.filter(d=>d.inMonth).length,29);assert.equal(days[0].date,'2028-01-30');assert.equal(shiftMonth('2026-12',1),'2027-01');assert.equal(shiftMonth('1900-01',-1),'1900-01');
});
test('balance uses entered intake and target, distinguishes unrecorded/future from a deficit and includes automatic lunch once',()=>{
 const s=emptyState();const fri=dayBalance(s,'2026-11-13','2026-11-15');assert.equal(fri.kcal,839);assert.equal(fri.delta,-1161);assert.equal(fri.status,'deficit');assert.equal(fri.estimated,1);
 assert.equal(dayBalance(s,'2026-11-15','2026-11-15').status,'empty');assert.equal(dayBalance(s,'2026-11-16','2026-11-15').status,'future');
 const food={id:'custom-x',name:'테스트 음식',unit:'g',serving:100,kcal:2200,carbs:null,protein:null,fat:null};const entry={id:'e',date:'2026-11-15',meal:'dinner',food,amount:100,mode:'weight'};
 assert.equal(dayBalance({...s,entries:[entry]},entry.date,entry.date).delta,200);assert.equal(dayBalance({...s,entries:[entry]},entry.date,entry.date).status,'over');assert.equal(dayBalance({...s,goals:{...s.goals,kcal:2200},entries:[entry]},entry.date,entry.date).status,'met');
});
test('goal changes apply from today while keeping historical targets and backup migration',()=>{
 const s=emptyState(),next=recordGoalChange(s,{...s,goals:{...s.goals,kcal:1800}},'2026-11-15');assert.equal(goalForDate(next,'2026-11-14'),2000);assert.equal(goalForDate(next,'2026-11-15'),1800);
 assert.equal(goalForDate(validateBackup(next),'2026-11-14'),2000);assert.deepEqual(validateBackup({...s,calorieGoalHistory:undefined}).calorieGoalHistory,{});assert.throws(()=>validateBackup({...s,calorieGoalHistory:{'bad-date':0}}));
});
