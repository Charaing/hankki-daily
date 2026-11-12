const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const values=new Map(),progress=new Map();let lastView=null,enabled=true,entrances=null;
const numberText=(n,digits)=>Number(n).toLocaleString('ko-KR',{maximumFractionDigits:digits});
function allowed(){return enabled&&!reduce.matches;}
export function setMotion(on){enabled=on;document.documentElement.dataset.appMotion=allowed()?'on':'off';if(!allowed()){entrances?.disconnect();document.getAnimations().forEach(a=>{try{a.finish();}catch{a.cancel();}});}}
reduce.addEventListener('change',()=>setMotion(enabled));
export function animateContent(root,view,on){
 setMotion(on);
 const animated=allowed(),changed=view!==lastView;
 root.querySelectorAll('.primary-button,.secondary-button').forEach(b=>b.classList.add('btn',b.classList.contains('primary-button')?'btn--primary':'btn--secondary'));
 const calories=root.querySelector('[data-testid="total-calories"]');if(calories){calories.dataset.counter='daily-kcal';calories.dataset.value=calories.textContent.replaceAll(',','');calories.dataset.digits='0';}
 root.querySelectorAll('[data-counter]').forEach(el=>{
  const key=el.dataset.counter,end=Number(el.dataset.value),start=values.has(key)?values.get(key):end,digits=Number(el.dataset.digits||0);values.set(key,end);
  if(!animated||start===end||!Number.isFinite(end))return;
  const began=performance.now();function frame(now){const t=Math.min(1,(now-began)/560),eased=1-(1-t)**3;if(!el.isConnected)return;el.textContent=numberText(start+(end-start)*eased,digits);if(t<1&&allowed())requestAnimationFrame(frame);else el.textContent=numberText(end,digits);}requestAnimationFrame(frame);
 });
 if(animated){
  if(changed){
   entrances?.disconnect();entrances=new IntersectionObserver(entries=>{entries.forEach(({target,isIntersecting})=>{if(isIntersecting){if(allowed())target.animate([{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'translateY(0)'}],{duration:450,easing:'cubic-bezier(.2,.8,.2,1)'});entrances.unobserve(target);}});},{threshold:.08});
   root.querySelectorAll('.panel,.health-stat,.library-food,.library-empty').forEach((el,i)=>{if(el.getBoundingClientRect().top<innerHeight)el.animate([{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'translateY(0)'}],{duration:450,delay:Math.min(i,7)*35,easing:'cubic-bezier(.2,.8,.2,1)'});else entrances.observe(el);});
  }
  else root.animate([{opacity:.88},{opacity:1}],{duration:180,easing:'ease-out'});
  root.querySelectorAll('.weight-line,.weight-average').forEach(path=>{const n=path.getTotalLength();path.animate([{strokeDasharray:`${n} ${n}`,strokeDashoffset:n},{strokeDasharray:`${n} ${n}`,strokeDashoffset:0}],{duration:850,easing:'cubic-bezier(.2,.8,.2,1)'});});
  root.querySelectorAll('.report-bar,.week-bar,.goal-progress-track>span').forEach((el,i)=>el.animate([{transform:'scaleY(.15)',opacity:.4},{transform:'scaleY(1)',opacity:1}],{duration:500,delay:Math.min(i,7)*25,easing:'cubic-bezier(.2,.8,.2,1)'}));
  root.querySelectorAll('.progress-track>span').forEach((el,i)=>{const key=view+'-'+i,end=parseFloat(el.style.width)||0,start=progress.get(key)??0;progress.set(key,end);if(end>0)el.animate([{transform:`scaleX(${Math.min(2,start/end)})`},{transform:'scaleX(1)'}],{duration:500,easing:'cubic-bezier(.2,.8,.2,1)'});});
 }
 lastView=view;
}
document.addEventListener('click',e=>{
 if(!allowed())return;const b=e.target.closest('button');if(!b||b.disabled)return;
 // An ink-free press response also works on icon controls and touch screens.
 b.animate([{scale:1},{scale:.96},{scale:1}],{duration:200,easing:'cubic-bezier(.2,.8,.2,1)'});
});
