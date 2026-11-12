import {normalizeQuery,foodFromRow} from './core.js';
let rows=[],names=[],manifest=null,loaded=0,current={q:'',filter:'전체',seq:0},loading=false,finished=false,failed=0;
const initialLetters='ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const initials=s=>[...s].map(c=>{const n=c.charCodeAt(0)-44032;return n>=0&&n<11172?initialLetters[Math.floor(n/588)]:c;}).join('');
const filters={ '밥·면':/밥|면|죽|만두|국수|스프/, '한식':/찌개|국|탕|전골|볶음|조림|구이|나물|찜|김치|무침/, '고기·생선':/육류|어패|생선|고기|닭|돼지|소고기|계란|달걀|해산/, '과일·채소':/과일|과실|채소|과채|버섯|감자|고구마/, '빵·간식':/빵|과자|떡|초콜릿|아이스|빙과|견과|디저트/, '음료':/음료|차류|커피|우유|유제품|주류|주스/ };
function search(){
  const q=normalizeQuery(current.q);if(!q){postMessage({type:'results',seq:current.seq,foods:[],matches:0,loaded,done:finished});return;}
  const initialQuery=/^[ㄱ-ㅎ]+$/.test(q);const found=[];const seen=new Set();let matches=0;
  for(let i=0;i<rows.length;i++){
    const r=rows[i];const n=names[i];if(!(initialQuery?initials(n).includes(q):n.includes(q)))continue;
    const category=manifest.categories[r[8]]||'';
    if(filters[current.filter]&&!filters[current.filter].test(category+' '+r[1]))continue;
    matches++;const signature=JSON.stringify(r.slice(1));if(seen.has(signature))continue;seen.add(signature);
    const exact=normalizeQuery(r[1])===q;const prefix=normalizeQuery(r[1]).startsWith(q);
    const score=(exact?-10000:prefix?-3000:0)+r[1].length+(r[6]==='ml'?15:0)+(r[10].includes('급식')?100:0)+(r[0].startsWith('P')?20:0);
    if(found.length<150){found.push({r,score});}else{let worst=0;for(let k=1;k<found.length;k++)if(found[k].score>found[worst].score)worst=k;if(score<found[worst].score)found[worst]={r,score};}
  }
  found.sort((a,b)=>a.score-b.score);
  postMessage({type:'results',seq:current.seq,foods:found.slice(0,100).map(x=>({...foodFromRow(x.r,manifest.categories),source:x.r[0].startsWith('RDA')?'rda':'mfds'})),matches,loaded,done:finished});
}
async function load(){
  if(loading)return;loading=true;
  try{
    manifest=await fetch('./data/manifest.json').then(r=>{if(!r.ok)throw Error(r.status);return r.json()});
    let cache;try{cache=await caches.open('hankki-db-'+manifest.version);}catch{}
    for(const file of manifest.chunks){
      try{
        const url=new URL('./data/'+file,location.href).href;
        let r=cache?await cache.match(url):null;
        if(!r){r=await fetch(url);if(!r.ok)throw Error(r.status);if(cache)try{await cache.put(url,r.clone());}catch{}}
        const data=await r.json();
        for(const row of data){rows.push(row);names.push(normalizeQuery(row[1]+' '+row[9]));}
        loaded+=data.length;
        postMessage({type:'progress',loaded,total:manifest.count,failed});if(current.q)search();
      }catch{failed++;postMessage({type:'progress',loaded,total:manifest.count,failed});}
    }
    finished=true;postMessage({type:'ready',loaded,total:manifest.count,failed});search();
  }catch(e){loading=false;postMessage({type:'error',message:'공개 식품 목록을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.'});}
}
onmessage=e=>{if(e.data.type==='init')load();if(e.data.type==='search'){current=e.data;if(manifest)search();}};
