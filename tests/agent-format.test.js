import test from 'node:test';
import assert from 'node:assert/strict';
import {renderAgentAnswer,plainAgentAnswer} from '../agent-format.js';

test('only short model keywords receive a highlighter mark; ordinary answers stay readable',()=>{
 assert.equal(renderAgentAnswer('점심은 **950 kcal**예요. **탄단지**는 정보가 없어요.'),'점심은 <mark class="agent-highlight">950 kcal</mark>예요. <mark class="agent-highlight">탄단지</mark>는 정보가 없어요.');
 assert.equal(renderAgentAnswer('짧은 답변이에요.'),'짧은 답변이에요.');
 assert.equal(plainAgentAnswer('점심은 **950 kcal**예요.'),'점심은 950 kcal예요.');
});
test('AI markup is escaped and cannot inject HTML, links, scripts or attributes',()=>{
 const html=renderAgentAnswer('<img src=x onerror=alert(1)> **<script>** & "정보"');
 assert(!html.includes('<img'));assert(!html.includes('<script>'));assert(html.includes('&lt;img'));assert(html.includes('<mark class="agent-highlight">&lt;script&gt;</mark>'));assert(html.includes('&amp;'));
});
test('at most four short keywords are highlighted; whole sentences and extra markers become plain text',()=>{
 const html=renderAgentAnswer('**하나** **둘** **셋** **넷** **다섯** **'+ '긴 문장입니다 '.repeat(8)+'**');
 assert.equal((html.match(/<mark /g)||[]).length,4);assert(!html.includes('**'));assert(html.includes('다섯'));
 assert.equal(renderAgentAnswer('**여러 줄\n문장**'),'**여러 줄\n문장**');
});
