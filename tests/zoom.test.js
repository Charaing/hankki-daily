import test from 'node:test';import assert from 'node:assert/strict';import {preventAppZoom} from '../zoom-control.js';
test('zoom shortcuts and pinch wheel are blocked while ordinary scrolling and copy remain available',()=>{
 const blocked=e=>{let prevented=false;preventAppZoom({...e,preventDefault:()=>{prevented=true;}});return prevented;};
 assert(blocked({type:'wheel',ctrlKey:true}));assert(blocked({type:'keydown',ctrlKey:true,key:'='}));assert(blocked({type:'keydown',metaKey:true,key:'-'}));assert(blocked({type:'gesturechange'}));assert(!blocked({type:'wheel',ctrlKey:false}));assert(!blocked({type:'keydown',ctrlKey:true,key:'c'}));assert(!blocked({type:'keydown',key:'+'}));
});
