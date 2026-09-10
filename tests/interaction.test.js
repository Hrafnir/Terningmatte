import test from 'node:test';
import assert from 'node:assert/strict';
import {tokensForExpression, expressionForTokens, restoredExpression} from '../expression.js';
import {AVATARS, avatarGroup, createAvatarPicker} from '../avatars.js';
import {newRound, recordSolution} from '../math.js';

test('Typing uses each matching die once, and shows excess dice as unavailable',()=>{
 const tokens=tokensForExpression('4 ÷ 4 + 4',[4,4,1,2,3]);
 assert.deepEqual(tokens.filter(token=>token.die!==undefined).map(token=>token.die),[0,1]);
 assert.equal(tokens.at(-1).unavailable,true);
 assert.equal(expressionForTokens(tokens),'4/4+4');
});
test('Typing and editing tokens preserve the same expression for evaluation',()=>{
 const dice=[1,2,3,4,5];
 let tokens=tokensForExpression('(4 − 2) ÷ 2',dice);
 assert.equal(expressionForTokens(tokens),'(4-2)/2');
 tokens=tokensForExpression('4 − 3',dice);
 const round=recordSolution(newRound(dice),expressionForTokens(tokens));
 assert.equal(round.solutions[1],'4-3');
 assert.equal(round.manual,'');assert.deepEqual(round.tokens,[]);
});
test('Old builder and text drafts migrate without losing the active expression',()=>{
 assert.equal(restoredExpression({entry:'build',manual:'4+2',tokens:[{value:'1'}]}),'1');
 assert.equal(restoredExpression({entry:'write',manual:'4-3',tokens:[{value:'2'}]}),'4-3');
 assert.equal(restoredExpression({entry:'write',manual:'',tokens:[{value:'2'}]}),'2');
});
test('Malformed text remains editable and is not silently discarded',()=>{
 const tokens=tokensForExpression('3.5+a',[1,2,3,4,5]);
 assert.equal(expressionForTokens(tokens),'3.5+a');
});
test('24 distinct costumes cover play, encouragement, hints and streaks',()=>{
 assert.equal(AVATARS.length,24);assert.equal(new Set(AVATARS.map(a=>a.id)).size,24);
 for(const group of ['neutral','support','hint','streak'])assert.equal(AVATARS.filter(a=>a.group===group).length,6);
});
test('Errors always get encouragement; hints and strong streaks select their own costumes',()=>{
 assert.equal(avatarGroup('error',12),'support');
 assert.equal(avatarGroup('hint',12),'hint');
 assert.equal(avatarGroup('success',2),'neutral');
 assert.equal(avatarGroup('success',3),'streak');
 assert.equal(avatarGroup('success',10),'streak');
});
test('Every costume can be reached before the group repeats',()=>{
 const pick=createAvatarPicker(()=>0);
 for(const group of ['neutral','support','hint','streak']){
  const cycle=Array.from({length:6},()=>pick(group));
  assert.equal(new Set(cycle.map(a=>a.id)).size,6);
  assert.ok(cycle.every(a=>a.group===group));
  assert.equal(pick(group).id,cycle[0].id);
 }
 const all=Array.from({length:24},()=>pick('all'));
 assert.equal(new Set(all.map(a=>a.id)).size,24);
});
