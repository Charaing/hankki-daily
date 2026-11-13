import {MEALS,DEFAULT_GOALS,calculate,entryNutrition,convertAmount,summarize,dateKey,shiftDate,validDate,foodFromRow,validateFood,validateBackup,emptyState,normalizeQuery,formatAmount} from './core.js?v=1.2.2';
import {icon,hydrateIcons} from './icons.js?v=1.2.2';
import {createHealthFeature} from './health-ui.js?v=1.2.2';
import {animateContent,setMotion} from './app-motion.js?v=1.2.2';
import {entriesForDay} from './school-core.js?v=1.2.2';
import {createSchoolFeature} from './school-ui.js?v=1.2.2';
import {createAgentFeature} from './agent-ui.js?v=1.2.2';
import {decorateWorkspace,workspaceSection} from './workspace-ui.js?v=1.2.2';

const $=s=>document.querySelector(s);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>formatAmount(n??0), int=n=>Math.round(n??0).toLocaleString('ko-KR');
const uid=()=>crypto.randomUUID();
const unit=f=>f.unit==='ml'?'mL':'g';
const labels={breakfast:'아침',lunch:'점심',dinner:'저녁',snack:'간식'};
const mealIcons={breakfast:'sunrise',lunch:'sun',dinner:'moon',snack:'cookie'};
const mealTimes={breakfast:'하루를 시작하는 한 끼',lunch:'오후를 채우는 한 끼',dinner:'하루를 마무리하는 한 끼',snack:'틈틈이 먹은 간식'};
const filters=['전체','한식','밥·면','고기·생선','과일·채소','빵·간식','음료'];
const sourceLabel=f=>({mfds:'식품의약품안전처',rda:'농촌진흥청 · 국가표준식품성분표',custom:'내가 등록한 음식',off:'Open Food Facts'}[f.source]||'공개 식품 데이터');
let state=emptyState(), selectedDate=dateKey(), view=['body','report','library','agent'].includes(location.hash.slice(1))?location.hash.slice(1):'today', libraryTab='favorite', bootMessage='';
let manifest=null,featured=[],worker=null,workerLoaded=0,workerDone=false,workerFailed=0,searchSeq=0,searchTimer=null;
let searchTab='all',searchFilter='전체',searchResults=[],activeFoods=new Map(),selectedFood=null,selectedMeal='lunch',mode='weight',amount=100,servingSize=100,editingId=null;
let toastTimer=null,undoAction=null,onlineController=null,lastOnlineSearch=0,foodOpener=null;

try{
  const raw=localStorage.getItem('hankki.v1');
  if(raw){try{state=validateBackup(JSON.parse(raw));}catch{try{localStorage.setItem('hankki.recovery.'+Date.now(),raw);}catch{}bootMessage='저장된 데이터 형식을 확인할 수 없어요. 원본 복구 사본을 기기에 보관했어요.';}}
}catch{bootMessage='이 브라우저에서 기기 저장소를 사용할 수 없어요. 브라우저 설정을 확인해 주세요.';}
const health=createHealthFeature({getState:()=>state,getDate:()=>selectedDate,persist,notify,render,openView});
const school=createSchoolFeature({getState:()=>state,getDate:()=>selectedDate,persist,notify});
const agent=createAgentFeature({getState:()=>state,getDate:()=>selectedDate,getCandidates:()=>[...state.favorites,...state.customFoods,...featured],openView,notify});

function notify(message,undo=null){
  clearTimeout(toastTimer);undoAction=undo;
  $('#toast').innerHTML=`<span>${escape(message)}</span>${undo?'<button data-action="undo">되돌리기</button>':''}`;
  $('#toast').classList.add('show');toastTimer=setTimeout(()=>{$('#toast').classList.remove('show');undoAction=null;},undo?8500:4200);
}
function persist(next){
  try{localStorage.setItem('hankki.v1',JSON.stringify(next));state=next;render();return true;}
  catch{notify('기기 저장 공간이 부족해요. 백업 후 공간을 확보해 주세요.');return false;}
}
function dayEntries(key=selectedDate){return entriesForDay(state,key,dateKey());}
function weekDates(){const [y,m,d]=selectedDate.split('-').map(Number);const day=new Date(y,m-1,d,12).getDay();const start=shiftDate(selectedDate,-((day+6)%7));return Array.from({length:7},(_,i)=>shiftDate(start,i));}
function dayLabel(key,short=false){const d=new Date(key+'T12:00:00');return d.toLocaleDateString('ko-KR',short?{month:'numeric',day:'numeric'}:{month:'long',day:'numeric',weekday:'long'});}
function emoji(f){const s=f.name+' '+f.category;if(/커피|아메리카노|라떼|에스프레소/.test(s))return '☕';if(/물$|생수/.test(f.name))return '💧';if(/우유|요거트|유제품|치즈/.test(s))return '🥛';if(/주스|음료|주류|차류/.test(s))return '🧃';if(/바나나/.test(s))return '🍌';if(/사과/.test(s))return '🍎';if(/딸기/.test(s))return '🍓';if(/과일|과실/.test(s))return '🍊';if(/김밥|초밥/.test(s))return '🍙';if(/밥|곡류/.test(s))return '🍚';if(/면|국수|파스타|라면/.test(s))return '🍜';if(/닭/.test(s))return '🍗';if(/고기|육류|삼겹|불고기/.test(s))return '🥩';if(/달걀|계란/.test(s))return '🥚';if(/생선|어패|수산|연어|참치/.test(s))return '🐟';if(/빵|토스트|베이글/.test(s))return '🍞';if(/과자|쿠키|초코/.test(s))return '🍪';if(/아이스|빙과/.test(s))return '🍦';if(/떡/.test(s))return '🍡';if(/고구마/.test(s))return '🍠';if(/샐러드|채소|나물|버섯|김치/.test(s))return '🥗';if(/국|찌개|탕|죽|스프/.test(s))return '🥘';return '🍽️';}
function ring(pct){const circumference=402.12;return `<div class="ring"><svg viewBox="0 0 150 150" aria-hidden="true"><circle class="ring-track" cx="75" cy="75" r="64"/><circle class="ring-progress" cx="75" cy="75" r="64" stroke-dasharray="${circumference}" stroke-dashoffset="${circumference*(1-Math.min(pct,100)/100)}"/></svg><div class="ring-center"><span class="ring-symbol">${icon('bowl',26)}</span><small>목표의 ${Math.round(pct)}%</small></div></div>`;}
function caloriePanel(){
  const n=summarize(dayEntries()),g=state.goals,pct=n.kcal/g.kcal*100,remaining=g.kcal-n.kcal;
  return `<section class="panel calorie-panel" aria-labelledby="calorie-heading"><div class="calorie-top"><h2 id="calorie-heading" class="panel-label">오늘 섭취한 칼로리</h2><button class="text-button" data-action="settings">목표 바꾸기 ${icon('chevron-right',14)}</button></div><div class="calorie-overview">${ring(pct)}<div class="calorie-values"><p class="calorie-goal">하루 목표 <strong>${int(g.kcal)} kcal</strong></p><div class="calorie-number"><strong data-testid="total-calories">${int(n.kcal)}</strong><span>kcal</span></div><p class="remaining">${remaining>=0?`목표까지 <strong>${int(remaining)} kcal</strong> 남았어요`:`목표보다 <strong>${int(-remaining)} kcal</strong> 더 먹었어요`}</p></div></div><div class="macro-grid">${[['carbs','탄수화물'],['protein','단백질'],['fat','지방']].map(([k,t])=>`<div class="macro"><p class="macro-title"><i class="macro-dot"></i>${t}</p><p class="macro-amount">${fmt(n[k])}<small> / ${fmt(g[k])} g</small></p><div class="progress-track" role="progressbar" aria-label="${t} 목표 대비 섭취량" aria-valuenow="${Math.min(100,Math.round(n[k]/g[k]*100))}" aria-valuemin="0" aria-valuemax="100"><span style="width:${Math.min(100,n[k]/g[k]*100)}%"></span></div></div>`).join('')}</div>${n.incomplete?`<p class="missing-note">영양소 정보가 없는 음식 ${n.incomplete}건은 확인된 값만 합산했어요.</p>`:''}</section>`;
}
function mealPanel(){const entries=dayEntries();return `<section class="panel meal-panel" aria-labelledby="meal-heading"><div class="panel-header"><h2 id="meal-heading">끼니별 기록<span class="meal-count">${entries.length}개 음식</span></h2><span class="small-chip">한 끼씩 차곡차곡</span></div>${MEALS.map(m=>{const list=entries.filter(e=>e.meal===m);return `<div class="meal-block"><div class="meal-heading"><div class="meal-icon ${m}">${icon(mealIcons[m],22)}</div><div class="meal-name"><h3>${labels[m]}</h3><p>${list.length?`${list.length}개 음식 기록` :mealTimes[m]}</p></div><span class="meal-kcal">${list.length?int(summarize(list).kcal)+' kcal':''}</span><button class="add-meal" data-action="add-meal" data-meal="${m}" aria-label="${labels[m]} 음식 추가">${icon('plus',19)}</button></div>${list.length?list.map(e=>{const n=entryNutrition(e);return `<div class="food-entry ${e.auto?'automatic-entry':''}"><button class="entry-main" data-action="edit-entry" data-id="${escape(e.id)}" aria-label="${escape(e.food.name)} 기록 수정"><span style="min-width:0"><span class="entry-name">${escape(e.food.name)}</span><span class="entry-amount">${e.auto?`${n.carbs==null?'—':fmt(n.carbs)} / ${n.protein==null?'—':fmt(n.protein)} / ${n.fat==null?'—':fmt(n.fat)} g · 탄/단/지 추정 평균`:`${e.mode==='serving'?`${fmt(e.amount)}인분 · `:''}${fmt(n.weight)} ${unit(e.food)}`}</span></span><span class="entry-kcal">${int(n.kcal)} kcal</span></button><button class="entry-delete" data-action="delete-entry" data-id="${escape(e.id)}" aria-label="${escape(e.food.name)} 기록 삭제">${icon('x',15)}</button></div>`;}).join(''):`<div class="empty-meal"><p>아직 기록한 음식이 없어요</p><button data-action="add-meal" data-meal="${m}">음식 기록하기</button></div>`}</div>`;}).join('')}<p class="meal-tip">${icon('shield',13)}기록은 이 브라우저에만 안전하게 저장돼요</p></section>`;}
function weekPanel(){const dates=weekDates(),counts=dates.map(d=>dayEntries(d)),totals=counts.map(e=>summarize(e).kcal),days=counts.filter(e=>e.length).length,recorded=totals.filter((_,i)=>counts[i].length),max=Math.max(...totals,state.goals.kcal);return `<section class="panel week-panel" aria-labelledby="week-heading"><div class="panel-header"><h2 id="week-heading">이번 주 기록</h2><button class="text-button" data-action="view" data-view="report" aria-label="이번 주 리포트 보기">${icon('chevron-right',17)}</button></div><p class="week-summary">${days?`<span>${days}일</span>을 함께했어요`:'첫 한 끼를 기다려요'}<small>${days?'작은 기록이 차곡차곡 쌓이고 있어요':'완벽한 식단보다 꾸준한 기록부터'}</small></p><div class="week-bars">${dates.map((d,i)=>`<button class="week-day ${d===selectedDate?'selected':''} ${counts[i].length?'has-data':''}" data-action="set-date" data-date="${d}" aria-label="${dayLabel(d)} ${int(totals[i])} 킬로칼로리"><span class="week-bar-shell"><span class="week-bar" style="height:${Math.max(5,totals[i]/max*76)}px"></span></span><span class="day">${['월','화','수','목','금','토','일'][i]}</span></button>`).join('')}</div><div class="week-footer"><span>기록한 날 평균</span><strong>${recorded.length?int(recorded.reduce((a,b)=>a+b,0)/recorded.length):'—'} ${recorded.length?'kcal':''}</strong></div></section>`;}
function waterPanel(){const water=state.water[selectedDate]||0;const glasses=Math.min(8,Math.floor(water/250));return `<section class="panel water-panel" aria-labelledby="water-heading"><div class="panel-header"><h2 id="water-heading" class="water-heading-icon"><span>${icon('drop',18)}</span>물도 잊지 말아요</h2><span class="small-chip">${Math.round(water/state.goals.water*100)}%</span></div><p class="water-value">${fmt(water/1000)}<small> / ${fmt(state.goals.water/1000)} L</small></p><div class="water-glasses" aria-label="물 ${water} 밀리리터 기록">${Array.from({length:8},(_,i)=>`<span class="water-glass ${i<glasses?'filled':''}">${icon('glass',25,i<glasses)}</span>`).join('')}</div><div class="water-controls"><button data-action="water-minus" aria-label="물 250밀리리터 줄이기">${icon('minus',16)}</button><button data-action="water-add">${icon('plus',14)} 250 mL 마셨어요</button></div></section>`;}
function renderToday(){return `<div class="dashboard-grid"><div class="main-column">${school.badge()}${caloriePanel()}${mealPanel()}</div><aside class="side-column" aria-label="기록 요약">${waterPanel()}${weekPanel()}${health.renderSummary()}<button class="coach-shortcut" data-action="view" data-view="agent"><span>${icon('sparkle',20)}</span><div><strong>오늘 식단, 함께 살펴볼까요?</strong><small>한끼 AI 코치에게 물어보기</small></div>${icon('chevron-right',18)}</button></aside></div>`;}

function renderReport(){
  const dates=weekDates(),lists=dates.map(d=>dayEntries(d)),totals=lists.map(summarize),all=lists.flat(),recorded=lists.filter(e=>e.length).length;
  const average=recorded?totals.reduce((a,n)=>a+n.kcal,0)/recorded:0,max=Math.max(...totals.map(t=>t.kcal),state.goals.kcal),totalWater=dates.reduce((a,d)=>a+(state.water[d]||0),0);
  const macro=summarize(all),macroTotal=macro.carbs*4+macro.protein*4+macro.fat*9;
  return `<div class="report-grid"><section class="panel report-hero"><div><h2>나의 한 주 돌아보기</h2><p>${dayLabel(dates[0],true)} — ${dayLabel(dates[6],true)} · 기록한 날을 기준으로 계산해요</p></div><div class="report-stat"><span>하루 평균 섭취</span><strong>${recorded?int(average):'—'}<small>${recorded?'kcal':''}</small></strong></div><div class="report-stat"><span>기록한 날</span><strong>${recorded}<small>/ 7일</small></strong></div><div class="report-stat"><span>남긴 음식</span><strong>${all.length}<small>개</small></strong></div></section><section class="panel chart-panel"><div class="chart-title"><h2>일별 칼로리</h2><span class="chart-legend"><i></i>섭취 칼로리</span></div><div class="report-chart">${dates.map((d,i)=>`<button class="report-day ${selectedDate===d?'selected':''}" data-action="report-date" data-date="${d}" aria-label="${dayLabel(d)} 기록 보기"><span>${lists[i].length?int(totals[i].kcal):'—'}</span><div class="report-bar" style="height:${Math.max(5,totals[i].kcal/max*170)}px"></div><small>${['월','화','수','목','금','토','일'][i]} ${Number(d.slice(-2))}</small></button>`).join('')}</div><p class="report-note">${all.length?'막대를 누르면 해당 날짜의 식단으로 이동해요.':'음식을 기록하면 나의 일주일이 그래프로 채워져요.'}</p></section><section class="panel habit-panel"><h2>이번 주의 영양 균형</h2>${[['탄수화물',macro.carbs*4,macro.carbs],['단백질',macro.protein*4,macro.protein],['지방',macro.fat*9,macro.fat]].map(([name,cal,g])=>`<div class="habit-item"><span>${name}</span><strong>${macroTotal?Math.round(cal/macroTotal*100):0}% · ${fmt(g)} g</strong></div>`).join('')}<div class="habit-item"><span>마신 물 합계</span><strong>${fmt(totalWater/1000)} L</strong></div><p class="report-note">확인된 영양소의 열량 비율이에요.<br>탄수화물·단백질 4 kcal/g, 지방 9 kcal/g${all.some(e=>e.estimated)?'<br>학교 점심 영양소는 사용자 제공 추정 평균값을 포함해요.':''}</p></section><section class="panel history-panel"><div class="panel-header"><h2>날짜별 기록</h2><span class="small-chip">이번 주</span></div>${all.length?dates.map((d,i)=>lists[i].length?`<div class="history-row"><span class="history-date">${dayLabel(d,true)}</span><div><h3>${escape(lists[i].slice(0,3).map(e=>e.food.name).join(', '))}${lists[i].length>3?' 외 '+(lists[i].length-3)+'개':''}</h3><p>${lists[i].length}개 음식 · ${new Set(lists[i].map(e=>e.meal)).size}끼 기록</p></div><strong>${int(totals[i].kcal)} kcal</strong><button data-action="report-date" data-date="${d}" aria-label="${dayLabel(d)} 식단 보기">${icon('chevron-right',18)}</button></div>`:'').join(''):`<div class="empty-results">${icon('journal',36)}<h3>아직 이번 주 기록이 없어요</h3><p>오늘 먹은 음식부터 하나 남겨 볼까요?</p><button class="text-button" data-action="add-meal" data-meal="${autoMeal()}">첫 음식 기록하기 ${icon('chevron-right',14)}</button></div>`}</section></div>`;
}
function renderLibrary(){const list=libraryTab==='favorite'?state.favorites:state.customFoods;return `<div class="library-header"><p>자주 먹는 음식은 저장하고,<br class="mobile-only"> 나만의 음식도 만들어 보세요.</p><button class="btn btn--primary primary-button" data-action="custom-food">${icon('plus',16)}음식 직접 등록</button></div><div class="library-tabs"><button class="${libraryTab==='favorite'?'active':''}" data-action="library-tab" data-tab="favorite">즐겨찾기 ${state.favorites.length}</button><button class="${libraryTab==='custom'?'active':''}" data-action="library-tab" data-tab="custom">직접 등록 ${state.customFoods.length}</button></div><div class="library-grid">${list.length?list.map(f=>`<article class="library-food"><span class="food-emoji" aria-hidden="true">${emoji(f)}</span><button class="favorite-button ${state.favorites.some(x=>x.id===f.id)?'on':''}" data-action="library-star" data-id="${escape(f.id)}" aria-label="${escape(f.name)} 즐겨찾기 전환">${icon('star',19,state.favorites.some(x=>x.id===f.id))}</button><h2>${escape(f.name)}</h2><p>100 ${unit(f)} · ${fmt(f.kcal)} kcal</p><button class="btn btn--secondary secondary-button" data-action="library-add" data-id="${escape(f.id)}">${icon('plus',15)}식단에 기록</button></article>`).join(''):`<div class="library-empty"><span data-icon="${libraryTab==='favorite'?'heart':'bowl'}"></span><h2>${libraryTab==='favorite'?'자주 먹는 음식을 모아 두세요':'내 음식에 이름을 붙여 주세요'}</h2><p>${libraryTab==='favorite'?'음식 검색에서 별을 누르면 여기에 모여요.<br>다음 기록은 더 빨라질 거예요.':'직접 만든 요리, 목록에 없는 음식도<br>영양정보를 입력하면 언제든 기록할 수 있어요.'}</p><button class="btn btn--primary primary-button" data-action="${libraryTab==='favorite'?'open-search':'custom-food'}">${libraryTab==='favorite'?'음식 찾아보기':'음식 직접 등록'}</button></div>`}</div>`;}
function render(){
  const titles={today:'오늘의 식단',body:'나의 몸 관리',report:'기록 리포트',library:'음식 보관함',agent:'나의 AI 코치'};
  $('#page-title').textContent=titles[view];$('#eyebrow').textContent={today:'매일 조금씩, 나를 챙기는 시간',body:'숫자보다 흐름, 나의 속도로 건강하게',report:'기록 속에서 발견하는 나의 식습관',library:'좋아하는 음식, 가까운 곳에',agent:'기록을 읽고, 다음 선택을 함께'}[view];
  $('#date-toolbar').hidden=view==='library';$('#date-input').value=selectedDate;$('#date-title').textContent=dayLabel(selectedDate);$('#date-caption').textContent=view==='body'?'몸의 변화를 하루씩 남겨요':selectedDate===dateKey()?'오늘도 한 끼씩 기록해요':'내가 먹은 하루를 돌아봐요';
  document.querySelectorAll('[data-action="view"]').forEach(b=>{const on=b.dataset.view===view;b.classList.toggle('active',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  $('#page-content').innerHTML=(bootMessage?`<div class="error-banner">${escape(bootMessage)}</div>`:'')+(view==='today'?renderToday():view==='body'?health.renderBody():view==='report'?renderReport():view==='agent'?agent.renderView():renderLibrary());decorateWorkspace($('#page-content'),view);hydrateIcons();animateContent($('#page-content'),view,state.health.motion);
}
function autoMeal(){const h=new Date().getHours();return h<10?'breakfast':h<15?'lunch':h<21?'dinner':'snack';}
function openView(next){if(!['today','body','report','library','agent'].includes(next))return;view=next;history.replaceState(null,'',location.pathname+(next==='today'?'':'#'+next));render();window.scrollTo({top:0,behavior:'instant'});}
function setDate(d){if(validDate(d)){selectedDate=d;render();}}
function openDialog(id){const d=$(id);if(!d.open)d.showModal();}
function closeFood(){if(onlineController)onlineController.abort();$('#food-dialog').close();$('#food-dialog').classList.remove('detail-open');const next=foodOpener?.isConnected?foodOpener:view==='today'?document.querySelector(`[data-action="add-meal"][data-meal="${selectedMeal}"]`):document.querySelector(`[data-action="view"][data-view="${view}"]`);next?.focus({preventScroll:true});}
function initWorker(){
  if(worker)return;
  try{worker=new Worker(new URL('./search-worker.js',import.meta.url),{type:'module'});worker.onmessage=e=>{
    const d=e.data;
    if(d.type==='progress'||d.type==='ready'){workerLoaded=d.loaded;workerDone=d.type==='ready';workerFailed=d.failed||0;updateDbStatus();}
    if(d.type==='results'&&d.seq===searchSeq&&searchTab==='all'&&$('#food-search').value.trim()){renderResults(d.foods,d.matches);}
    if(d.type==='error'){$('#db-status').textContent='목록 연결 실패';notify(d.message);}
  };worker.onerror=()=>{$('#db-status').textContent='검색 목록을 연결하지 못했어요';};worker.postMessage({type:'init'});
  }catch{notify('음식 검색을 연결하지 못했어요. 직접 등록은 이용할 수 있어요.');}
}
function updateDbStatus(){const e=$('#db-status');e.textContent=workerDone?(workerFailed?'일부 목록 연결 실패':`${int(workerLoaded)}건 검색 가능`):workerLoaded?`${int(workerLoaded)}건 연결 · 불러오는 중`:'공개 식품 목록 불러오는 중';}
function openSearch(meal=autoMeal(),entry=null,food=null){
  foodOpener=document.activeElement;
  selectedMeal=entry?.meal||meal;editingId=entry?.id||null;searchTab='all';searchFilter='전체';selectedFood=null;searchResults=[];
  $('#food-search').value='';$('#food-dialog-title').textContent=entry?'식단 기록 수정':'무엇을 드셨나요?';
  $('#food-dialog').classList.remove('detail-open');
  $('#search-filters').innerHTML=filters.map(f=>`<button data-action="filter" data-filter="${f}" class="${f==='전체'?'active':''}">${f}</button>`).join('');
  document.querySelectorAll('[data-action="search-tab"]').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab==='all'));
  renderDetail();doSearch();openDialog('#food-dialog');initWorker();updateDbStatus();
  if(entry){selectedFood=entry.food;amount=entry.amount;mode=entry.mode;servingSize=entry.servingSize||entry.food.serving||100;renderDetail();$('#food-dialog').classList.add('detail-open');}
  else if(food)selectFood(food);
  else setTimeout(()=>$('#food-search').focus(),60);
}
function matchesFilter(f){if(searchFilter==='전체')return true;const map={'밥·면':/밥|면|죽|만두|국수|스프/,'한식':/찌개|국|탕|전골|볶음|조림|구이|나물|찜|김치|무침/,'고기·생선':/육류|어패|생선|고기|닭|돼지|소고기|계란|달걀|해산/,'과일·채소':/과일|과실|채소|과채|버섯|감자|고구마/,'빵·간식':/빵|과자|떡|초콜릿|아이스|빙과|견과|디저트/,'음료':/음료|차류|커피|우유|유제품|주류|주스/};return map[searchFilter]?.test(f.category+' '+f.name);}
function doSearch(){
  const q=normalizeQuery($('#food-search').value);searchSeq++;
  if(onlineController)onlineController.abort();
  let list;
  if(searchTab==='recent'){const seen=new Set();list=[...state.entries].reverse().map(e=>e.food).filter(f=>{if(seen.has(f.id))return false;seen.add(f.id);return true;});}
  else if(searchTab==='favorite')list=state.favorites;
  else if(searchTab==='custom')list=state.customFoods;
  else list=[...state.customFoods,...featured];
  if(q)list=list.filter(f=>normalizeQuery(f.name+' '+f.brand).includes(q));
  list=list.filter(matchesFilter);
  renderResults(list.slice(0,100),list.length);
  $('#search-filters').hidden=searchTab!=='all';
  if(q&&searchTab==='all'&&worker)worker.postMessage({type:'search',q:$('#food-search').value,filter:searchFilter,seq:searchSeq});
}
function renderResults(foods,matches=foods.length){
  const q=$('#food-search').value.trim();
  // Local custom foods remain searchable alongside the public database.
  const custom=searchTab==='all'&&q?state.customFoods.filter(f=>normalizeQuery(f.name).includes(normalizeQuery(q))&&matchesFilter(f)):[];
  const unique=new Map([...custom,...foods].map(f=>[f.id,f]));searchResults=[...unique.values()];activeFoods=new Map(searchResults.map(f=>[f.id,f]));
  $('#result-label').textContent=q?`${searchTab==='all'?'검색 결과':'찾은 음식'} ${int(matches+custom.length)}건${matches>100?' · 상위 100개':''}`:({all:'자주 찾는 음식',recent:'최근에 기록한 음식',favorite:'별표한 음식',custom:'내가 등록한 음식'}[searchTab]);
  $('#food-results').innerHTML=searchResults.length?searchResults.map(f=>`<div class="food-result ${selectedFood?.id===f.id?'selected':''}"><button class="food-result-main" data-action="select-food" data-id="${escape(f.id)}"><span class="food-emoji" aria-hidden="true">${emoji(f)}</span><span class="food-result-text"><span class="food-result-name">${escape(f.name)}</span><span class="food-result-sub"><strong>${fmt(f.kcal)} kcal</strong> / 100 ${unit(f)} · ${escape(f.brand||f.origin||sourceLabel(f))}</span></span></button><button class="favorite-button ${state.favorites.some(x=>x.id===f.id)?'on':''}" data-action="star" data-id="${escape(f.id)}" aria-label="${escape(f.name)} 즐겨찾기 ${state.favorites.some(x=>x.id===f.id)?'해제':'추가'}" aria-pressed="${state.favorites.some(x=>x.id===f.id)}">${icon('star',18,state.favorites.some(x=>x.id===f.id))}</button></div>`).join(''):`<div class="empty-results">${icon(searchTab==='favorite'?'heart':'search',36)}<h3>${q?'아직 일치하는 음식이 없어요':searchTab==='recent'?'첫 기록을 기다리고 있어요':searchTab==='favorite'?'별표한 음식을 모아 드릴게요':'나만의 음식을 등록해 보세요'}</h3><p>${q&&!workerDone&&searchTab==='all'?'전체 목록을 불러오는 중이에요.<br>잠시 뒤 결과가 더 표시될 수 있어요.':q?'다른 이름으로 검색하거나<br>영양정보를 직접 등록할 수 있어요.':searchTab==='favorite'?'음식 옆의 별을 눌러 저장해 주세요.':'이곳에서 다음 식단을 더 쉽게 기록해요.'}</p>${q||searchTab==='custom'?'<button class="text-button" data-action="custom-food">음식 직접 등록하기</button>':''}</div>`;
}
function selectFood(food){selectedFood=food;mode='weight';amount=100;servingSize=food.serving||100;renderDetail();$('#food-dialog').classList.add('detail-open');renderResults(searchResults);if(matchMedia('(max-width:760px)').matches){$('#food-detail').scrollTop=0;const title=$('#food-detail h3');title.tabIndex=-1;title.focus({preventScroll:true});}}
function renderDetail(){
  const root=$('#food-detail');
  if(!selectedFood){root.innerHTML=`<div class="detail-empty"><div class="detail-empty-visual">${icon('bowl',64)}</div><h3>먹은 음식을 골라 주세요</h3><p>그램으로 정확하게, 인분으로 간편하게.<br>먹은 양만큼 계산해 드릴게요.</p></div>`;return;}
  const f=selectedFood;
  root.innerHTML=`<button class="detail-back" data-action="detail-back">${icon('chevron-left',17)}음식 목록으로</button><div class="detail-top"><span class="food-emoji" aria-hidden="true">${emoji(f)}</span><div><h3>${escape(f.name)}</h3><p>${escape(f.brand||f.category||sourceLabel(f))}</p></div></div><div class="nutrition-base"><span>100 ${unit(f)} 기준</span><strong>${fmt(f.kcal)} kcal</strong></div><label class="field-label" for="food-amount">얼마나 드셨나요?</label><div class="segmented-control"><button data-action="amount-mode" data-mode="weight" class="${mode==='weight'?'active':''}">${f.unit==='ml'?'밀리리터 (mL)':'그램 (g)'}</button><button data-action="amount-mode" data-mode="serving" class="${mode==='serving'?'active':''}">인분</button></div><div class="amount-control"><button class="step-button" data-action="amount-minus" aria-label="섭취량 줄이기">${icon('minus',18)}</button><div class="amount-input-wrap"><input id="food-amount" type="number" inputmode="decimal" step="any" min="0.01" max="100000" value="${amount}" autocomplete="off"><span class="amount-unit">${mode==='serving'?'인분':unit(f)}</span></div><button class="step-button" data-action="amount-plus" aria-label="섭취량 늘리기">${icon('plus',18)}</button></div><div class="quick-amounts">${(mode==='serving'?[0.5,1,1.5,2]:[50,100,150,200]).map(n=>`<button data-action="quick-amount" data-amount="${n}">${n}${mode==='serving'?'인분':unit(f)}</button>`).join('')}</div>${mode==='serving'?`<div class="portion-field"><label for="serving-size"><span>1인분 기준량 (${unit(f)})</span><input id="serving-size" type="number" inputmode="decimal" min="0.01" max="100000" step="any" value="${servingSize}"></label><small>${f.source==='mfds'&&f.id.startsWith('P')?'식품 DB의 포장 중량으로 시작해요.':'식품 DB 기준량 또는 100g으로 시작해요.'} 실제 1인분 무게에 맞춰 바꿔 주세요.</small></div>`:''}<p class="field-label">어느 끼니에 먹었나요?</p><div class="meal-selector">${MEALS.map(m=>`<button class="${m===selectedMeal?'active':''}" data-action="select-meal" data-meal="${m}">${labels[m]}</button>`).join('')}</div><div class="calculated-nutrition" id="calculated-nutrition" aria-live="polite"></div><p class="form-error" id="amount-error" role="alert"></p><button class="btn btn--primary primary-button large detail-save" data-action="save-entry">${icon('check',18)}${editingId?'수정한 기록 저장':'식단에 기록하기'}</button><p class="detail-source">${escape(sourceLabel(f))}${f.source==='off'?' · 사용자 제공 정보':''}<br>${f.unit==='ml'?'부피 기준 데이터예요. g으로 임의 환산하지 않아요.':'영양정보는 조리법과 제품에 따라 차이가 있을 수 있어요.'}</p>`;
  updateCalculation();
}
function updateCalculation(){
  if(!selectedFood)return;amount=Number($('#food-amount').value);if($('#serving-size'))servingSize=Number($('#serving-size').value);
  try{const n=calculate(selectedFood,amount,mode,servingSize);$('#amount-error').textContent='';$('#food-amount').removeAttribute('aria-invalid');$('#calculated-nutrition').innerHTML=`<div class="calculated-heading"><span>총 ${fmt(n.weight)} ${unit(selectedFood)}</span><strong>${fmt(n.kcal)} <small>kcal</small></strong></div><div class="calculated-macros">${[['carbs','탄수화물'],['protein','단백질'],['fat','지방']].map(([k,t])=>`<span>${t} <strong>${n[k]==null?'정보 없음':fmt(n[k])+' g'}</strong></span>`).join('')}</div>`;return true;}
  catch(e){$('#amount-error').textContent=e.message;$('#food-amount').setAttribute('aria-invalid','true');$('#calculated-nutrition').innerHTML='<div class="calculated-heading"><span>먹은 양을 입력해 주세요</span><strong>— <small>kcal</small></strong></div>';return false;}
}
function saveEntry(){
  if(!selectedFood||!updateCalculation())return;
  const old=state.entries.find(e=>e.id===editingId);
  const entry={id:editingId||uid(),date:old?.date||selectedDate,meal:selectedMeal,food:validateFood(selectedFood),amount,mode,servingSize,createdAt:old?.createdAt||Date.now()};
  const entries=editingId?state.entries.map(e=>e.id===editingId?entry:e):[...state.entries,entry];
  if(persist({...state,entries})){closeFood();notify(editingId?'식단 기록을 수정했어요.':`${labels[selectedMeal]}에 ${selectedFood.name} 기록했어요.`);}
}
function toggleFavorite(f){const on=state.favorites.some(x=>x.id===f.id);if(persist({...state,favorites:on?state.favorites.filter(x=>x.id!==f.id):[...state.favorites,validateFood(f)]})){notify(on?'즐겨찾기를 해제했어요.':'음식 보관함에 저장했어요.');if($('#food-dialog').open)renderResults(searchResults);}}
function renderSettings(){
  $('#settings-body').innerHTML=`<form id="goals-form"><div class="form-grid">${[['kcal','하루 칼로리','kcal'],['water','하루 물 섭취','mL'],['carbs','탄수화물','g'],['protein','단백질','g'],['fat','지방','g']].map(([key,name,u])=>`<div class="form-field ${key==='kcal'?'full':''}"><label for="goal-${key}">${name}</label><div class="input-with-unit"><input id="goal-${key}" name="${key}" type="number" inputmode="decimal" step="any" min="1" max="${key==='kcal'||key==='water'?20000:5000}" value="${state.goals[key]}" required><span>${u}</span></div></div>`).join('')}</div><p class="form-help">기본 목표는 시작을 위한 예시예요.<br>자신에게 맞는 목표로 자유롭게 바꿀 수 있어요.</p><p class="form-error" id="goals-error" role="alert"></p><button class="btn btn--primary primary-button full-width" type="submit">목표 저장하기</button></form><button class="health-settings-link" data-action="view" data-view="body"><span>체중 · BMI · 대사량 관리</span>${icon('chevron-right',17)}</button><div class="motion-setting"><div><strong>화면 애니메이션</strong><p>기기의 동작 줄이기 설정도 함께 적용돼요.</p></div><button class="motion-toggle" role="switch" aria-label="화면 애니메이션" aria-checked="${state.health.motion}" data-action="health-motion"><span></span></button></div><button class="health-settings-link" data-action="school-settings"><span>학교 점심 자동 기록 · ${int(state.school.kcal)} kcal</span>${icon('chevron-right',17)}</button><button class="health-settings-link" data-action="sources"><span>식품 데이터 출처 및 안내</span>${icon('arrow-up-right',17)}</button><div class="data-settings"><h3>소중한 기록, 따로 보관해요</h3><p>이 기기에 식단 ${state.entries.length}개 · 체중 ${state.health.weights.length}개 기록이 있어요.<br>다른 기기로 옮기거나 브라우저 데이터를 지우기 전에 백업해 주세요.</p><div class="data-actions"><button class="btn btn--secondary secondary-button" data-action="export">${icon('download',16)}기록 백업</button><button class="btn btn--secondary secondary-button" data-action="import">${icon('upload',16)}백업 복원</button></div></div>`;
  openDialog('#settings-dialog');
}
function openCustom(){
  $('#custom-body').innerHTML=`<form id="custom-form"><div class="form-grid"><div class="form-field full"><label for="custom-name">음식 이름</label><input id="custom-name" name="name" maxlength="100" placeholder="예: 내가 만든 닭가슴살 샐러드" value="${escape($('#food-dialog').open?$('#food-search').value:'')}" required></div><div class="form-field"><label for="custom-unit">영양정보 기준</label><select id="custom-unit" name="unit"><option value="g">100 g당</option><option value="ml">100 mL당</option></select></div><div class="form-field"><label for="custom-kcal">칼로리 (kcal)</label><input id="custom-kcal" name="kcal" type="number" inputmode="decimal" min="0" max="10000" step="any" placeholder="필수" required></div>${[['carbs','탄수화물'],['protein','단백질'],['fat','지방']].map(([k,n])=>`<div class="form-field"><label for="custom-${k}">${n} (g)</label><input id="custom-${k}" name="${k}" type="number" inputmode="decimal" min="0" max="10000" step="any" placeholder="모르면 비워 두세요"></div>`).join('')}<div class="form-field"><label for="custom-serving">1인분 기준량 (g / mL)</label><input id="custom-serving" name="serving" type="number" inputmode="decimal" min="0.01" max="100000" step="any" placeholder="선택"></div></div><p class="form-help">선택한 100g 또는 100mL당 영양정보를 입력해 주세요.<br>포장지에 1인분 기준으로 적혀 있다면 100g 기준으로 환산해 주세요.</p><p class="form-error" id="custom-error" role="alert"></p><button class="btn btn--primary primary-button full-width" type="submit">음식 등록하기</button></form>`;
  openDialog('#custom-dialog');
}
async function searchOnline(){
  const q=$('#food-search').value.trim();if(q.length<2){notify('음식 이름을 두 글자 이상 입력해 주세요.');$('#food-search').focus();return;}
  if(Date.now()-lastOnlineSearch<6500){notify('잠시 후 다시 검색해 주세요.');return;}
  lastOnlineSearch=Date.now();onlineController?.abort();onlineController=new AbortController();
  const request=++searchSeq;$('#result-label').textContent='해외 식품을 찾고 있어요…';const timeout=setTimeout(()=>onlineController?.abort(),18000);
  try{
    const params=new URLSearchParams({search_terms:q,search_simple:'1',action:'process',json:'1',page_size:'30',fields:'code,product_name,brands,nutriments,serving_quantity,serving_quantity_unit,nutrition_data_per'});
    const r=await fetch('https://world.openfoodfacts.org/cgi/search.pl?'+params,{signal:onlineController.signal});if(!r.ok)throw Error();const data=await r.json();
    if(request!==searchSeq||!$('#food-dialog').open)return;
    const foods=(data.products||[]).filter(p=>p.product_name&&Number.isFinite(p.nutriments?.['energy-kcal_100g'])).map(p=>{const n=p.nutriments;const u=String(p.nutrition_data_per).toLowerCase().includes('ml')?'ml':'g';return {id:'off-'+p.code,name:p.product_name,kcal:n['energy-kcal_100g'],carbs:n.carbohydrates_100g??null,protein:n.proteins_100g??null,fat:n.fat_100g??null,unit:u,serving:p.serving_quantity_unit===u?p.serving_quantity||null:null,category:'해외 식품',brand:p.brands||'',origin:'Open Food Facts',source:'off'};}).filter(f=>{try{validateFood(f);return true;}catch{return false;}});
    renderResults(foods,foods.length);$('#result-label').textContent=`해외 식품 ${foods.length}건 · Open Food Facts`;
  }catch(e){if(request===searchSeq){$('#result-label').textContent='해외 검색 연결 실패';const url='https://search.openfoodfacts.org/?q='+encodeURIComponent(q);$('#food-results').innerHTML=`<div class="empty-results">${icon('globe',36)}<h3>해외 검색 서버에 연결하지 못했어요</h3><p>국내 음식 검색과 직접 등록은 이용할 수 있어요.<br>해외 식품은 검색 사이트에서도 찾아볼 수 있어요.</p><a class="secondary-button" style="margin-top:12px" href="${escape(url)}" target="_blank" rel="noopener noreferrer">검색 사이트에서 찾기 ${icon('arrow-up-right',15)}</a><button class="text-button" data-action="custom-food">음식 직접 등록하기</button></div>`;notify('해외 검색 연결 상태를 확인해 주세요.');}}
  finally{clearTimeout(timeout);}
}
function openSources(){
  $('#info-title').textContent='식품 데이터 안내';
  $('#info-body').innerHTML=`<h3>국내 공개 데이터 ${manifest?int(manifest.count)+'건':''}</h3><p><a href="https://various.foodsafetykorea.go.kr/nutrient/general/down/historyList.do" target="_blank" rel="noopener noreferrer">식품의약품안전처 식품영양성분 DB</a><br>음식 DB 2026-08-28 · ${int(manifest?.stats.prepared.count||19617)}건<br>가공식품 DB 2026-10-29 · ${int(manifest?.stats.packaged.count||329378)}건</p><p><a href="https://www.nics.go.kr/food/kfi/fct/fctIntro/list" target="_blank" rel="noopener noreferrer">농촌진흥청 국가표준식품성분표 10.4</a><br>가식부 100g 기준 · 원재료성 식품 포함<br>동일 이름도 제조사·조리법에 따라 다른 자료로 검색돼요.</p><h3>계산과 기준량</h3><p>섭취 열량 = 100g당(또는 100mL당) 열량 × 섭취량 ÷ 100<br>인분으로 입력하면 직접 설정한 1인분 기준량을 곱해요. DB 제공 기준량 또는 포장 중량으로 시작하므로 실제 먹은 양에 맞춰 조정해 주세요. g과 mL는 임의 환산하지 않아요. 값이 없는 영양소는 ‘정보 없음’으로 표시하며 합계에는 확인된 값만 더해요.</p><h3>해외 식품 검색</h3><p><a href="https://world.openfoodfacts.org/" target="_blank" rel="noopener noreferrer">Open Food Facts</a>의 사용자 제공 자료예요. 외부 서비스 연결과 데이터 등록 상태에 따라 검색 결과가 없을 수 있어요. 데이터는 <a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noopener noreferrer">ODbL</a> 라이선스를 따릅니다.</p><h3>내 기록과 개인 정보</h3><p>식단·신체 정보·생활 기록·목표·즐겨찾기는 이 브라우저의 기기 저장소에 보관해요. 서버 계정 동기화는 없어요. 브라우저 데이터 삭제·시크릿 모드 종료 시 사라질 수 있으니 백업해 주세요. 해외 식품 검색을 누르면 검색어를 Open Food Facts로 전송해요. AI 코치에게 질문하면 필요한 식단·몸 관리 요약을 Google AI로 전송해요. API 키는 이 브라우저의 로컬 저장소에 보관해 다시 열어도 연결을 유지하며 GitHub·기록 백업에는 넣지 않아요. AI 연결 창에서 저장된 키를 지울 수 있어요. 무료 티어의 입력·응답은 Google의 서비스 개선에 사용될 수 있어요.</p><p style="margin-top:18px">한끼는 토스의 공식 서비스가 아닌 독립 식단 기록 앱입니다.</p>`;
  openDialog('#info-dialog');
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-action]');if(!b)return;
  const a=b.dataset.action;
  if(a.startsWith('school-')){if($('#settings-dialog').open)$('#settings-dialog').close();school.handleAction(a,b);return;}
  if(a.startsWith('agent-')){agent.handleAction(a,b);return;}
  if(a==='workspace-section'){workspaceSection(b.dataset.view,b.dataset.section);render();document.querySelector(`[data-action="workspace-section"][data-section="${b.dataset.section}"]`)?.focus({preventScroll:true});return;}
  if(a==='edit-entry'&&b.dataset.id==='school-lunch-'+selectedDate){school.open();return;}
  if(a==='delete-entry'&&b.dataset.id==='school-lunch-'+selectedDate){school.toggleDay();return;}
  if(a.startsWith('health-')){health.handleAction(a,b);return;}
  if(a==='view'){if($('#settings-dialog').open)$('#settings-dialog').close();openView(b.dataset.view);}
  else if(a==='settings')renderSettings();
  else if(a==='close-settings')$('#settings-dialog').close();
  else if(a==='close-custom')$('#custom-dialog').close();
  else if(a==='close-info')$('#info-dialog').close();
  else if(a==='sources')openSources();
  else if(a==='bookmark-help'){$('#info-title').textContent='한끼를 가까이 두세요';$('#info-body').innerHTML=`<p>즐겨찾기와 홈 화면에 한끼 아이콘으로 빠르게 열어 보세요.</p><div class="bookmark-options"><div><h3>PC 브라우저</h3><p><kbd>Ctrl</kbd> + <kbd>D</kbd>를 누르면 북마크에 저장할 수 있어요.<br>Mac은 <kbd>⌘</kbd> + <kbd>D</kbd>를 눌러 주세요.</p></div><div><h3>아이폰 · 안드로이드</h3><p>브라우저의 공유 또는 메뉴 버튼에서 ‘북마크 추가’나 ‘홈 화면에 추가’를 선택해 주세요. 브라우저에 따라 메뉴 이름은 달라요.</p></div></div>`;openDialog('#info-dialog');}
  else if(a==='date-picker'){const input=$('#date-input');try{input.showPicker();}catch{input.focus();input.click();}}
  else if(a==='date-prev')setDate(shiftDate(selectedDate,view==='report'?-7:-1));
  else if(a==='date-next')setDate(shiftDate(selectedDate,view==='report'?7:1));
  else if(a==='today')setDate(dateKey());
  else if(a==='set-date')setDate(b.dataset.date);
  else if(a==='report-date'){selectedDate=b.dataset.date;openView('today');}
  else if(a==='add-meal')openSearch(b.dataset.meal);
  else if(a==='open-search')openSearch();
  else if(a==='close-food')closeFood();
  else if(a==='detail-back'){$('#food-dialog').classList.remove('detail-open');$('#food-search').focus();}
  else if(a==='search-tab'){searchTab=b.dataset.tab;document.querySelectorAll('[data-action="search-tab"]').forEach(x=>x.setAttribute('aria-selected',x===b));doSearch();}
  else if(a==='filter'){searchFilter=b.dataset.filter;document.querySelectorAll('[data-action="filter"]').forEach(x=>x.classList.toggle('active',x===b));doSearch();}
  else if(a==='select-food'){const f=activeFoods.get(b.dataset.id);if(f)selectFood(f);}
  else if(a==='star'){const f=activeFoods.get(b.dataset.id);if(f)toggleFavorite(f);}
  else if(a==='select-meal'){selectedMeal=b.dataset.meal;document.querySelectorAll('[data-action="select-meal"]').forEach(x=>x.classList.toggle('active',x===b));}
  else if(a==='amount-mode'){if(!updateCalculation())return;if(mode!==b.dataset.mode){amount=convertAmount(amount,mode,b.dataset.mode,servingSize);mode=b.dataset.mode;renderDetail();}}
  else if(a==='quick-amount'){amount=Number(b.dataset.amount);$('#food-amount').value=amount;updateCalculation();}
  else if(a==='amount-minus'||a==='amount-plus'){amount=Math.max(mode==='serving'?.1:1,Math.round((Number($('#food-amount').value)+(a==='amount-minus'?-1:1)*(mode==='serving'?.5:10))*100)/100);$('#food-amount').value=amount;updateCalculation();}
  else if(a==='save-entry')saveEntry();
  else if(a==='edit-entry'){const entry=state.entries.find(x=>x.id===b.dataset.id);if(entry)openSearch(entry.meal,entry);}
  else if(a==='delete-entry'){const entry=state.entries.find(x=>x.id===b.dataset.id);if(entry&&persist({...state,entries:state.entries.filter(x=>x.id!==entry.id)}))notify('음식 기록을 삭제했어요.',()=>{if(persist({...state,entries:[...state.entries,entry]}))notify('기록을 되돌렸어요.');});}
  else if(a==='undo'){const fn=undoAction;undoAction=null;fn?.();}
  else if(a==='water-add'||a==='water-minus'){const value=Math.min(20000,Math.max(0,(state.water[selectedDate]||0)+(a==='water-add'?250:-250)));persist({...state,water:{...state.water,[selectedDate]:value}});}
  else if(a==='custom-food')openCustom();
  else if(a==='online-search')searchOnline();
  else if(a==='library-tab'){libraryTab=b.dataset.tab;render();}
  else if(a==='library-add'){const f=[...state.favorites,...state.customFoods].find(f=>f.id===b.dataset.id);if(f)openSearch(autoMeal(),null,f);}
  else if(a==='library-star'){const f=[...state.favorites,...state.customFoods].find(f=>f.id===b.dataset.id);if(f)toggleFavorite(f);}
  else if(a==='export'){const blob=new Blob([JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`한끼-기록-${dateKey()}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),3000);notify('기록 백업 파일을 내려받았어요.');}
  else if(a==='import'){$('#import-file').value='';$('#import-file').click();}
});
$('#date-input').addEventListener('change',e=>setDate(e.target.value));
$('#food-search').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(doSearch,160);});
document.addEventListener('input',e=>{if(e.target.id==='food-amount'||e.target.id==='serving-size')updateCalculation();});
document.addEventListener('submit',e=>{
  if(e.target.id==='goals-form'){
    e.preventDefault();const data=new FormData(e.target),goals={};for(const k of Object.keys(DEFAULT_GOALS))goals[k]=Number(data.get(k));
    try{const next=validateBackup({...state,goals});if(persist(next)){$('#settings-dialog').close();notify('나에게 맞는 목표를 저장했어요.');}}catch(err){$('#goals-error').textContent=err.message;}
  }
  if(e.target.id==='custom-form'){
    e.preventDefault();const data=new FormData(e.target);const optional=k=>data.get(k)===''?null:Number(data.get(k));
    try{const food=validateFood({id:'custom-'+uid(),name:String(data.get('name')),kcal:Number(data.get('kcal')),carbs:optional('carbs'),protein:optional('protein'),fat:optional('fat'),unit:data.get('unit'),serving:optional('serving'),category:'직접 등록',brand:'',origin:'직접 등록',source:'custom'});if(persist({...state,customFoods:[...state.customFoods,food]})){$('#custom-dialog').close();if(!$('#food-dialog').open)openSearch(autoMeal(),null,food);else selectFood(food);notify('나만의 음식을 등록했어요.');}}
    catch(err){$('#custom-error').textContent=err.message;}
  }
});
$('#import-file').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;if(file.size>15000000){notify('15MB 이하의 백업 파일을 선택해 주세요.');return;}
  try{const data=validateBackup(JSON.parse(await file.text()));$('#info-title').textContent='기록을 복원할까요?';$('#info-body').innerHTML=`<h3>${int(data.entries.length)}개 식단 · ${int(data.health.weights.length)}개 체중 기록</h3><p>복원하면 현재 기기의 식단·몸 관리·목표·보관함을 백업 파일의 내용으로 교체해요. 현재 기록이 필요하다면 먼저 ‘기록 백업’을 눌러 보관해 주세요.</p><div class="data-actions" style="margin-top:24px"><button class="btn btn--secondary secondary-button" id="cancel-restore">취소</button><button class="btn btn--primary primary-button" id="confirm-restore">이 백업으로 복원</button></div>`;openDialog('#info-dialog');$('#cancel-restore').onclick=()=>$('#info-dialog').close();$('#confirm-restore').onclick=()=>{if(persist(data)){$('#info-dialog').close();$('#settings-dialog').close();notify('백업 파일의 기록을 복원했어요.');}};}
  catch{notify('올바른 한끼 백업 파일인지 확인해 주세요.');}
});
document.addEventListener('keydown',e=>{
  if(e.target.matches('[role="tab"]')&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){
    e.preventDefault();const tabs=[...e.target.closest('[role="tablist"]').querySelectorAll('[role="tab"]')],i=tabs.indexOf(e.target);
    const index=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[index].focus();tabs[index].click();
  }
  if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!document.querySelector('dialog[open]')){e.preventDefault();openSearch();}
});
$('#food-dialog').addEventListener('cancel',e=>{e.preventDefault();closeFood();});
document.querySelectorAll('dialog').forEach(dialog=>{dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});});
window.addEventListener('storage',e=>{if(e.key==='hankki.v1'&&e.newValue){try{state=validateBackup(JSON.parse(e.newValue));render();notify('다른 탭의 변경사항을 반영했어요.');}catch{}}});
render();hydrateIcons();
Promise.all([fetch('./data/manifest.json').then(r=>{if(!r.ok)throw Error();return r.json();}),fetch('./data/featured.json').then(r=>{if(!r.ok)throw Error();return r.json();})]).then(([m,rows])=>{manifest=m;featured=rows.map(r=>({...foodFromRow(r,m.categories),source:r[0].startsWith('RDA')?'rda':'mfds'}));render();if($('#food-dialog').open)doSearch();}).catch(()=>{bootMessage='음식 데이터를 연결하지 못했어요. 인터넷을 확인하고 새로고침해 주세요. 기존 기록과 직접 등록은 이용할 수 있어요.';render();});
