/* Version: #3 */

// === SEKSJON: SYSTEMLOGG ===
function logDebug(msg, type = 'info') {
    const logBox = document.getElementById('debug-log');
    if (!logBox) return;

    const time = new Date().toLocaleTimeString();
    let colorClass = 'log-info';
    if (type === 'warn') colorClass = 'log-warn';
    if (type === 'error') colorClass = 'log-error';
    if (type === 'success') colorClass = 'log-success';
    
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<span class="log-time">[${time}]</span> <span class="${colorClass}">${msg}</span>`;
    
    logBox.appendChild(entry);
    logBox.scrollTop = logBox.scrollHeight; // Auto-scroll til bunnen
    console.log(`[${type.toUpperCase()}] ${msg}`);
}

logDebug('Starter initialisering av script.js', 'info');

// === SEKSJON: GLOBALE VARIABLER (STATE) ===
let currentMode = 'sequential'; // 'sequential' eller 'freestyle'
let currentDice = []; // Inneholder de 5 aktuelle sifrene
let targetSequential = 1; // Målet vi skal nå i grunnmodus
let solvedFreestyle = new Set(); // Holder styr på løste tall i alternativ modus
let currentScore = 0; // Høyeste ubrutte rekke

// DOM Elementer
const elModeSelect = document.getElementById('game-mode');
const elBtnRoll = document.getElementById('btn-roll-dice');
const elBtnManual = document.getElementById('btn-manual-dice');
const elAvailableDice = document.getElementById('available-dice');
const elBuildArea = document.getElementById('expression-builder');
const elBtnEvalBuild = document.getElementById('btn-evaluate-build');
const elBtnClearBuild = document.getElementById('btn-clear-build');
const elManualInput = document.getElementById('manual-expression-input');
const elBtnEvalManual = document.getElementById('btn-evaluate-manual');
const elCurrentTarget = document.getElementById('current-target');
const elCurrentScore = document.getElementById('current-score');
const elResultsTbody = document.getElementById('results-tbody');

// === SEKSJON: INITIALISERING OG HENDELSER ===
document.addEventListener('DOMContentLoaded', () => {
    logDebug('DOM lastet. Knytter hendelser til knapper.', 'info');

    // Modusvalg
    elModeSelect.addEventListener('change', (e) => {
        currentMode = e.target.value;
        logDebug(`Spillmodus endret til: ${currentMode}`, 'info');
        updateScoreUI();
    });

    // Terningkast
    elBtnRoll.addEventListener('click', rollDice);
    elBtnManual.addEventListener('click', inputManualDice);

    // Evaluering
    elBtnEvalBuild.addEventListener('click', evaluateBuildArea);
    elBtnClearBuild.addEventListener('click', clearBuildArea);
    elBtnEvalManual.addEventListener('click', () => {
        evaluateExpression(elManualInput.value, 'manual');
    });

    // Tillat "Enter" i tekstfeltet
    elManualInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') evaluateExpression(elManualInput.value, 'manual');
    });

    // Sett opp Drag & Drop for statiske operatorer
    setupDraggableOperators();
    setupDropZones();
});

// === SEKSJON: TERNINGLOGIKK ===
function rollDice() {
    currentDice = [];
    for (let i = 0; i < 5; i++) {
        currentDice.push(Math.floor(Math.random() * 6) + 1);
    }
    logDebug(`Kastet 5 terninger: ${currentDice.join(', ')}`, 'success');
    renderDice();
    clearBuildArea();
}

function inputManualDice() {
    const input = prompt("Skriv inn 5 siffer atskilt med komma (f.eks: 1,3,4,5,5):");
    if (!input) return;

    const parsed = input.split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n) && n >= 0 && n <= 9);
    
    if (parsed.length === 5) {
        currentDice = parsed;
        logDebug(`Manuelle terninger valgt: ${currentDice.join(', ')}`, 'success');
        renderDice();
        clearBuildArea();
    } else {
        logDebug(`Feil format på manuell inntasting: ${input}`, 'error');
        alert("Du må skrive inn nøyaktig 5 gyldige siffer.");
    }
}

function renderDice() {
    elAvailableDice.innerHTML = '';
    currentDice.forEach((val, index) => {
        const die = document.createElement('div');
        die.className = 'die draggable';
        die.draggable = true;
        die.dataset.val = val;
        die.dataset.id = `die-${index}`; // Unik ID for å spore hvilken terning det er
        die.textContent = val;
        
        die.addEventListener('dragstart', handleDragStart);
        die.addEventListener('dragend', handleDragEnd);
        
        // Klikk for å raskt flytte terningen tilbake til source
        die.addEventListener('dblclick', function() {
            if (this.parentElement.id === 'expression-builder') {
                elAvailableDice.appendChild(this);
                logDebug(`Terning ${this.dataset.val} returnert via dobbeltklikk.`, 'info');
            }
        });

        elAvailableDice.appendChild(die);
    });
}

// === SEKSJON: DRAG & DROP LOGIKK ===
let draggedElement = null;
let isCloning = false;

function setupDraggableOperators() {
    const operators = document.querySelectorAll('#available-operators .operator');
    operators.forEach(op => {
        op.addEventListener('dragstart', (e) => {
            draggedElement = op;
            isCloning = true; // Operatorer skal klones fra verktøykassen
            e.dataTransfer.effectAllowed = 'copy';
            op.classList.add('is-dragging');
            logDebug(`Starter dra-operasjon for operator: ${op.dataset.val}`, 'info');
        });
        op.addEventListener('dragend', handleDragEnd);
    });
}

function handleDragStart(e) {
    draggedElement = this;
    isCloning = false; // Terninger klones IKKE, de flyttes
    e.dataTransfer.effectAllowed = 'move';
    this.classList.add('is-dragging');
    logDebug(`Starter dra-operasjon for terning: ${this.dataset.val}`, 'info');
}

function handleDragEnd(e) {
    if (draggedElement) draggedElement.classList.remove('is-dragging');
    draggedElement = null;
    isCloning = false;
    document.querySelectorAll('.dropzone').forEach(dz => dz.classList.remove('drag-over'));
}

function setupDropZones() {
    const dropZones = document.querySelectorAll('.dropzone');
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault(); // Tillat slipp
            e.dataTransfer.dropEffect = isCloning ? 'copy' : 'move';
            zone.classList.add('drag-over');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('drag-over');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            
            if (!draggedElement) return;

            const targetType = zone.dataset.type;
            
            if (isCloning) {
                // Slipper en operator i byggeflaten
                if (targetType === 'builder') {
                    const clone = draggedElement.cloneNode(true);
                    clone.classList.remove('is-dragging');
                    clone.addEventListener('dblclick', () => {
                        clone.remove(); // Dobbeltklikk for å slette operator fra bygg
                        logDebug(`Fjernet operator ${clone.dataset.val} fra bygg.`, 'info');
                    });
                    zone.appendChild(clone);
                    logDebug(`Slapp operator ${clone.dataset.val} i byggeflaten.`, 'success');
                }
            } else {
                // Flytter en terning
                zone.appendChild(draggedElement);
                logDebug(`Flyttet terning ${draggedElement.dataset.val} til ${zone.id}.`, 'success');
            }
        });
    });
}

// === SEKSJON: BYGGEFLATE & EVALUERING ===
function clearBuildArea() {
    // Fjern alle elementer i byggeflaten
    const items = Array.from(elBuildArea.children);
    items.forEach(item => {
        if (item.classList.contains('die')) {
            elAvailableDice.appendChild(item); // Flytt terninger tilbake
        } else if (item.classList.contains('operator')) {
            item.remove(); // Slett operatorer
        }
    });
    logDebug('Tømte byggeflaten.', 'info');
}

function evaluateBuildArea() {
    const items = Array.from(elBuildArea.children);
    if (items.length === 0) {
        logDebug('Byggeflaten er tom.', 'warn');
        return;
    }
    
    // Bygg opp uttrykket som en streng
    let expressionStr = items.map(item => item.dataset.val).join('');
    logDebug(`Forsøker å evaluere bygd uttrykk: ${expressionStr}`, 'info');
    
    evaluateExpression(expressionStr, 'build');
}

// === SEKSJON: MATEMATIKK & VALIDERING ===

function evaluateExpression(exprStr, source) {
    exprStr = exprStr.replace(/\s+/g, ''); // Fjern mellomrom
    logDebug(`Evaluerer: "${exprStr}" fra ${source}`, 'info');

    if (exprStr === '') {
        alert("Uttrykket er tomt!");
        return;
    }

    if (currentDice.length !== 5) {
        alert("Du må kaste terningene først!");
        logDebug('Avbrutt: Terninger ikke kastet.', 'warn');
        return;
    }

    // 1. Validering av siffer-bruk
    if (!validateDiceUsage(exprStr)) {
        alert("Ugyldig bruk av siffer! Du kan kun bruke de terningene du har, og hver terning maks én gang.");
        return;
    }

    // 2. Pars og beregn
    try {
        const result = calculateMath(exprStr);
        logDebug(`Resultat av beregning: ${result}`, 'info');

        if (!isFinite(result) || isNaN(result)) {
            alert(`Ugyldig matematikk. Resultatet ble: ${result}`);
            logDebug('Matte-feil: NaN eller Infinity', 'error');
            return;
        }
        
        // Sjekk om resultatet er et heltall (spillet handler om hele tall)
        if (result % 1 !== 0) {
            alert(`Svaret ble et desimaltall (${result}). Du må bygge heltall!`);
            logDebug('Svar avvist pga desimaler.', 'warn');
            return;
        }

        handleSuccessfulResult(exprStr, result);

    } catch (error) {
        logDebug(`Parsing feilet: ${error.message}`, 'error');
        alert(`Kunne ikke forstå uttrykket: ${error.message}`);
    }
}

function validateDiceUsage(expr) {
    const digitsInExpr = expr.match(/\d/g) || [];
    let available = [...currentDice];
    
    logDebug(`Sjekker sifferbruk. Uttrykk har: [${digitsInExpr}], Tilgjengelig: [${available}]`, 'info');

    for (let d of digitsInExpr) {
        let num = parseInt(d, 10);
        let idx = available.indexOf(num);
        if (idx === -1) {
            logDebug(`Validering feilet: Sifferet ${num} er ikke tilgjengelig eller brukt for mange ganger.`, 'error');
            return false;
        }
        available.splice(idx, 1); // Fjern for å forhindre gjenbruk
    }
    
    logDebug('Validering av siffer godkjent.', 'success');
    return true;
}

function handleSuccessfulResult(expr, result) {
    if (currentMode === 'sequential') {
        if (result === targetSequential) {
            logDebug(`Riktig! Målet ${targetSequential} ble truffet.`, 'success');
            addResultToTable(targetSequential, expr);
            targetSequential++;
            updateScoreUI();
            elManualInput.value = ''; // Tøm input-felt
        } else {
            logDebug(`Svaret ble ${result}, men målet er ${targetSequential}.`, 'warn');
            alert(`Du fikk ${result}, men du må finne et uttrykk for ${targetSequential}.`);
        }
    } else {
        // Freestyle mode
        if (result > 0) {
            if (!solvedFreestyle.has(result)) {
                solvedFreestyle.add(result);
                logDebug(`Freestyle: La til ${result} i løste tall.`, 'success');
                addResultToTable(result, expr);
                calculateFreestyleScore();
                elManualInput.value = '';
            } else {
                logDebug(`Tallet ${result} er allerede funnet.`, 'warn');
                alert(`Du har allerede funnet ${result}!`);
            }
        } else {
            alert(`Tallet må være større enn 0.`);
        }
    }
}

function updateScoreUI() {
    elCurrentTarget.textContent = targetSequential;
    elCurrentScore.textContent = currentScore;
    
    if (currentMode === 'sequential') {
        elCurrentTarget.parentElement.style.display = 'block';
    } else {
        elCurrentTarget.parentElement.style.display = 'none';
    }
}

function calculateFreestyleScore() {
    let check = 1;
    while (solvedFreestyle.has(check)) {
        check++;
    }
    currentScore = check - 1; // Høyeste ubrutte rekke
    logDebug(`Beregnet ny poengsum for freestyle: ${currentScore}`, 'info');
    updateScoreUI();
}

function addResultToTable(number, expr) {
    const tr = document.createElement('tr');
    tr.className = 'success-row';
    tr.innerHTML = `<td>${number}</td><td>${expr} = ${number}</td>`;
    
    // Legg til øverst i tabellen
    elResultsTbody.insertBefore(tr, elResultsTbody.firstChild);
}

// === SEKSJON: MATTE PARSER (Shunting Yard) ===

// Hjelpefunksjon for fakultet
function factorial(n) {
    if (n < 0) return NaN;
    if (n === 0 || n === 1) return 1;
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
}

// Fullverdig lexer/parser
function calculateMath(expr) {
    logDebug('Starter tokenisering (Lexing)...', 'info');
    let tokens = [];
    let numStr = "";
    
    // Tokenizer
    for (let i = 0; i < expr.length; i++) {
        let char = expr[i];
        
        if (/[0-9]/.test(char)) {
            numStr += char;
        } else {
            if (numStr !== "") {
                tokens.push({ type: 'number', value: parseFloat(numStr) });
                numStr = "";
            }
            if ("+-*/^!()".includes(char)) {
                // Sjekk for unær minus (f.eks negativt tall)
                if (char === '-') {
                    const prev = tokens.length > 0 ? tokens[tokens.length - 1] : null;
                    if (!prev || (prev.type === 'operator' && prev.value !== ')') || (prev.type === 'operator' && prev.value === '(')) {
                        tokens.push({ type: 'operator', value: 'u-' }); // unær minus
                        continue;
                    }
                }
                tokens.push({ type: 'operator', value: char });
            } else if (char.trim() !== '') {
                throw new Error(`Ugyldig tegn: ${char}`);
            }
        }
    }
    if (numStr !== "") {
        tokens.push({ type: 'number', value: parseFloat(numStr) });
    }
    
    logDebug(`Tokens: ${tokens.map(t => t.value).join(' | ')}`, 'info');

    // Operator prioritet
    const precedence = {
        '+': 1, '-': 1,
        '*': 2, '/': 2,
        'u-': 3, // Unær minus
        '^': 4,
        '!': 5
    };

    // Shunting Yard Algoritme (Infix -> Postfix)
    let outputQueue = [];
    let operatorStack = [];

    tokens.forEach(token => {
        if (token.type === 'number') {
            outputQueue.push(token);
        } else if (token.type === 'operator') {
            if (token.value === '(') {
                operatorStack.push(token);
            } else if (token.value === ')') {
                while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].value !== '(') {
                    outputQueue.push(operatorStack.pop());
                }
                if (operatorStack.length === 0) throw new Error("Feil med parenteser (manglende start-parentes).");
                operatorStack.pop(); // Fjern '('
            } else {
                // Vanlig operator
                while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].value !== '(') {
                    let topOp = operatorStack[operatorStack.length - 1];
                    // Høyre-assosiative operatorer (^ og unær minus)
                    let isRightAssoc = token.value === '^' || token.value === 'u-';
                    
                    if ((!isRightAssoc && precedence[token.value] <= precedence[topOp.value]) ||
                        (isRightAssoc && precedence[token.value] < precedence[topOp.value])) {
                        outputQueue.push(operatorStack.pop());
                    } else {
                        break;
                    }
                }
                operatorStack.push(token);
            }
        }
    });

    while (operatorStack.length > 0) {
        let op = operatorStack.pop();
        if (op.value === '(') throw new Error("Feil med parenteser (manglende slutt-parentes).");
        outputQueue.push(op);
    }

    logDebug(`Postfix (RPN): ${outputQueue.map(t => t.value).join(' ')}`, 'info');

    // Evaluer Postfix (RPN)
    let evalStack = [];
    
    outputQueue.forEach(token => {
        if (token.type === 'number') {
            evalStack.push(token.value);
        } else if (token.type === 'operator') {
            if (token.value === '!') {
                let a = evalStack.pop();
                if (a === undefined) throw new Error("Mangler tall før !");
                if (a % 1 !== 0 || a < 0) throw new Error("Fakultet kun lovlig for positive heltall.");
                evalStack.push(factorial(a));
            } else if (token.value === 'u-') {
                let a = evalStack.pop();
                if (a === undefined) throw new Error("Mangler tall for negativt fortegn");
                evalStack.push(-a);
            } else {
                let b = evalStack.pop();
                let a = evalStack.pop();
                if (a === undefined || b === undefined) throw new Error("Manglende operander.");
                
                switch (token.value) {
                    case '+': evalStack.push(a + b); break;
                    case '-': evalStack.push(a - b); break;
                    case '*': evalStack.push(a * b); break;
                    case '/': 
                        if (b === 0) throw new Error("Deling på null er ikke lov!");
                        evalStack.push(a / b); 
                        break;
                    case '^': evalStack.push(Math.pow(a, b)); break;
                }
            }
        }
    });

    if (evalStack.length !== 1) {
        throw new Error("Ugyldig uttrykk, kunne ikke evalueres til et enkelt svar.");
    }

    return evalStack[0];
}

/* Version: #3 */
