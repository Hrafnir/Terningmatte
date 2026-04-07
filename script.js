/* Version: #15 */

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
    logBox.scrollTop = logBox.scrollHeight; 
    console.log(`[${type.toUpperCase()}] ${msg}`);
}

logDebug('Starter initialisering av script.js med mål-UI og juksesperre', 'info');

// === SEKSJON: GLOBALE VARIABLER (STATE) ===
let currentMode = 'sequential'; 
let currentDice = []; 
let targetSequential = 1; 
let solvedFreestyle = new Set(); 
let currentScore = 0; 

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

// Nye DOM-elementer for iPad-fokus UI
const elBuildTargetBadge = document.getElementById('build-target-badge');
const elBuildTargetNumber = document.getElementById('build-target-number');

// Visuell placeholder for Drag & Drop mellom elementer
const dragPlaceholder = document.createElement('div');
dragPlaceholder.className = 'drag-placeholder';

// === SEKSJON: INITIALISERING OG HENDELSER ===
document.addEventListener('DOMContentLoaded', () => {
    logDebug('DOM lastet. Knytter hendelser til knapper.', 'info');

    elModeSelect.addEventListener('change', (e) => {
        currentMode = e.target.value;
        logDebug(`Spillmodus endret til: ${currentMode}`, 'info');
        updateScoreUI();
    });

    elBtnRoll.addEventListener('click', rollDice);
    elBtnManual.addEventListener('click', inputManualDice);
    elBtnEvalBuild.addEventListener('click', evaluateBuildArea);
    elBtnClearBuild.addEventListener('click', clearBuildArea);
    
    elBtnEvalManual.addEventListener('click', () => {
        evaluateExpression(elManualInput.value, 'manual');
    });

    elManualInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') evaluateExpression(elManualInput.value, 'manual');
    });

    setupDraggableOperators();
    setupDropZones();
    updateScoreUI(); // Sørg for at UI er riktig fra start
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

function createDiceDots(val) {
    const dotsMap = {
        1: ['pos-mc'],
        2: ['pos-tl', 'pos-br'],
        3: ['pos-tl', 'pos-mc', 'pos-br'],
        4: ['pos-tl', 'pos-tr', 'pos-bl', 'pos-br'],
        5: ['pos-tl', 'pos-tr', 'pos-mc', 'pos-bl', 'pos-br'],
        6: ['pos-tl', 'pos-ml', 'pos-bl', 'pos-tr', 'pos-mr', 'pos-br']
    };

    let html = '';
    if (dotsMap[val]) {
        dotsMap[val].forEach(posClass => {
            html += `<div class="dot ${posClass}"></div>`;
        });
    } else {
        html = `<span style="align-self:center; justify-self:center; grid-area: 2/2; font-size: 1.5rem; font-weight: bold;">${val}</span>`;
    }
    return html;
}

function renderDice() {
    elAvailableDice.innerHTML = '';
    currentDice.forEach((val, index) => {
        const die = document.createElement('div');
        die.className = 'die draggable';
        die.draggable = true;
        die.dataset.val = val;
        die.dataset.id = `die-${index}`;
        
        die.innerHTML = createDiceDots(val);
        
        die.addEventListener('dragstart', handleDragStart);
        die.addEventListener('dragend', handleDragEnd);
        
        // KLIKK/TAPP-logikk for terninger
        die.addEventListener('click', function() {
            if (this.parentElement.id === 'expression-builder') {
                elAvailableDice.appendChild(this);
                logDebug(`Terning ${this.dataset.val} returnert via klikk.`, 'info');
            } else if (this.parentElement.id === 'available-dice') {
                elBuildArea.appendChild(this);
                logDebug(`Terning ${this.dataset.val} flyttet til byggeflaten via klikk.`, 'info');
            }
        });

        elAvailableDice.appendChild(die);
    });
}

// === SEKSJON: AVANSERT DRAG & DROP OG KLIKK-LOGIKK ===
let draggedElement = null;
let isCloning = false;

// Klargjør en operatør-klone slik at den oppfører seg riktig i byggeflaten
function setupOperatorClone(clone) {
    clone.classList.remove('is-dragging');
    clone.classList.add('draggable'); 
    clone.draggable = true;
    
    clone.addEventListener('dragstart', handleDragStart);
    clone.addEventListener('dragend', handleDragEnd);
    
    // Tapp/klikk for å fjerne fra byggeflaten
    clone.addEventListener('click', function() {
        this.remove(); 
        logDebug(`Fjernet operator ${this.dataset.val} via klikk.`, 'info');
    });
    return clone;
}

function setupDraggableOperators() {
    const operators = document.querySelectorAll('#available-operators .operator');
    operators.forEach(op => {
        op.addEventListener('dragstart', handleDragStart);
        op.addEventListener('dragend', handleDragEnd);
        
        // Tapp for å legge til direkte
        op.addEventListener('click', () => {
            const clone = op.cloneNode(true);
            setupOperatorClone(clone);
            elBuildArea.appendChild(clone);
            logDebug(`Operator ${clone.dataset.val} lagt til byggeflaten via klikk.`, 'success');
        });
    });
}

function handleDragStart(e) {
    draggedElement = this;
    
    // Dynamisk sjekk: Skal elementet klones (fra verktøykassa) eller bare flyttes?
    isCloning = (this.parentElement.id === 'available-operators');
    
    e.dataTransfer.effectAllowed = isCloning ? 'copy' : 'move';
    this.classList.add('is-dragging');
    logDebug(`Starter dra-operasjon for: ${this.dataset.val} (Klones: ${isCloning})`, 'info');
}

function handleDragEnd(e) {
    if (draggedElement) draggedElement.classList.remove('is-dragging');
    
    if (dragPlaceholder.parentElement) {
        dragPlaceholder.remove();
    }

    // Sletting/kasting hvis sluppet utenfor gyldig sone
    if (e.dataTransfer.dropEffect === 'none') {
        if (!isCloning) {
            if (this.classList.contains('operator') && this.parentElement.id === 'expression-builder') {
                logDebug(`Operator ${this.dataset.val} ble dratt ut av byggeflaten og slettet.`, 'info');
                this.remove();
            } else if (this.classList.contains('die') && this.parentElement.id === 'expression-builder') {
                logDebug(`Terning ${this.dataset.val} dratt ut. Returnerer til start.`, 'info');
                elAvailableDice.appendChild(this);
            }
        }
    }

    document.querySelectorAll('.dropzone').forEach(dz => dz.classList.remove('drag-over'));
    draggedElement = null;
    isCloning = false;
}

function getDragAfterElement(container, x) {
    const draggableElements = [...container.querySelectorAll('.draggable:not(.is-dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = x - box.left - box.width / 2; 
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function setupDropZones() {
    const dropZones = document.querySelectorAll('.dropzone');
    
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault(); 
            e.dataTransfer.dropEffect = isCloning ? 'copy' : 'move';
            zone.classList.add('drag-over');

            if (zone.id === 'expression-builder' && draggedElement) {
                const afterElement = getDragAfterElement(zone, e.clientX);
                
                if (isCloning) {
                    if (afterElement == null) {
                        zone.appendChild(dragPlaceholder);
                    } else {
                        zone.insertBefore(dragPlaceholder, afterElement);
                    }
                } else {
                    // Flytter eksisterende brikker live internt
                    if (afterElement == null) {
                        zone.appendChild(draggedElement);
                    } else {
                        zone.insertBefore(draggedElement, afterElement);
                    }
                }
            }
        });

        zone.addEventListener('dragleave', (e) => {
            zone.classList.remove('drag-over');
            if (zone.id === 'expression-builder' && dragPlaceholder.parentElement) {
                dragPlaceholder.remove();
            }
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            
            if (!draggedElement) return;

            const targetType = zone.dataset.type;
            
            if (isCloning) {
                if (targetType === 'builder') {
                    const clone = draggedElement.cloneNode(true);
                    setupOperatorClone(clone);
                    
                    if (dragPlaceholder.parentElement === zone) {
                        zone.insertBefore(clone, dragPlaceholder);
                        dragPlaceholder.remove();
                    } else {
                        zone.appendChild(clone);
                    }
                    logDebug(`Slapp operator klone i byggeflaten.`, 'success');
                }
            } else {
                if (targetType === 'dice-source' && draggedElement.classList.contains('die')) {
                    zone.appendChild(draggedElement);
                    logDebug(`Returnerte terning til skuffen via drag & drop.`, 'success');
                }
            }
        });
    });
}

// === SEKSJON: BYGGEFLATE & EVALUERING ===
function clearBuildArea() {
    const items = Array.from(elBuildArea.children);
    items.forEach(item => {
        if (item.classList.contains('die')) {
            elAvailableDice.appendChild(item); 
        } else if (item.classList.contains('operator')) {
            item.remove(); 
        }
    });
    if (dragPlaceholder.parentElement) dragPlaceholder.remove();
    logDebug('Tømte byggeflaten.', 'info');
}

function evaluateBuildArea() {
    const items = Array.from(elBuildArea.children);
    if (items.length === 0) {
        logDebug('Byggeflaten er tom.', 'warn');
        return;
    }
    
    const validItems = items.filter(item => !item.classList.contains('drag-placeholder'));
    let expressionStr = validItems.map(item => item.dataset.val).join('');
    
    logDebug(`Forsøker å evaluere bygd uttrykk: ${expressionStr}`, 'info');
    evaluateExpression(expressionStr, 'build');
}

// === SEKSJON: MATEMATIKK & VALIDERING ===

function evaluateExpression(exprStr, source) {
    exprStr = exprStr.replace(/\s+/g, ''); 
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

    // NY KONTROLL: Hindre at siffer settes sammen (f.eks. "5" og "6" blir "56")
    if (/\d{2,}/.test(exprStr)) {
        logDebug('Avbrutt: Spilleren forsøkte å slå sammen siffer til et flersifret tall.', 'warn');
        alert("Du kan ikke sette siffer sammen (f.eks. 5 og 6 for å lage 56). Du må bruke matematiske tegn mellom terningene!");
        return;
    }

    if (!validateDiceUsage(exprStr)) {
        alert("Ugyldig bruk av siffer! Du kan kun bruke de terningene du har, og hver terning maks én gang.");
        return;
    }

    try {
        const result = calculateMath(exprStr);
        logDebug(`Resultat av beregning: ${result}`, 'info');

        if (!isFinite(result) || isNaN(result)) {
            alert(`Ugyldig matematikk. Resultatet ble: ${result}`);
            logDebug('Matte-feil: NaN eller Infinity', 'error');
            return;
        }
        
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
        available.splice(idx, 1); 
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
            elManualInput.value = ''; 
        } else {
            logDebug(`Svaret ble ${result}, men målet er ${targetSequential}.`, 'warn');
            alert(`Du fikk ${result}, men du må finne et uttrykk for ${targetSequential}.`);
        }
    } else {
        if (result > 0) {
            if (!solvedFreestyle.has(result)) {
                solvedFreestyle.add(result);
                logDebug(`Freestyle: La til ${result} i løste tall. Nåværende samling: ${Array.from(solvedFreestyle).sort((a,b)=>a-b).join(',')}`, 'success');
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
    
    // Oppdater det nye iPad-fokuserte skiltet i byggeflaten
    if (elBuildTargetNumber) {
        elBuildTargetNumber.textContent = targetSequential;
    }
    
    if (currentMode === 'sequential') {
        elCurrentTarget.parentElement.style.display = 'block';
        if (elBuildTargetBadge) elBuildTargetBadge.style.display = 'flex';
    } else {
        elCurrentTarget.parentElement.style.display = 'none';
        if (elBuildTargetBadge) elBuildTargetBadge.style.display = 'none';
    }
}

function calculateFreestyleScore() {
    let check = 1;
    while (solvedFreestyle.has(check)) {
        check++;
    }
    currentScore = check - 1; 
    logDebug(`Beregnet ny poengsum (høyeste ubrutte rekke): ${currentScore}. Sjekket opp til ${check}`, 'info');
    updateScoreUI();
}

function addResultToTable(number, expr) {
    const tr = document.createElement('tr');
    tr.className = 'success-row';
    tr.innerHTML = `<td>${number}</td><td>${expr} = ${number}</td>`;
    elResultsTbody.insertBefore(tr, elResultsTbody.firstChild);
}

// === SEKSJON: MATTE PARSER (Shunting Yard) ===

function factorial(n) {
    if (n < 0) return NaN;
    if (n === 0 || n === 1) return 1;
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
}

function calculateMath(expr) {
    logDebug('Starter tokenisering (Lexing)...', 'info');
    let tokens = [];
    let numStr = "";
    
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
                if (char === '-') {
                    const prev = tokens.length > 0 ? tokens[tokens.length - 1] : null;
                    if (!prev || (prev.type === 'operator' && prev.value !== ')') || (prev.type === 'operator' && prev.value === '(')) {
                        tokens.push({ type: 'operator', value: 'u-' }); 
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

    const precedence = {
        '+': 1, '-': 1,
        '*': 2, '/': 2,
        'u-': 3, 
        '^': 4,
        '!': 5
    };

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
                operatorStack.pop(); 
            } else {
                while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].value !== '(') {
                    let topOp = operatorStack[operatorStack.length - 1];
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

/* Version: #15 */
