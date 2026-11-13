import test from 'node:test';import assert from 'node:assert/strict';
import {MODEL,buildAgentSnapshot,runAgent,apiErrorMessage,extractAnswer} from '../agent-core.js';import {emptyState} from '../core.js';
test('agent snapshot includes auto lunch honestly and only selected safe fields',()=>{
 const s=emptyState();s.extraSecret='do-not-send';s.health.profile={height:170,age:30,sex:'female',activity:'light',goalWeight:60,goalMode:'maintain',targetDate:null};s.health.weights=[{date:'2026-11-13',weight:65,note:'private note'}];
 const result=buildAgentSnapshot(s,'2026-11-13','2026-11-13',[]);assert.equal(result.day.totals.kcal,950);assert.equal(result.day.foods[0].automatic,true);assert.equal(result.day.foods[0].protein,null);assert.equal(result.week.length,7);assert(!JSON.stringify(result).includes('do-not-send'));assert(!JSON.stringify(result).includes('private note'));
});
test('real tool results are sent back before the final answer, without embedding the key in body',async()=>{
 const requests=[];let count=0;const fetcher=async(url,opt)=>{requests.push({url,...opt});const body=++count===1?{candidates:[{content:{role:'model',parts:[{functionCall:{name:'get_day_report',args:{}},thoughtSignature:'keep-signature'}]}}]}:{candidates:[{content:{role:'model',parts:[{text:'학교 점심은 950kcal로 자동 반영됐어요.'}]}}]};return{ok:true,status:200,json:async()=>body};};
 const result=await runAgent({key:'test-secret',history:[{role:'user',text:'오늘 기록 분석'}],execute:async name=>({kcal:950}),fetcher});assert.equal(result.text,'학교 점심은 950kcal로 자동 반영됐어요.');assert.equal(requests.length,2);assert(requests.every(r=>r.url.includes(MODEL)));assert(requests.every(r=>!r.body.includes('test-secret')));const second=JSON.parse(requests[1].body);assert.equal(second.contents[1].parts[0].thoughtSignature,'keep-signature');assert.equal(second.contents[2].parts[0].functionResponse.response.result.kcal,950);
});
test('network failures and quota errors are explicit and never fake AI success',async()=>{
 await assert.rejects(()=>runAgent({key:'x',history:[{role:'user',text:'분석'}],execute:async()=>({}),fetcher:async()=>({ok:false,status:429,json:async()=>({})})}),/할당량/);
 assert.match(apiErrorMessage(403),/권한|키/);assert.equal(extractAnswer({candidates:[{content:{parts:[{text:'hidden',thought:true},{text:'answer'}]}}]}),'answer');
});
test('unknown tools are not executed; maximum rounds are bounded',async()=>{
 let executed=false;await assert.rejects(()=>runAgent({key:'x',history:[{role:'user',text:'분석'}],execute:async()=>{executed=true;},fetcher:async()=>({ok:true,status:200,json:async()=>({candidates:[{content:{role:'model',parts:[{functionCall:{name:'delete_records',args:{}}}]}}]})})}),/지원하지 않는|확인하지 못/);assert.equal(executed,false);
 let calls=0;await assert.rejects(()=>runAgent({key:'x',history:[{role:'user',text:'분석'}],execute:async()=>({}),fetcher:async()=>{calls++;return{ok:true,status:200,json:async()=>({candidates:[{content:{role:'model',parts:[{functionCall:{name:'get_day_report',args:{}}}]}}]})};}}),/처리 단계/);assert(calls<=4);
});
test('every new question requires a fresh selected-day tool report even with old conversation',async()=>{
 let request;await assert.rejects(()=>runAgent({key:'x',history:[{role:'user',text:'이전 날짜'},{role:'model',text:'이전 분석'},{role:'user',text:'지금 날짜는?'}],execute:async()=>({}),fetcher:async(url,opt)=>{request=JSON.parse(opt.body);return{ok:true,status:200,json:async()=>({candidates:[{content:{role:'model',parts:[{text:'도구를 안 쓴 추측'}]}}]})};}}),/기록을 확인하지 못/);
 assert.deepEqual(request.toolConfig.functionCallingConfig,{mode:'ANY',allowedFunctionNames:['get_day_report']});
});
test('aborting an active request prevents subsequent tool network rounds',async()=>{
 const controller=new AbortController();let calls=0;
 await assert.rejects(()=>runAgent({key:'x',history:[{role:'user',text:'분석'}],signal:controller.signal,execute:async()=>({kcal:950}),fetcher:async()=>{calls++;controller.abort();return{ok:true,status:200,json:async()=>({candidates:[{content:{role:'model',parts:[{functionCall:{name:'get_day_report',args:{}}}]}}]})};}}),{name:'AbortError'});
 assert.equal(calls,1);
});
