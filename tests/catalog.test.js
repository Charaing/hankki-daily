import test from 'node:test';import assert from 'node:assert/strict';
import {foodKind,groupFoods} from '../food-catalog.js';import {foodFromRow,validateFood,validateBackup,emptyState} from '../core.js';
const rice={id:'D1',name:'쌀밥',kcal:166,carbs:37,protein:3,fat:.3,unit:'g',serving:210,brand:'',origin:'외식',source:'mfds',category:'밥류'};
test('prepared dishes and raw ingredients are separate from packaged products, including old backups',()=>{
 assert.equal(foodKind(rice),'homemade');assert.equal(foodKind({...rice,id:'RDA1'}),'homemade');assert.equal(foodKind({...rice,id:'P1'}),'packaged');assert.equal(foodKind({...rice,id:'off-1',source:'off'}),'packaged');
 assert.equal(validateFood({...rice,kind:'packaged'}).kind,'packaged');assert.equal(foodFromRow(['P1','쌀밥',100,20,2,1,'g',200,0,'제조사','포장'],['밥']).kind,'packaged');
 const s=validateBackup({...emptyState(),customFoods:[{...rice,id:'custom-1',source:'custom',kind:'packaged'}]});assert.equal(s.customFoods[0].kind,'packaged');
});
test('equivalent foods appear once while different calories, macros, units or portions remain selectable',()=>{
 const all=[rice,{...rice,id:'D2',name:'쌀 밥',origin:'다른 출처'},{...rice,id:'D3',kcal:150},{...rice,id:'D4',protein:6},{...rice,id:'D5',unit:'ml'},{...rice,id:'D6',serving:100}];
 const groups=groupFoods(all);assert.equal(groups.length,1);assert.equal(groups[0].variants.length,5);assert.equal(groups[0].food.unit,'g');assert.equal(all.length,6);
 const branded=[{...rice,id:'P1',brand:'A'},{...rice,id:'P2',brand:'B'},rice];assert.equal(groupFoods(branded).length,3);
});
