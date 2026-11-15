export function preventAppZoom(event){
 if(event.type.startsWith('gesture')||(event.type==='wheel'&&event.ctrlKey)||(event.type==='keydown'&&(event.ctrlKey||event.metaKey)&&['+','=','-','0','Add','Subtract'].includes(event.key)))event.preventDefault();
}
export function installZoomControl(target=document){for(const type of ['wheel','gesturestart','gesturechange','gestureend'])target.addEventListener(type,preventAppZoom,{passive:false});target.addEventListener('keydown',preventAppZoom);}
