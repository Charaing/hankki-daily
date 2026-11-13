import {emptyHealth,validateHealth} from './health-core.js?v=1.2.2';
import {defaultSchool,validateSchool,schoolNutrition} from './school-core.js?v=1.2.2';
export const MEALS = ['breakfast','lunch','dinner','snack'];
export const DEFAULT_GOALS = {kcal:2000,carbs:250,protein:100,fat:67,water:2000};
export const normalizeQuery = s => String(s).normalize('NFKC').toLowerCase().replace(/\s+/g,'');
const rounded = x => Math.round((x+Number.EPSILON)*100)/100;
export const formatAmount = n => Number(n).toLocaleString('ko-KR',{maximumFractionDigits:Number(n)>0&&Number(n)<0.01?6:2});
export function dateKey(d=new Date()) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function shiftDate(key,days) { const [y,m,d]=key.split('-').map(Number);return dateKey(new Date(y,m-1,d+days,12)); }
export function validDate(s) { return typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && s>='1900-01-01' && s<='2200-12-31' && shiftDate(s,0)===s; }
export function calculate(food,amount,mode='weight',servingOverride=null) {
  if(!Number.isFinite(amount)||amount<=0||amount>100000) throw new RangeError('양은 0보다 크고 100,000 이하로 입력해 주세요.');
  if(!['weight','serving'].includes(mode)) throw new RangeError('단위를 확인해 주세요.');
  const serving=servingOverride??food.serving;
  if(mode==='serving'&&(!Number.isFinite(serving)||serving<=0)) throw new RangeError('1인분 기준량을 입력해 주세요.');
  const weight=mode==='serving'?amount*serving:amount;
  if(weight>100000) throw new RangeError('총 섭취량은 100,000 이하로 입력해 주세요.');
  const result={weight:rounded(weight),unit:food.unit};
  for(const key of ['kcal','carbs','protein','fat']) result[key]=food[key]==null?null:rounded(food[key]*weight/100);
  return result;
}
export function convertAmount(amount,from,to,servingSize){
  if(!Number.isFinite(amount)||amount<=0||!Number.isFinite(servingSize)||servingSize<=0)throw new RangeError('먹은 양과 1인분 기준량을 확인해 주세요.');
  return from===to?amount:to==='serving'?amount/servingSize:amount*servingSize;
}
export function summarize(entries) {
  const sum={kcal:0,carbs:0,protein:0,fat:0,incomplete:0};
  for(const e of entries) {
    const n=entryNutrition(e);
    for(const k of ['kcal','carbs','protein','fat']) sum[k]+=n[k]??0;
    if([n.carbs,n.protein,n.fat].includes(null))sum.incomplete++;
  }
  for(const k of ['kcal','carbs','protein','fat'])sum[k]=rounded(sum[k]);
  return sum;
}
export function entryNutrition(e){return e.kind==='school-lunch'&&e.auto?schoolNutrition(e.kcal,e.food):calculate(e.food,e.amount,e.mode,e.servingSize);}
export function foodFromRow(r,categories=[]) {
  return {id:r[0],name:r[1],kcal:r[2],carbs:r[3],protein:r[4],fat:r[5],unit:r[6],serving:r[7],category:categories[r[8]]||'기타',brand:r[9],origin:r[10],source:'mfds'};
}
export function validateFood(f) {
  if(!f||typeof f.id!=='string'||!f.id||f.id.length>180||typeof f.name!=='string'||!f.name.trim()||f.name.length>300||!['g','ml'].includes(f.unit))throw Error('음식 정보를 확인해 주세요.');
  for(const k of ['kcal','carbs','protein','fat'])if(!(k!=='kcal'&&f[k]===null)&&(!Number.isFinite(f[k])||f[k]<0||f[k]>10000))throw Error('음식 영양성분을 확인해 주세요.');
  if(f.serving!=null&&(!Number.isFinite(f.serving)||f.serving<=0||f.serving>100000))throw Error('음식 기준량을 확인해 주세요.');
  return {id:f.id,name:f.name.trim(),kcal:f.kcal,carbs:f.carbs,protein:f.protein,fat:f.fat,unit:f.unit,serving:f.serving??null,category:String(f.category||'직접 등록').slice(0,100),brand:String(f.brand||'').slice(0,200),origin:String(f.origin||'').slice(0,200),source:['mfds','rda','off','custom'].includes(f.source)?f.source:'custom'};
}
export function emptyState(){return{version:1,entries:[],customFoods:[],favorites:[],water:{},goals:{...DEFAULT_GOALS},health:emptyHealth(),school:defaultSchool()};}
export function validateBackup(d) {
  if(!d||d.version!==1||!Array.isArray(d.entries)||!Array.isArray(d.customFoods)||!Array.isArray(d.favorites)||!d.water||typeof d.water!=='object'||Array.isArray(d.water)||!d.goals)throw Error('한끼 백업 파일 형식이 아니에요.');
  if(d.entries.length>50000||d.customFoods.length>10000||d.favorites.length>10000)throw Error('백업 파일이 너무 커요.');
  const ids=new Set();
  const entries=d.entries.map(e=>{
    if(!e||typeof e.id!=='string'||!e.id||ids.has(e.id)||!validDate(e.date)||!MEALS.includes(e.meal))throw Error('식단 기록 형식을 확인해 주세요.');
    if(e.servingSize!=null&&(!Number.isFinite(e.servingSize)||e.servingSize<=0||e.servingSize>100000))throw Error('1인분 기준량을 확인해 주세요.');
    ids.add(e.id);const food=validateFood(e.food);calculate(food,e.amount,e.mode,e.servingSize);
    return {id:e.id,date:e.date,meal:e.meal,food,amount:e.amount,mode:e.mode,servingSize:e.servingSize??null,createdAt:Number.isFinite(e.createdAt)?e.createdAt:Date.now()};
  });
  const goals={};for(const k of Object.keys(DEFAULT_GOALS)){
    const n=d.goals[k];if(!Number.isFinite(n)||n<=0||n>(k==='kcal'?20000:k==='water'?20000:5000))throw Error('목표 수치를 확인해 주세요.');goals[k]=n;
  }
  const water={};for(const [key,n]of Object.entries(d.water)){if(!validDate(key)||!Number.isFinite(n)||n<0||n>20000)throw Error('물 기록을 확인해 주세요.');water[key]=n;}
  const customFoods=d.customFoods.map(validateFood);
  const favorites=d.favorites.map(validateFood);
  return {version:1,entries,customFoods,favorites,water,goals,health:validateHealth(d.health),school:validateSchool(d.school)};
}
