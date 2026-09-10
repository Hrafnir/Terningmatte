import {newRound, recordSolution, scoreFor, formatExpression, normalizeExpression, parseManualDice, evaluateForRound} from './math.js';
const $ = id => document.getElementById(id);
const KEY = 'terningmatte-round-v2';
let state = {version:2, dice:[],mode:'sequential',level:'basic',solutions:{},tokens:[],manual:'',entry:'build',muted:false};
let undoStack = [], draggedIndex = null, hintWorker = null, hintStage = 0, hintExpression = null, hintKey = '';
let hintTimer = null;
let restored = false;
try {
 const saved = JSON.parse(localStorage.getItem(KEY));
 if (saved && saved.version === 2 && saved.dice?.length === 5) {
  const clean = newRound(saved.dice, saved.mode === 'freestyle' ? 'freestyle' : 'sequential', saved.level === 'advanced' ? 'advanced' : 'basic');
  for (const [number, expr] of Object.entries(saved.solutions || {})) { try { if (evaluateForRound(expr,clean.dice,'advanced') === Number(number)) clean.solutions[number] = expr; } catch {} }
  clean.entry = saved.entry === 'write' ? 'write' : 'build'; clean.manual = typeof saved.manual === 'string' ? saved.manual.slice(0,150) : ''; clean.muted = !!saved.muted;
  const used = new Set();
  clean.tokens = Array.isArray(saved.tokens) ? saved.tokens.slice(0,100).filter(t => {
   if (!t || typeof t !== 'object') return false;
   if (t.die !== undefined) { if (!Number.isInteger(t.die) || t.die < 0 || t.die > 4 || used.has(t.die)) return false; used.add(t.die); t.value = String(clean.dice[t.die]); return true; }
   return typeof t.value === 'string' && /^[+*/^!()\-]$/.test(t.value);
  }) : [];
  state = clean; restored = true;
 }
} catch { $('save-status').textContent = 'Lagring er ikke tilgjengelig. Hold siden åpen for å beholde runden.'; }
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { $('save-status').textContent = 'Kunne ikke lagre. Hold siden åpen for å beholde runden.'; } }
function target() { return scoreFor(state.solutions) + 1; }
function feedback(message, type='neutral') { $('feedback').textContent = message; $('feedback').className = `feedback ${type}`; }
function coach(message) { $('coach-message').textContent = message; }
function remember() { undoStack.push({tokens:structuredClone(state.tokens),manual:state.manual}); if (undoStack.length > 50) undoStack.shift(); }
function symbols(value) { return {'*':'×','/':'÷','-':'−','^':'xʸ'}[value] || value; }
const dots = {1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
function renderDice() {
 const tray = $('dice-tray'); tray.replaceChildren();
 const dice = state.dice.length ? state.dice : [1,2,3,4,5];
 dice.forEach((value,index) => {
  const button = document.createElement('button'); const used = state.entry === 'build' && state.tokens.some(t => t.die === index);
  button.className = `die${used?' used':''}${!state.dice.length?' ghost':''}`; button.disabled = !state.dice.length || used;
  button.setAttribute('aria-label', `Terning ${index+1}: ${value}${used?', brukt':', legg til'}`);
  button.title = `${value}${used?' · allerede i uttrykket':''}`;
  if (dots[value]) dots[value].forEach(position => { const pip = document.createElement('span'); pip.className='pip'; pip.style.gridArea=`${Math.ceil(position/3)} / ${(position-1)%3+1}`; pip.setAttribute('aria-hidden','true'); button.append(pip); });
  else { const digit = document.createElement('span'); digit.className='digit'; digit.textContent=value; button.append(digit); }
  button.addEventListener('click', () => append({value:String(value),die:index}));
  button.draggable = !button.disabled && state.entry === 'build';
  button.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain',`die:${index}`); e.dataTransfer.effectAllowed='copy'; });
  tray.append(button);
 });
 $('dice-count').textContent = state.dice.length ? (state.entry === 'build' ? `${state.tokens.filter(t=>t.die!==undefined).length} av 5 i uttrykket · fast kast` : 'Fem faste terninger') : 'Samme kast hele runden';
 $('dice-help').textContent = state.dice.length ? 'Terningene brukes på nytt for hvert tall. Selve kastet er låst.' : 'Start en runde for å kaste. Terningene varer hele runden.';
}
function renderExpression() {
 const container = $('expression'); container.replaceChildren(); container.classList.toggle('empty',!state.tokens.length);
 if (!state.tokens.length) { container.textContent = state.dice.length ? 'Trykk på en terning for å begynne …' : 'Her bygger du ditt første uttrykk'; return; }
 state.tokens.forEach((token,index) => {
  const wrapper = document.createElement('span'); wrapper.className=`expression-token ${token.die!==undefined?'dice-token':''}`; wrapper.draggable=true;
  const button = document.createElement('button'); button.className='token-main'; button.textContent=token.value==='^'?'^':symbols(token.value); button.setAttribute('aria-label',`Fjern ${symbols(token.value)} på plass ${index+1}`);
  button.addEventListener('click', () => { remember(); state.tokens.splice(index,1); renderBoard(); }); wrapper.append(button);
  const arrows = document.createElement('span'); arrows.className='token-arrows';
  [-1,1].forEach(direction => { const arrow = document.createElement('button'); arrow.textContent=direction<0?'‹':'›'; arrow.disabled=index+direction<0 || index+direction>=state.tokens.length; arrow.setAttribute('aria-label',`Flytt ${symbols(token.value)} ${direction<0?'til venstre':'til høyre'}`); arrow.addEventListener('click',()=>moveToken(index,index+direction)); arrows.append(arrow); }); wrapper.append(arrows);
  wrapper.addEventListener('dragstart',e=>{draggedIndex=index;e.dataTransfer.setData('text/plain',`token:${index}`);e.dataTransfer.effectAllowed='move';});
  wrapper.addEventListener('dragend',()=>{draggedIndex=null;container.classList.remove('drop-active');});
  wrapper.addEventListener('dragover',e=>e.preventDefault());
  wrapper.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();dropToken(e,index);});
  container.append(wrapper);
 });
}
function moveToken(from,to) { remember(); const [token]=state.tokens.splice(from,1); state.tokens.splice(to,0,token); renderBoard(); }
function dropToken(e,index=state.tokens.length) {
 const data=e.dataTransfer.getData('text/plain'); $('expression').classList.remove('drop-active');
 if (/^token:\d$/.test(data) || /^token:\d{2}$/.test(data)) { const from=Number(data.split(':')[1]); if(state.tokens[from]) moveToken(from,Math.min(index,state.tokens.length-1)); }
 else if (/^die:[0-4]$/.test(data)) { const die=Number(data.split(':')[1]); if(state.dice.length && !state.tokens.some(t=>t.die===die)) {remember();state.tokens.splice(index,0,{die,value:String(state.dice[die])});renderBoard();} }
 else if (/^op:[+*/^!()\-]$/.test(data)) { const value=data.slice(3); if(state.dice.length && (state.level==='advanced'||!/[!^]/.test(value))) {remember();state.tokens.splice(index,0,{value});renderBoard();} }
}
function append(token) {
 if (!state.dice.length) return;
 if (state.entry === 'write') { const input=$('manual-expression'); const start=input.selectionStart??state.manual.length,end=input.selectionEnd??start; remember(); state.manual=state.manual.slice(0,start)+token.value+state.manual.slice(end);input.value=state.manual;input.focus();input.setSelectionRange(start+1,start+1);save();return; }
 if (state.tokens.length>=100) {feedback('Uttrykket er fullt. Prøv å forenkle det.','error');return;}
 if (token.die !== undefined && state.tokens.some(t=>t.die===token.die)) return;
 remember();state.tokens.push(token);renderBoard();
}
function renderOperators() {
 $('operators').replaceChildren();
 const names={'+':'Pluss','-':'Minus','*':'Gange','/':'Dele','(':'Startparentes',')':'Sluttparentes','^':'Potens','!':'Fakultet'};
 for(const value of state.level==='advanced'?['+','-','*','/','(',')','^','!']:['+','-','*','/','(',')']) {
  const button=document.createElement('button');button.className='operator';button.textContent=symbols(value);button.title=names[value];button.setAttribute('aria-label',names[value]);button.disabled=!state.dice.length;button.draggable=state.dice.length>0;button.addEventListener('click',()=>append({value}));button.addEventListener('dragstart',e=>e.dataTransfer.setData('text/plain',`op:${value}`));$('operators').append(button);
 }
}
function renderProgress() {
 const score=scoreFor(state.solutions), next=score+1, count=Object.keys(state.solutions).length;
 $('score').textContent=score; $('solved-count').textContent=`${count} løst`; $('number-path').replaceChildren();
 const start=Math.max(1,Math.floor((next-1)/15)*15+1);
 for(let n=start;n<start+15;n++){const item=document.createElement('span');const solved=Object.hasOwn(state.solutions,n);item.className=`path-number${solved?' solved':n===next?' next':''}`;item.textContent=n;item.setAttribute('aria-label',`${n}, ${solved?'løst':n===next?'neste i rekken':'ikke løst'}`);if(n===next)item.setAttribute('aria-current','step');$('number-path').append(item);}
 $('progress-description').textContent=state.mode==='sequential'?'Start på 1 og bygg deg videre.':`Lag positive heltall fritt. ${next} er neste hull i rekken.`;
 $('solution-list').replaceChildren();
 if (!count){const li=document.createElement('li');li.textContent='Dine løsninger dukker opp her.';$('solution-list').append(li);}
 Object.entries(state.solutions).sort(([a],[b])=>Number(a)-Number(b)).forEach(([number,expr])=>{const li=document.createElement('li');li.textContent=`${formatExpression(expr)} = ${number}`;$('solution-list').append(li);});
}
function renderBoard(){renderDice();renderExpression();$('undo').disabled=!undoStack.length;save();}
function render() {
 const next=target();$('target').textContent=state.mode==='sequential'?next:'?';$('target-label').textContent=state.mode==='sequential'?'DITT NESTE MÅL':'HVILKET TALL FINNER DU?';
 $('target-help').replaceChildren();const line1=document.createTextNode(state.mode==='sequential'?'Bygg et uttrykk':'Finn et nytt');const br=document.createElement('br');const line2=document.createTextNode(state.mode==='sequential'?`som blir ${next}.`:'positivt heltall.');$('target-help').append(line1,br,line2);
 $('round-status').textContent=state.dice.length?'Kastet er låst':'Klar for første kast';$('new-round').querySelector('span').textContent=state.dice.length?'Start ny runde':'Start en runde';
 document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===state.mode));document.querySelectorAll('[data-entry]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.entry===state.entry));
 $('level').value=state.level;$('build-panel').hidden=state.entry!=='build';$('write-panel').hidden=state.entry!=='write';$('manual-expression').value=state.manual;$('manual-expression').disabled=!state.dice.length;
 $('check').disabled=!state.dice.length;$('clear').disabled=!state.dice.length;$('hint').disabled=!state.dice.length;$('coach-body').hidden=state.muted;$('mute-coach').textContent=state.muted?'+':'−';$('mute-coach').setAttribute('aria-label',state.muted?'Vis råd':'Skjul råd');
 renderBoard();renderOperators();renderProgress();
}
function resetHints(){clearTimeout(hintTimer);hintWorker?.terminate();hintWorker=null;hintStage=0;hintExpression=null;hintKey='';$('hint').textContent='Gi meg et hint ✦';$('hint').disabled=!state.dice.length;}
function check(){try{const expression=state.entry==='write'?state.manual:state.tokens.map(t=>t.value).join('');const before=target();state=recordSolution(state,expression);const value=evaluateForRound(expression,state.dice,state.level);undoStack=[];resetHints();render();feedback(`${formatExpression(normalizeExpression(expression))} = ${value}. Riktig! ${state.mode==='sequential'?`Neste mål er ${target()}.`:`${value===before?'Tallstien vokser!':'Tallet er lagt til i samlingen.'}`}`,'success');const jokes=['Der satt den! Jeg nikker så faglig at brillene nesten sklir av.','Godt tenkt! Jeg skulle akkurat til å foreslå det samme. Helt sikkert.','Du fant en vei! Jeg fant pekefingeren min. Vi bidrar begge to.','Pent regnet. Jeg tar en liten seiersdans. Du slipper å se hele.'];coach(jokes[Object.keys(state.solutions).length%jokes.length]);animateCoach();}catch(error){feedback(error.message,'error');coach('Dette er et forsøk, ikke en dom. Jeg har selv mistet oversikten inni en parentes. La oss se på ett steg om gangen.');}}
function animateCoach(){if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.querySelector('.avatar')?.animate([{transform:'rotate(0)'},{transform:'rotate(-8deg) scale(1.08)'},{transform:'rotate(7deg)'},{transform:'rotate(0)'}],{duration:550});}
$('new-round').addEventListener('click',()=>{const active=state.dice.length===5;$('round-title').textContent=active?'Slette runden og kaste på nytt?':'La oss kaste terningene!';$('delete-warning').hidden=!active;$('round-warning').textContent=active?'Du beholder dette kastet helt til du velger å starte en ny runde.':'Du får fem terninger som du beholder gjennom hele runden.';$('cancel-round').textContent=active?'Behold runden':'Avbryt';$('confirm-round').textContent=active?'Slett og start på 1':'Kast og start';$('round-error').textContent='';$('round-dialog').showModal();$('cancel-round').focus();});
$('cancel-round').addEventListener('click',()=>$('round-dialog').close());
document.querySelectorAll('[name=dice-source]').forEach(r=>r.addEventListener('change',()=>{$('manual-dice-group').hidden=r.value!=='manual';}));
$('round-form').addEventListener('submit',e=>{e.preventDefault();try{const manual=document.querySelector('[name=dice-source]:checked').value==='manual';const dice=manual?parseManualDice($('manual-dice').value):Array.from({length:5},()=>Math.floor(Math.random()*6)+1);const muted=state.muted;state=newRound(dice,state.mode,state.level);state.muted=muted;undoStack=[];resetHints();render();$('round-dialog').close();feedback('Kastet er låst for denne runden. Begynn med 1 – terningene kan brukes igjen i hvert nytt uttrykk.');coach('Fem terninger. Ingen omkast. Jeg har også prøvd å forhandle med dem. De svarte med prikker.');$('check').focus();}catch(error){$('round-error').textContent=error.message;}});
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{state.mode=b.dataset.mode;resetHints();render();feedback('Du beholder kastet og alle løsningene når du bytter modus.');}));
$('level').addEventListener('change',()=>{state.level=$('level').value;resetHints();render();feedback(state.level==='advanced'?'Potenser og fakultet er åpnet. Kastet og løsningene dine beholdes.':'Grunnleggende regnetegn er valgt. Tidligere løsninger beholdes.');});
document.querySelectorAll('[data-entry]').forEach(b=>b.addEventListener('click',()=>{state.entry=b.dataset.entry;render();if(state.entry==='write')$('manual-expression').focus();}));
$('manual-expression').maxLength=150;$('manual-expression').addEventListener('input',()=>{remember();state.manual=$('manual-expression').value;save();$('undo').disabled=false;});$('manual-expression').addEventListener('keydown',e=>{if(e.key==='Enter')check();});
$('check').addEventListener('click',check);$('clear').addEventListener('click',()=>{remember();if(state.entry==='build')state.tokens=[];else state.manual='';render();});$('undo').addEventListener('click',()=>{const previous=undoStack.pop();if(previous){Object.assign(state,previous);render();}});
$('mute-coach').addEventListener('click',()=>{state.muted=!state.muted;render();});
$('expression').addEventListener('dragover',e=>{e.preventDefault();$('expression').classList.add('drop-active');});$('expression').addEventListener('dragleave',()=>{$('expression').classList.remove('drop-active');});$('expression').addEventListener('drop',e=>{e.preventDefault();dropToken(e);});
$('hint').addEventListener('click',()=>requestHint());
function requestHint(){
 const key=JSON.stringify([state.dice,target(),state.level]);if(key!==hintKey){resetHints();hintKey=key;}
 if(hintExpression){showHint();return;}
 if(hintWorker)return;
 $('hint').disabled=true;coach(`Jeg leter etter en vei til ${target()}. Pekefingeren er klar. Hjernen jobber.`);
 try{
 hintWorker=new Worker('hint-worker.js',{type:'module'});const timer=hintTimer=setTimeout(()=>{hintWorker?.terminate();hintWorker=null;$('hint').disabled=false;coach('Jeg fant ikke en kort løsning denne gangen. Prøv å lage 1 med to like terninger, eller se på parenteser. Kastet beholder vi.');},7000);
 hintWorker.onmessage=e=>{clearTimeout(timer);hintWorker?.terminate();hintWorker=null;$('hint').disabled=false;if(e.data.expression){try{if(evaluateForRound(e.data.expression,state.dice,state.level)!==target())throw Error();hintExpression=e.data.expression;showHint();}catch{coach('Jeg mistet tråden i regningen. Prøv å dele opp måltallet i to mindre tall.');}}else{coach('Jeg fant ikke en løsning med regnetegnene jeg prøvde. Det betyr ikke at det er umulig. Prøv parenteser eller flere regnetegn – kastet ligger fast.');}};
 hintWorker.onerror=()=>{clearTimeout(timer);hintWorker?.terminate();hintWorker=null;$('hint').disabled=false;coach('Hintene tok en tenkepause. Prøv å lage måltallet som en sum eller en differanse.');};
 hintWorker.postMessage({dice:state.dice,target:target(),level:state.level});
 }catch{$('hint').disabled=false;coach('Prøv å dele måltallet i to mindre tall du kan bygge.');}
}
function showHint(){
 hintStage++;const digits=hintExpression.match(/\d/g)||[];
 if(hintStage===1){coach(`Prøv å lage ${target()} med ${digits.length===1?'én terning':`${digits.length} terninger`}. Du trenger ikke bruke alle fem. Jeg liker også å spare på kreftene.`);$('hint').textContent='Et tydeligere hint →';}
 else if(hintStage===2){coach(`Se på ${digits.join(', ')}. ${hintExpression.includes('!')?'Fakultet er nyttig her.':hintExpression.includes('^')?'Prøv en potens.':hintExpression.includes('/')?'Deling kan være nyttig her.':hintExpression.includes('*')?'Ganging kan være nyttig her.':'Prøv pluss eller minus.'} Jeg holder pekefingeren unna fasiten litt til.`);$('hint').textContent='Vis én mulig løsning';}
 else{coach(`Én vei er ${formatExpression(hintExpression)} = ${target()}. Bygg uttrykket selv og sjekk det. Jeg bidro mest med skjegg, men vi kom fram.`);$('hint').textContent='Vis løsningen igjen';}
}
render();
if(restored){feedback('Velkommen tilbake! Samme kast og alle løsningene dine er hentet fram.');coach('Jeg har passet på terningene. De har ikke rørt seg. Eksemplarisk klasseledelse.');}
let practice;try{practice=sessionStorage.getItem('terningmatte-practice');}catch{}if(practice){try{sessionStorage.removeItem('terningmatte-practice');}catch{}feedback(`Fra matematikksiden: ${practice} Prøv ideen med kastet ditt – du trenger ikke ha de samme tallene.`);}
