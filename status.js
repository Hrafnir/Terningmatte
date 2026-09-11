import {reportFromSaved,reportText,reportFilename,reportPages,drawReport,ROUND_KEY,NAME_KEY} from './report.js';
import {formatExpression} from './math.js';
const $=id=>document.getElementById(id);
let report=null,pages=[],pageIndex=0;
let name='';try{name=localStorage.getItem(NAME_KEY)||'';}catch{}
$('player-name').value=name;
function readReport(){let saved;try{saved=JSON.parse(localStorage.getItem(ROUND_KEY));}catch{}return reportFromSaved(saved,$('player-name').value);}
function updateImage(){
 if(!report)return;
 const canvas=$('report-image');pages=reportPages(report,canvas.getContext('2d'));
 pageIndex=Math.min(pageIndex,pages.length-1);drawReport(canvas,report,pages,pageIndex);
 $('report-paging').hidden=pages.length===1;
 $('paging-help').textContent=`Den lange listen er fordelt på ${pages.length} bilder, slik at alt er lesbart. Kopier eller last ned én bildeside om gangen. Tekstknappen kopierer hele runden.`;
 $('page-count').textContent=`${pageIndex+1} / ${pages.length}`;
 $('previous-page').disabled=pageIndex===0;$('next-page').disabled=pageIndex===pages.length-1;
 $('download-image').textContent=pages.length>1?`Last ned bilde ${pageIndex+1} av ${pages.length}`:'Last ned bilde';
 $('copy-image').textContent=pages.length>1?`Kopier bilde ${pageIndex+1} av ${pages.length}`:'Kopier bilde';
}
function refresh(){
 report=readReport();$('no-round').hidden=!!report;$('report-content').hidden=!report;
 if(!report)return;
 $('report-dice').replaceChildren();
 for(const number of report.dice){const box=document.createElement('span');box.className='report-die';box.textContent=number;$('report-dice').append(box);}
 $('report-dice').setAttribute('aria-label',`Terningene: ${report.dice.join(', ')}`);
 $('report-mode').textContent=`${report.mode} · ${report.level}. ${report.advancedUsed?'Potenser eller fakultet er brukt i løsningene.':'Løsninger uten potenser eller fakultet.'}`;
 $('report-score').textContent=report.score;$('report-total').textContent=report.solutions.length;
 $('report-solutions').replaceChildren();
 for(const solution of report.solutions){const li=document.createElement('li');const number=document.createElement('strong');number.textContent=solution.number;const expression=document.createElement('span');expression.textContent=`${formatExpression(solution.expression)} = ${solution.number}`;li.append(number,expression);$('report-solutions').append(li);}
 if(!report.solutions.length){const li=document.createElement('li');li.textContent='Ingen løsninger ennå. Fortsett runden og finn ditt første tall.';$('report-solutions').append(li);}
 updateImage();
}
function message(text){$('share-feedback').textContent=text;}
function imageBlob(){return new Promise((resolve,reject)=>$('report-image').toBlob(blob=>blob?resolve(blob):reject(new Error('Bildet kunne ikke lages.')),'image/png'));}
$('player-name').addEventListener('input',()=>{try{localStorage.setItem(NAME_KEY,$('player-name').value);}catch{}report=readReport();updateImage();});
$('previous-page').addEventListener('click',()=>{pageIndex=Math.max(0,pageIndex-1);updateImage();});
$('next-page').addEventListener('click',()=>{pageIndex=Math.min(pages.length-1,pageIndex+1);updateImage();});
$('copy-image').addEventListener('click',async()=>{
 if(!report)return;
 try{
  if(!navigator.clipboard?.write || typeof ClipboardItem==='undefined'){message('Nettleseren støtter ikke bildekopiering her. Bruk «Last ned bilde» og legg det ved i Teams.');return;}
  // Pass the promise immediately so Safari retains the user gesture.
  await navigator.clipboard.write([new ClipboardItem({'image/png':imageBlob()})]);
  message(pages.length>1?`Bilde ${pageIndex+1} av ${pages.length} er kopiert. Lim det inn i Teams.`:'Bildet er kopiert. Lim det inn i Teams.');
 }catch{message('Kunne ikke kopiere bildet. Bruk «Last ned bilde», eller gi nettleseren tilgang til utklippstavlen.');}
});
$('download-image').addEventListener('click',async()=>{
 if(!report)return;
 const filename=reportFilename(report.name,pageIndex,pages.length);
 try{const blob=await imageBlob(),url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);message(`Bildet er klart som ${filename}. Legg det ved i Teams.`);}catch{message('Bildet kunne ikke lastes ned. Prøv «Kopier som tekst».');}
});
$('copy-text').addEventListener('click',async()=>{
 if(!report)return;
 try{await navigator.clipboard.writeText(reportText(report));message('Hele runden er kopiert som tekst. Lim den inn i Teams.');}catch{message('Kunne ikke kopiere teksten. Prøv å laste ned bildet.');}
});
window.addEventListener('pageshow',refresh);
window.addEventListener('storage',event=>{if(event.key===ROUND_KEY)refresh();});
refresh();
