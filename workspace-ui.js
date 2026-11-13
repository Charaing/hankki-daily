const choices={body:[['overview','요약'],['weight','체중'],['bmi','BMI'],['energy','대사량'],['life','생활'],['habits','습관'],['history','기록']],report:[['chart','칼로리'],['nutrition','영양 균형'],['history','기록']]};
const selected={body:'overview',report:'chart'};
export function workspaceSection(view,key){if(choices[view]?.some(([k])=>k===key))selected[view]=key;}
export function decorateWorkspace(root,view){
 root.dataset.view=view;root.dataset.section=selected[view]||'';
 if(!choices[view])return;
 const tabs=document.createElement('nav');tabs.className='workspace-tabs';tabs.setAttribute('aria-label',view==='body'?'몸 관리 세부 화면':'리포트 세부 화면');tabs.innerHTML=choices[view].map(([key,label])=>`<button data-action="workspace-section" data-view="${view}" data-section="${key}" aria-pressed="${selected[view]===key}" class="${selected[view]===key?'active':''}">${label}</button>`).join('');root.prepend(tabs);
 const section=selected[view];
 if(view==='body'){
  const selectors={overview:['.health-stats','.health-goal-panel'],weight:['.weight-chart-panel'],bmi:['.bmi-panel'],energy:['.metabolism-panel'],life:['.activity-panel'],habits:['.habits-panel'],history:['.weight-history']};
  root.querySelectorAll('.health-stats,.body-grid>.panel,.health-footnote').forEach(el=>{el.hidden=!selectors[section].some(s=>el.matches(s));});
 }else{
  root.querySelector('.chart-panel').hidden=section!=='chart';root.querySelector('.habit-panel').hidden=section!=='nutrition';root.querySelector('.history-panel').hidden=section!=='history';
 }
}
