import test from 'node:test';import assert from 'node:assert/strict';
import {createAgentKeyStore} from '../agent-key.js';
const storage=()=>{const data=new Map();return{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};};
test('AI connection survives closing the tab and opening a new one without entering the key again',()=>{
 const device=storage();createAgentKeyStore(device,storage()).save('  fixture-key  ');
 assert.equal(createAgentKeyStore(device,storage()).load(),'fixture-key');
});
test('existing session-only connection migrates once and survives a fresh session',()=>{
 const device=storage(),tab=storage();tab.setItem('hankki.ai.key.tab','legacy-fixture');
 assert.equal(createAgentKeyStore(device,tab).load(),'legacy-fixture');assert.equal(tab.getItem('hankki.ai.key.tab'),null);
 assert.equal(createAgentKeyStore(device,storage()).load(),'legacy-fixture');
});
test('disconnect clears persistent and legacy keys without affecting food records',()=>{
 const device=storage(),tab=storage();device.setItem('hankki.v1','journal');const keys=createAgentKeyStore(device,tab);keys.save('fixture');tab.setItem('hankki.ai.key.tab','old');keys.clear();
 assert.equal(createAgentKeyStore(device,tab).load(),'');assert.equal(device.getItem('hankki.v1'),'journal');
});
test('saved key takes precedence over an obsolete session and old key cannot return after disconnect',()=>{
 const device=storage(),tab=storage();createAgentKeyStore(device,tab).save('new');tab.setItem('hankki.ai.key.tab','old');const keys=createAgentKeyStore(device,tab);assert.equal(keys.load(),'new');keys.clear();assert.equal(keys.load(),'');
});
test('a second old tab cannot resurrect a key after another tab explicitly disconnects',()=>{
 const device=storage(),tabA=storage(),tabB=storage();for(const tab of [tabA,tabB])tab.setItem('hankki.ai.key.tab','legacy');
 const a=createAgentKeyStore(device,tabA);assert.equal(a.load(),'legacy');a.clear();
 assert.equal(createAgentKeyStore(device,tabB).load(),'');assert.equal(tabB.getItem('hankki.ai.key.tab'),null);
 a.save('new-key');assert.equal(createAgentKeyStore(device,tabB).load(),'new-key');
});
test('blocked or silently failing browser storage never reports a successful permanent save or loses the legacy key',()=>{
 const blocked={getItem:()=>{throw Error('blocked')},setItem:()=>{throw Error('blocked')},removeItem:()=>{throw Error('blocked')}};
 const tab=storage();tab.setItem('hankki.ai.key.tab','legacy');assert.throws(()=>createAgentKeyStore(blocked,tab).load(),/저장/);assert.equal(tab.getItem('hankki.ai.key.tab'),'legacy');
 assert.throws(()=>createAgentKeyStore({getItem:()=>null,setItem:()=>{},removeItem:()=>{}},tab).save('fixture'),/저장/);
 assert.throws(()=>createAgentKeyStore(blocked,tab).clear(),/삭제/);assert.equal(tab.getItem('hankki.ai.key.tab'),null);
});
