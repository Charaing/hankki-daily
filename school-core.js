// Calendar snapshot checked 2026-11-13 against KASI and KASA publications.
export const HOLIDAYS={
 '2026':{'01-01':'신정','02-16':'설 연휴','02-17':'설날','02-18':'설 연휴','03-01':'삼일절','03-02':'삼일절 대체공휴일','05-01':'노동절','05-05':'어린이날','05-24':'부처님오신날','05-25':'부처님오신날 대체공휴일','06-03':'전국동시지방선거','06-06':'현충일','07-17':'제헌절','08-15':'광복절','08-17':'광복절 대체공휴일','09-24':'추석 연휴','09-25':'추석','09-26':'추석 연휴','10-03':'개천절','10-05':'개천절 대체공휴일','10-09':'한글날','12-25':'성탄절'},
 '2027':{'01-01':'신정','02-06':'설 연휴','02-07':'설날','02-08':'설 연휴','02-09':'설날 대체공휴일','03-01':'삼일절','05-01':'노동절','05-03':'노동절 대체공휴일','05-05':'어린이날','05-13':'부처님오신날','06-06':'현충일','07-17':'제헌절','07-19':'제헌절 대체공휴일','08-15':'광복절','08-16':'광복절 대체공휴일','09-14':'추석 연휴','09-15':'추석','09-16':'추석 연휴','10-03':'개천절','10-04':'개천절 대체공휴일','10-09':'한글날','10-11':'한글날 대체공휴일','12-25':'성탄절','12-27':'성탄절 대체공휴일'}
};
const isoDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&s>='1900-01-01'&&s<='2200-12-31'&&Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
export function defaultSchool(){return{enabled:true,kcal:950,startDate:'2026-11-13',excludedDates:[],breaks:[]};}
export function validateSchool(c){
 if(c===undefined)return defaultSchool();
 if(!c||typeof c!=='object'||Array.isArray(c)||typeof c.enabled!=='boolean'||!Number.isFinite(c.kcal)||c.kcal<1||c.kcal>3000||!isoDate(c.startDate)||!Array.isArray(c.excludedDates)||!Array.isArray(c.breaks))throw Error('학교 점심 설정을 확인해 주세요.');
 if(c.excludedDates.length>10000||c.breaks.length>200)throw Error('학교 휴업일 설정이 너무 많아요.');
 if(c.excludedDates.some(d=>!isoDate(d)))throw Error('학교 점심 제외 날짜를 확인해 주세요.');
 const breaks=c.breaks.map(b=>{if(!b||!isoDate(b.start)||!isoDate(b.end)||b.start>b.end)throw Error('방학 시작일과 종료일을 확인해 주세요.');return{start:b.start,end:b.end};});
 return{enabled:c.enabled,kcal:c.kcal,startDate:c.startDate,excludedDates:[...new Set(c.excludedDates)].sort(),breaks};
}
export function schoolDayStatus(c,date,today){
 if(!isoDate(date)||!isoDate(today))return{eligible:false,reason:'날짜 확인 필요'};
 if(!c.enabled)return{eligible:false,reason:'자동 반영 꺼짐'};
 if(date<c.startDate)return{eligible:false,reason:'적용 시작 전'};
 if(date>today)return{eligible:false,reason:'미래 날짜'};
 if(!Object.hasOwn(HOLIDAYS,date.slice(0,4)))return{eligible:false,reason:'이 연도 공휴일 정보 확인 필요'};
 const holiday=HOLIDAYS[date.slice(0,4)][date.slice(5)];if(holiday)return{eligible:false,reason:holiday,holiday:true};
 const day=new Date(date+'T12:00:00Z').getUTCDay();if(day===0||day===6)return{eligible:false,reason:'주말'};
 if(c.excludedDates.includes(date))return{eligible:false,reason:'직접 제외한 날',excluded:true};
 if(c.breaks.some(b=>b.start<=date&&date<=b.end))return{eligible:false,reason:'방학·휴업 기간'};
 return{eligible:true,reason:'평일 학교 점심 자동 반영'};
}
export function schoolNutrition(kcal){if(!Number.isFinite(kcal)||kcal<1||kcal>3000)throw Error('학교 점심 열량을 확인해 주세요.');return{kcal,carbs:null,protein:null,fat:null,weight:null,unit:'portion'};}
export function entriesForDay(state,date,today){
 const config=state.school??defaultSchool(),id='school-lunch-'+date;
 const entries=state.entries.filter(e=>e.date===date&&!(e.auto&&e.kind==='school-lunch'));
 if(schoolDayStatus(config,date,today).eligible&&!entries.some(e=>e.id===id))entries.push({id,date,meal:'lunch',kind:'school-lunch',auto:true,kcal:config.kcal,food:{id:'school-lunch',name:'학교 점심',kcal:config.kcal,carbs:null,protein:null,fat:null,unit:'portion',serving:null,source:'school'},amount:1,mode:'serving'});
 return entries;
}
