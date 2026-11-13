const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const keywords=/\*\*([^*\r\n]+)\*\*/g;
export function plainAgentAnswer(text){return String(text??'').replace(keywords,'$1');}
// A deliberately small format: model text is never treated as HTML or Markdown.
export function renderAgentAnswer(text){
 text=String(text??'');let html='',end=0,count=0;
 for(const match of text.matchAll(keywords)){
  html+=escape(text.slice(end,match.index));const word=match[1];
  html+=word.trim()&&word.length<=24&&count<4?(count++,`<mark class="agent-highlight">${escape(word)}</mark>`):escape(word);
  end=match.index+match[0].length;
 }
 return html+escape(text.slice(end));
}
