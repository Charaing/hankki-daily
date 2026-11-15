import {shiftDate,validDate,summarize} from './core.js?v=1.4.0';
import {entriesForDay} from './school-core.js?v=1.4.0';
export function shiftMonth(month,delta){const [y,m]=month.split('-').map(Number),d=new Date(y,m-1+delta,1,12),year=d.getFullYear();return year<1900||year>2200?month:`${year}-${String(d.getMonth()+1).padStart(2,'0')}`;}
export function monthDays(month){const first=month+'-01';if(!validDate(first))throw Error('달력을 표시할 날짜를 확인해 주세요.');const offset=new Date(first+'T12:00:00Z').getUTCDay(),start=shiftDate(first,-offset);return Array.from({length:42},(_,i)=>{const date=shiftDate(start,i);return{date,inMonth:date.startsWith(month),day:Number(date.slice(-2))};});}
export function goalForDate(state,date){let goal=state.goals.kcal;for(const d of Object.keys(state.calorieGoalHistory||{}).sort()){if(d>date)break;goal=state.calorieGoalHistory[d];}return goal;}
export function recordGoalChange(previous,next,today){if(previous.goals.kcal===next.goals.kcal)return next;const history={...(next.calorieGoalHistory||{})};if(!Object.keys(history).length)history['1900-01-01']=previous.goals.kcal;history[today]=next.goals.kcal;return{...next,calorieGoalHistory:history};}
export function dayBalance(state,date,today){
 const entries=entriesForDay(state,date,today),totals=summarize(entries),goal=goalForDate(state,date),delta=Math.round((totals.kcal-goal)*100)/100;
 return{date,entries,...totals,goal,delta,status:date>today?'future':!entries.length?'empty':delta>0?'over':delta<0?'deficit':'met',estimated:entries.filter(e=>e.estimated).length,automatic:entries.filter(e=>e.auto).length};
}
