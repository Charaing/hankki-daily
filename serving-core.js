import {calculate,validateFood} from './core.js?v=1.4.0';
export function oneServing(food,grams=food.serving){
 if(!Number.isFinite(grams)||grams<=0||grams>100000)return{weight:null,unit:food.unit,kcal:null,carbs:null,protein:null,fat:null};
 return calculate(food,1,'serving',grams);
}
export function foodFromServing(food){
 const grams=food.serving;if(!Number.isFinite(grams)||grams<=0||grams>100000)throw Error('1인분 무게를 입력해 주세요.');
 const values={};for(const k of ['kcal','carbs','protein','fat'])values[k]=food[k]==null&&k!=='kcal'?null:food[k]*100/grams;
 return validateFood({...food,...values});
}
