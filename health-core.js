export const ACTIVITIES={sedentary:{label:'주로 앉아서 생활',factor:1.2},light:{label:'가벼운 활동 · 주 1–3회 운동',factor:1.375},moderate:{label:'보통 활동 · 주 3–5회 운동',factor:1.55},active:{label:'활발한 활동 · 주 6–7회 운동',factor:1.725},athlete:{label:'매우 활발한 활동 · 육체노동',factor:1.9}};
export const GOAL_MODES={maintain:'체중 유지',lose:'천천히 감량',gain:'천천히 증량'};
export function emptyHealth(){return{profile:null,weights:[],days:{},motion:true};}
const epoch=s=>Date.UTC(...s.split('-').map((n,i)=>Number(n)-(i===1?1:0)));
const key=t=>new Date(t).toISOString().slice(0,10);
const dayMs=86400000;
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&s>='1900-01-01'&&s<='2200-12-31'&&Number.isFinite(epoch(s))&&key(epoch(s))===s;
function number(n,min,max,label){if(!Number.isFinite(n)||n<min||n>max)throw Error(`${label}은 ${min}–${max} 사이로 입력해 주세요.`);return n;}
function optional(n,min,max,label){return n==null?null:number(n,min,max,label);}
export function validateProfile(p){
 if(!p||typeof p!=='object'||Array.isArray(p))throw Error('신체 정보를 확인해 주세요.');
 const height=number(p.height,80,250,'키'),age=number(p.age,19,100,'만 나이');
 if(!Number.isInteger(age))throw Error('만 나이는 정수로 입력해 주세요.');
 if(!['male','female'].includes(p.sex)||!Object.hasOwn(ACTIVITIES,p.activity)||!Object.hasOwn(GOAL_MODES,p.goalMode))throw Error('계산 기준과 활동 수준을 선택해 주세요.');
 if(p.targetDate!=null&&!validDate(p.targetDate))throw Error('목표 날짜를 확인해 주세요.');
 return{height,age,sex:p.sex,activity:p.activity,goalWeight:optional(p.goalWeight,20,500,'목표 체중'),goalMode:p.goalMode,targetDate:p.targetDate??null};
}
export function validateWeight(w){
 if(!w||!validDate(w.date))throw Error('체중 기록 날짜를 확인해 주세요.');
 if(w.note!=null&&typeof w.note!=='string')throw Error('체중 메모를 확인해 주세요.');
 if((w.note||'').length>200)throw Error('메모는 200자 이내로 입력해 주세요.');
 return{date:w.date,weight:number(w.weight,20,500,'체중'),bodyFat:optional(w.bodyFat,1,75,'체지방률'),waist:optional(w.waist,30,250,'허리둘레'),note:w.note||''};
}
export function validateDay(d){
 if(!d||typeof d!=='object'||Array.isArray(d))throw Error('생활 기록을 확인해 주세요.');
 for(const k of ['strength','vegetables','stretch'])if(d[k]!=null&&typeof d[k]!=='boolean')throw Error('습관 체크를 확인해 주세요.');
 const steps=number(d.steps??0,0,100000,'걸음 수');if(!Number.isInteger(steps))throw Error('걸음 수는 정수로 입력해 주세요.');
 return{steps,exercise:number(d.exercise??0,0,1440,'운동 시간'),sleep:optional(d.sleep,0,24,'수면 시간'),strength:d.strength??false,vegetables:d.vegetables??false,stretch:d.stretch??false};
}
export function validateHealth(d){
 if(d===undefined)return emptyHealth();
 if(!d||typeof d!=='object'||Array.isArray(d)||!Array.isArray(d.weights)||!d.days||typeof d.days!=='object'||Array.isArray(d.days)||typeof d.motion!=='boolean')throw Error('몸 관리 백업 형식을 확인해 주세요.');
 if(d.weights.length>50000||Object.keys(d.days).length>50000)throw Error('몸 관리 기록이 너무 많아요.');
 const seen=new Set();const weights=d.weights.map(w=>{const n=validateWeight(w);if(seen.has(n.date))throw Error('같은 날짜에 체중 기록이 중복되어 있어요.');seen.add(n.date);return n;}).sort((a,b)=>a.date.localeCompare(b.date));
 const days={};for(const [date,day]of Object.entries(d.days)){if(!validDate(date))throw Error('생활 기록 날짜를 확인해 주세요.');days[date]=validateDay(day);}
 return{profile:d.profile==null?null:validateProfile(d.profile),weights,days,motion:d.motion};
}
export function bmiCategory(bmi){
 if(!Number.isFinite(bmi)||bmi<=0)throw Error('BMI 값을 확인해 주세요.');
 const group=bmi<18.5?['저체중','low']:bmi<23?['정상 범위','normal']:bmi<25?['비만 전단계','elevated']:bmi<30?['1단계 비만','high']:bmi<35?['2단계 비만','high']:['3단계 비만','high'];
 return{label:group[0],tone:group[1]};
}
export function bodyMetrics(profile,weight){
 const p=validateProfile(profile);number(weight,20,500,'체중');
 const bmi=weight/(p.height/100)**2;
 const bmr=10*weight+6.25*p.height-5*p.age+(p.sex==='male'?5:-161);
 return{bmi,category:bmiCategory(bmi),bmr,tdee:bmr*ACTIVITIES[p.activity].factor,factor:ACTIVITIES[p.activity].factor};
}
export function energyPlan(profile,weight){
 const p=validateProfile(profile),m=bodyMetrics(p,weight),factor=p.goalMode==='lose'?.9:p.goalMode==='gain'?1.1:1;
 let reason='';
 if(p.goalMode==='lose'&&(m.bmi<18.5||(p.goalWeight!=null&&p.goalWeight/(p.height/100)**2<18.5)))reason='현재 또는 목표 체중이 저체중 범위여서 감량 목표를 자동 제시하지 않아요.';
 if(p.goalMode==='lose'&&p.goalWeight!=null&&p.goalWeight>=weight)reason='목표 체중에 도달했거나 현재 체중 이상이에요. 유지 목표를 확인해 주세요.';
 if(p.goalMode==='gain'&&p.goalWeight!=null&&p.goalWeight<=weight)reason='목표 체중에 도달했거나 현재 체중 이하예요. 유지 목표를 확인해 주세요.';
 const kcal=Math.round(m.tdee*factor/10)*10;
 if(kcal<(p.sex==='male'?1500:1200))reason='계산값이 앱의 자동 목표 범위보다 낮아요. 개인별 목표는 전문가와 확인해 주세요.';
 return{kcal:reason?null:kcal,reason,factor,mode:p.goalMode};
}
export function upsertWeight(weights,record){const r=validateWeight(record);return [...weights.filter(w=>w.date!==r.date),r].sort((a,b)=>a.date.localeCompare(b.date));}
export function weightSummary(weights,target,date){
 const list=weights.filter(w=>w.date<=date).sort((a,b)=>a.date.localeCompare(b.date)),first=list[0]??null,current=list.at(-1)??null;
 const change=current?current.weight-first.weight:null;
 let progress=null;
 if(current&&Number.isFinite(target))progress=first.weight===target?(current.weight===target?100:0):Math.max(0,Math.min(100,(first.weight-current.weight)/(first.weight-target)*100));
 const last7=list.filter(w=>epoch(w.date)>=epoch(date)-6*dayMs);
 return{first,current,change,progress,remaining:current&&Number.isFinite(target)?Math.abs(current.weight-target):null,average:last7.length?last7.reduce((s,w)=>s+w.weight,0)/last7.length:null,count:list.length};
}
export function weightSeries(weights,date,range='30'){
 const list=weights.filter(w=>w.date<=date).sort((a,b)=>a.date.localeCompare(b.date));
 const cutoff=range==='all'?-Infinity:epoch(date)-(Number(range)-1)*dayMs;
 return list.filter(w=>epoch(w.date)>=cutoff).map(w=>{
  const recent=list.filter(a=>a.date<=w.date&&epoch(a.date)>=epoch(w.date)-6*dayMs);
  return{...w,time:epoch(w.date),average:recent.reduce((s,a)=>s+a.weight,0)/recent.length};
 });
}
export function chartBounds(series,target=null){
 const values=series.flatMap(d=>[d.weight,d.average]).filter(Number.isFinite);if(Number.isFinite(target))values.push(target);
 if(!values.length)return{min:0,max:1};
 const low=Math.min(...values),high=Math.max(...values),padding=Math.max(.6,(high-low)*.15);
 return{min:low-padding,max:high+padding};
}
export function weekActivity(days,date){
 const weekDay=new Date(epoch(date)).getUTCDay(),start=epoch(date)-((weekDay+6)%7)*dayMs;
 const list=Object.entries(days).filter(([d])=>epoch(d)>=start&&d<=date).map(([,d])=>d),sleep=list.filter(d=>d.sleep!=null);
 return{exercise:list.reduce((s,d)=>s+(d.exercise||0),0),strength:list.filter(d=>d.strength).length,steps:list.reduce((s,d)=>s+(d.steps||0),0),sleep:sleep.length?sleep.reduce((s,d)=>s+d.sleep,0)/sleep.length:null};
}
