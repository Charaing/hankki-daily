import {bodyMetrics,weightSummary} from './health-core.js?v=1.4.0';
import {recordGoalChange} from './calendar-core.js?v=1.4.0';
export function bmrReference(state,today){
 const profile=state.health.profile,current=weightSummary(state.health.weights,null,today).current;
 if(!profile||!current)return null;
 const kcal=Math.round(bodyMetrics(profile,current.weight).bmr);
 return Number.isFinite(kcal)&&kcal>0&&kcal<=20000?{kcal,weightDate:current.date}:null;
}
export function syncBmrTarget(state,today){
 if(state.calorieTargetMode==='manual')return state;const reference=bmrReference(state,today);
 return reference&&reference.kcal!==state.goals.kcal?{...state,goals:{...state.goals,kcal:reference.kcal}}:state;
}
export function syncRestoredTarget(state,today){return recordGoalChange(state,syncBmrTarget(state,today),today);}
