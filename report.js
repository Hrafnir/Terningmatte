import {evaluateForRound,scoreFor,formatExpression} from './math.js';
export const ROUND_KEY='terningmatte-round-v2';
export const NAME_KEY='terningmatte-player-name';

// Revalidate the exported snapshot, rather than exporting arbitrary storage text.
export function reportFromSaved(saved,name='') {
 if(!saved || saved.version!==2 || !Array.isArray(saved.dice) || saved.dice.length!==5 || saved.dice.some(n=>!Number.isInteger(n)||n<0||n>9)) return null;
 const solutions={};
 for(const [number,expression] of Object.entries(saved.solutions||{})){
  if(typeof expression!=='string'||expression.length>150)continue;
  try{if(evaluateForRound(expression,saved.dice,'advanced')===Number(number))solutions[number]=expression;}catch{}
 }
 return {
  name:String(name).trim().slice(0,80),dice:[...saved.dice],
  mode:saved.mode==='freestyle'?'Fri utforsking':'Tall for tall',
  level:saved.level==='advanced'?'Alle regnetegn':'Grunnleggende regnetegn',
  score:scoreFor(solutions),advancedUsed:Object.values(solutions).some(expression=>/[!^]/.test(expression)),
  solutions:Object.entries(solutions).sort(([a],[b])=>Number(a)-Number(b)).map(([number,expression])=>({number:Number(number),expression})),
 };
}
export function reportText(report) {
 if(!report)return '';
 const heading=report.name?`Terningmatte – ${report.name}`:'Terningmatte – rundestatus';
 return [heading,`Terninger: ${report.dice.join(' · ')}`,`Modus: ${report.mode}`,`Valgt nivå: ${report.level}`,`Potenser eller fakultet brukt i løsningene: ${report.advancedUsed?'Ja':'Nei'}`,`Ubrutt rekke fra 1: ${report.score}`,`Tall løst: ${report.solutions.length}`,'','Løsninger:',...report.solutions.map(({number,expression})=>`${formatExpression(expression)} = ${number}`),...(report.solutions.length?[]:['Ingen tall løst ennå.'])].join('\n');
}
export function reportFilename(name,page=0,pages=1) {
 const safe=String(name||'runde').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9æøåÆØÅ-]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'runde';
 return `terningmatte-${safe}${pages>1?`-${page+1}-av-${pages}`:''}.png`;
}

function wrappedLines(ctx,text,width) {
 const lines=[];let line='';
 // Character wrapping also handles long unbroken typed expressions.
 for(const char of text){if(line&&ctx.measureText(line+char).width>width){lines.push(line.trim());line=char;}else line+=char;}
 if(line)lines.push(line.trim());return lines.length?lines:[''];
}
export function reportPages(report,ctx,maxHeight=4900) {
 ctx.font='500 28px system-ui, sans-serif';
 const pages=[[]];let height=660;
 for(const solution of report.solutions){
  const lines=wrappedLines(ctx,`${formatExpression(solution.expression)} = ${solution.number}`,890);
  const row={...solution,lines,height:Math.max(65,lines.length*39+24)};
  if(height+row.height>maxHeight && pages.at(-1).length){pages.push([]);height=660;}
  pages.at(-1).push(row);height+=row.height;
 }
 return pages;
}
function rounded(ctx,x,y,width,height,radius,fill) {
 ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,width,height,radius);ctx.fill();
}
function drawDie(ctx,value,x,y) {
 rounded(ctx,x,y,120,120,22,'#fcf6e9');
 ctx.strokeStyle='#d7c49e';ctx.lineWidth=2;ctx.stroke();
 const positions={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
 ctx.fillStyle='#143b43';
 if(positions[value])positions[value].forEach(p=>{ctx.beginPath();ctx.arc(x+28+((p-1)%3)*32,y+28+Math.floor((p-1)/3)*32,9,0,Math.PI*2);ctx.fill();});
 else{ctx.font='800 59px system-ui, sans-serif';ctx.textAlign='center';ctx.fillText(String(value),x+60,y+81);ctx.textAlign='left';}
 ctx.font='600 22px system-ui, sans-serif';ctx.textAlign='center';ctx.fillStyle='#526b65';ctx.fillText(String(value),x+60,y+153);ctx.textAlign='left';
}
export function drawReport(canvas,report,pages,pageIndex=0) {
 const rows=pages[pageIndex];canvas.width=1200;canvas.height=660+rows.reduce((sum,row)=>sum+row.height,0);
 const ctx=canvas.getContext('2d');ctx.fillStyle='#f5f6f3';ctx.fillRect(0,0,canvas.width,canvas.height);
 rounded(ctx,38,36,1124,canvas.height-72,26,'#ffffff');
 ctx.fillStyle='#14675c';ctx.font='800 27px system-ui, sans-serif';ctx.fillText('TERNINGMATTE',76,100);
 ctx.fillStyle='#143b43';ctx.font='800 42px system-ui, sans-serif';
 let name=report.name||'Rundestatus',fontSize=42;while(ctx.measureText(name).width>1025&&fontSize>22){fontSize--;ctx.font=`800 ${fontSize}px system-ui, sans-serif`;}
 ctx.fillText(name,76,160,1040);
 ctx.font='500 24px system-ui, sans-serif';ctx.fillStyle='#576d72';ctx.fillText(`${report.mode} · ${report.level}`,76,207);
 ctx.font='500 20px system-ui, sans-serif';ctx.fillText(report.advancedUsed?'Potenser eller fakultet er brukt i løsningene.':'Løsninger uten potenser eller fakultet.',76,240);
 ctx.font='700 22px system-ui, sans-serif';ctx.fillStyle='#143b43';ctx.fillText('DETTE KASTET GJELDER HELE RUNDEN',76,265);
 report.dice.forEach((value,index)=>drawDie(ctx,value,76+index*152,288));
 rounded(ctx,876,287,244,159,18,'#e5f1e9');ctx.fillStyle='#143b43';ctx.textAlign='center';ctx.font='800 54px system-ui, sans-serif';ctx.fillText(String(report.score),998,351);ctx.font='500 19px system-ui, sans-serif';ctx.fillText('ubrutt rekke fra 1',998,389);ctx.fillText(`${report.solutions.length} tall løst`,998,424);ctx.textAlign='left';
 ctx.fillStyle='#143b43';ctx.font='800 27px system-ui, sans-serif';ctx.fillText('LØSNINGENE',76,501);
 ctx.font='500 20px system-ui, sans-serif';ctx.fillStyle='#576d72';ctx.textAlign='right';ctx.fillText(pages.length>1?`Side ${pageIndex+1} av ${pages.length}`:'Hele runden',1120,501);ctx.textAlign='left';
 let y=530;
 for(const row of rows){
  rounded(ctx,66,y,1068,row.height-5,10,row.number%2?'#f5f8f5':'#edf3ed');
  ctx.font='800 23px system-ui, sans-serif';ctx.fillStyle='#14675c';ctx.fillText(String(row.number),84,y+39,99);
  ctx.font='500 28px system-ui, sans-serif';ctx.fillStyle='#143b43';row.lines.forEach((line,index)=>ctx.fillText(line,199,y+39+index*39));y+=row.height;
 }
 if(!rows.length){ctx.font='500 26px system-ui, sans-serif';ctx.fillStyle='#576d72';ctx.fillText('Ingen tall løst ennå.',76,y+36);}
 ctx.font='500 19px system-ui, sans-serif';ctx.fillStyle='#576d72';ctx.fillText('Ett kast. Mange muligheter.',76,canvas.height-68);
 return canvas;
}
