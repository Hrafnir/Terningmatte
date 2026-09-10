import test from 'node:test';
import assert from 'node:assert/strict';
import {reportFromSaved,reportText,reportFilename,reportPages} from '../report.js';
import {newRound,recordSolution} from '../math.js';

test('The report preserves the exact ordered cast, name, score and all solutions',()=>{
 let round=newRound([4,3,1,6,2],'freestyle');round=recordSolution(round,'4-3');round=recordSolution(round,'3');
 const report=reportFromSaved(round,'  Ada  ');
 assert.deepEqual(report.dice,[4,3,1,6,2]);assert.equal(report.name,'Ada');assert.equal(report.score,1);
 assert.deepEqual(report.solutions.map(s=>s.number),[1,3]);
 const text=reportText(report);assert.ok(text.includes('4 · 3 · 1 · 6 · 2'));assert.ok(text.includes('4 − 3 = 1'));assert.ok(text.includes('3 = 3'));
});
test('Invalid or altered solutions are excluded from the sharing snapshot',()=>{
 const round=newRound([1,2,3,4,5]);round.solutions={'1':'1','2':'9-7','3':'1','4':'alert(4)'};
 const report=reportFromSaved(round,'Elev');assert.deepEqual(report.solutions,[{number:1,expression:'1'}]);
});
test('A new or malformed saved round has no report',()=>{
 for(const saved of [null,{}, {version:2,dice:[1,2]}, {version:2,dice:[1,2,3,4,NaN]}])assert.equal(reportFromSaved(saved),null);
});
test('Names and file names are safe without removing Norwegian letters',()=>{
 const name='Eirik / ../../ matte!';const filename=reportFilename(name,1,3);
 assert.ok(!filename.includes('/'));assert.ok(filename.endsWith('-2-av-3.png'));
 assert.ok(reportFilename('Øyvind').includes('Øyvind'));
});
test('Long reports split into bounded images without dropping solutions',()=>{
 const solutions=Array.from({length:240},(_,i)=>({number:i+1,expression:'(1+2+3+4+5)'}));
 const context={measureText:text=>({width:text.length*15})};
 const pages=reportPages({solutions},context,1500);
 assert.ok(pages.length>1);assert.deepEqual(pages.flat().map(row=>row.number),solutions.map(row=>row.number));
 for(const page of pages)assert.ok(660+page.reduce((sum,row)=>sum+row.height,0)<=1500);
});
test('An empty report still produces one shareable page',()=>{
 assert.deepEqual(reportPages({solutions:[]},{measureText:()=>({width:0})}),[[]]);
});
test('Earlier advanced solutions remain disclosed after changing level',()=>{
 const round=newRound([1,2,3,4,5],'freestyle','advanced');const solved=recordSolution(round,'3!');solved.level='basic';
 const report=reportFromSaved(solved);assert.equal(report.advancedUsed,true);assert.ok(reportText(report).includes('løsningene: Ja'));
});
