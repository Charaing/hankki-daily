const norm=s=>String(s??'').normalize('NFKC').toLowerCase().replace(/\s+/g,'');
export function foodKind(f){return ['homemade','packaged'].includes(f.kind)?f.kind:f.source==='off'||String(f.id).startsWith('P')?'packaged':'homemade';}
export const kindLabel=f=>foodKind(f)==='packaged'?'완제품':'직접 해먹기';
export function foodGroupKey(f){return JSON.stringify([foodKind(f),norm(f.name),foodKind(f)==='packaged'?norm(f.brand):'']);}
export function foodSignature(f){return JSON.stringify([foodGroupKey(f),f.unit,f.kcal,f.carbs??null,f.protein??null,f.fat??null,f.serving??null]);}
const preference=f=>(f.unit==='g'?0:30)+(/급식/.test(f.origin)?100:0)+(/가정식/.test(f.origin)?-20:0)+(f.source==='rda'?-10:0);
export function groupFoods(foods){
 const groups=new Map(),seen=new Set();
 for(const food of foods){const signature=foodSignature(food);if(seen.has(signature))continue;seen.add(signature);const key=foodGroupKey(food);if(!groups.has(key))groups.set(key,{key,food,variants:[]});groups.get(key).variants.push(food);}
 for(const g of groups.values()){g.variants.sort((a,b)=>preference(a)-preference(b));g.food=g.variants[0];}
 return [...groups.values()];
}
