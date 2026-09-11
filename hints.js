import {evaluateForRound, factorial} from './math.js';
// Subsets keep repeated dice distinct; every expression uses each die at most once.
// Deliberately bounded: failure to find a hint is never a proof of impossibility.
export function findHint(dice,target,level='basic') {
 const maps=Array.from({length:1<<dice.length},()=>new Map());
 let found=null;
 function add(map,value,expression){
  if(!Number.isFinite(value)||Math.abs(value)>1000000)return;
  if(Math.abs(value-target)<1e-9){try{if(evaluateForRound(expression,dice,level)===target)found=expression;}catch{}}
  const key=Number(value.toPrecision(10));
  if(map.size<700&&!map.has(key))map.set(key,{value,expression});
 }
 for(let i=0;i<dice.length;i++){
  add(maps[1<<i],dice[i],String(dice[i]));
  if(level==='advanced'&&dice[i]<=9)add(maps[1<<i],factorial(dice[i]),`${dice[i]}!`);
  if(found)return found;
 }
 for(let mask=1;mask<maps.length;mask++){
  if((mask&(mask-1))===0)continue;
  for(let a=(mask-1)&mask;a;a=(a-1)&mask){const b=mask^a;if(!b||a>b)continue;
   for(const left of maps[a].values())for(const right of maps[b].values()){
    const x=left.value,y=right.value,l=left.expression,r=right.expression;
    add(maps[mask],x+y,`(${l}+${r})`);add(maps[mask],x-y,`(${l}-${r})`);add(maps[mask],y-x,`(${r}-${l})`);add(maps[mask],x*y,`(${l}*${r})`);
    if(y!==0)add(maps[mask],x/y,`(${l}/${r})`);if(x!==0)add(maps[mask],y/x,`(${r}/${l})`);
    if(level==='advanced'){
     if(Number.isInteger(y)&&Math.abs(y)<=9)add(maps[mask],Math.pow(x,y),`(${l}^(${r}))`);
     if(Number.isInteger(x)&&Math.abs(x)<=9)add(maps[mask],Math.pow(y,x),`(${r}^(${l}))`);
    }
    if(found)return found;
   }
  }
 }
 return null;
}
