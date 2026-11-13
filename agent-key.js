const SAVED='hankki.ai.key',LEGACY='hankki.ai.key.tab',REVOKED='hankki.ai.key.cleared';
export const AGENT_KEY_STORAGE_KEYS=[SAVED,REVOKED];
const valid=v=>typeof v==='string'&&v.trim().length>0&&v.trim().length<=500;
const saveError=()=>Error('브라우저에 AI 연결을 저장하지 못했어요. 사이트 저장소 설정과 저장 공간을 확인해 주세요.');
export function createAgentKeyStore(persistent,session){
 function save(value){
  if(!valid(value))throw Error('올바른 API 키를 입력해 주세요.');
  const key=value.trim();
  try{if(!persistent)throw Error();persistent.setItem(SAVED,key);if(persistent.getItem(SAVED)!==key)throw Error();}catch{throw saveError();}
  try{session?.removeItem(LEGACY);}catch{}
  return key;
 }
 function load(){
  let saved='',legacy='';try{saved=persistent?.getItem(SAVED);}catch{}
  if(valid(saved)){try{session?.removeItem(LEGACY);}catch{}return saved.trim();}
  let revoked=false;try{revoked=persistent?.getItem(REVOKED)==='1';}catch{}
  if(revoked){try{session?.removeItem(LEGACY);}catch{}return '';}
  try{legacy=session?.getItem(LEGACY);}catch{}
  return valid(legacy)?save(legacy):'';
 }
 function clear(){
  let failed=false;
  try{if(persistent){persistent.setItem(REVOKED,'1');if(persistent.getItem(REVOKED)!=='1')failed=true;}}catch{failed=true;}
  for(const [store,slot]of [[persistent,SAVED],[session,LEGACY]]){
   try{store?.removeItem(slot);if(store?.getItem(slot)!=null)failed=true;}catch{failed=true;}
  }
  if(failed)throw Error('저장된 AI 키를 완전히 삭제하지 못했어요. 브라우저 사이트 저장소 설정을 확인해 주세요.');
 }
 return{load,save,clear};
}
