// A bounded expression parser. Never executes user input as JavaScript.
export class MathError extends Error {}
export function normalizeExpression(text) {
  return String(text).replace(/\s+/g, '').replace(/[×·]/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-');
}
export function formatExpression(text) { return text.replace(/\*/g, ' × ').replace(/\//g, ' ÷ ').replace(/-/g, ' − ').replace(/\+/g, ' + '); }
export function factorial(n) {
  if (!Number.isInteger(n) || n < 0) throw new MathError('Fakultet trenger et heltall som er 0 eller større.');
  if (n > 18) throw new MathError('Fakultet er begrenset til 18! for å holde beregningen trygg og nøyaktig.');
  let value = 1; for (let i = 2; i <= n; i++) value *= i; return value;
}
function bounded(value) {
  if (!Number.isFinite(value)) throw new MathError('Dette uttrykket gir ikke et endelig, reelt tall.');
  if (Math.abs(value) > Number.MAX_SAFE_INTEGER) throw new MathError('Tallet blir for stort til å regnes nøyaktig her. Prøv mindre deluttrykk.');
  return value;
}
// Carry exact fractions alongside the displayed number. Tiny fractional remainders
// must not be mistaken for whole-number solutions due to floating-point rounding.
function fraction(value, n = null, d = 1n) {
  bounded(value);
  if (n !== null) {
    if (d < 0n) { n = -n; d = -d; }
    let a = n < 0n ? -n : n, b = d;
    while (b) { const r = a % b; a = b; b = r; }
    if (a) { n /= a; d /= a; }
    if (n.toString(2).length > 2048 || d.toString(2).length > 2048) throw new MathError('Denne beregningen blir for stor. Prøv et enklere uttrykk.');
  }
  return {value, n, d};
}
function combine(a, b, op) {
  if (op === '/' && (b.n === 0n || b.value === 0)) throw new MathError('Du kan ikke dele på 0. Prøv å endre det du deler på.');
  const value = op === '+' ? a.value + b.value : op === '-' ? a.value - b.value : op === '*' ? a.value * b.value : a.value / b.value;
  if (a.n === null || b.n === null) return fraction(value);
  if (op === '+') return fraction(value, a.n*b.d+b.n*a.d, a.d*b.d);
  if (op === '-') return fraction(value, a.n*b.d-b.n*a.d, a.d*b.d);
  if (op === '*') return fraction(value, a.n*b.n, a.d*b.d);
  return fraction(value, a.n*b.d, a.d*b.n);
}
export function calculateMath(input) { return evaluateMath(input).value; }
function evaluateMath(input) {
  const expression = normalizeExpression(input);
  if (!expression) throw new MathError('Legg til en terning eller skriv et uttrykk først.');
  if (expression.length > 150) throw new MathError('Uttrykket er for langt. Prøv å forenkle det.');
  if (/[^0-9+*/^!()\-]/.test(expression)) throw new MathError('Bruk bare siffer og regnetegnene +, −, ×, ÷, ( ), ^ og !.');
  if (/\d{2}/.test(expression)) throw new MathError('Ha et regnetegn mellom terningene. Du kan ikke sette to siffer sammen til ett tall.');
  let cursor = 0;
  const peek = () => expression[cursor];
  function primary() {
    if (/^[0-9]$/.test(peek() || '')) { const n = Number(expression[cursor++]); return fraction(n, BigInt(n)); }
    if (peek() === '(') {
      cursor++; const result = sum();
      if (peek() !== ')') throw new MathError('En parentes mangler. Hver ( trenger en ).');
      cursor++; return result;
    }
    if (peek() === '!') throw new MathError('Fakultetstegnet skal stå etter tallet, for eksempel 3!.');
    throw new MathError('Her mangler det et tall. Se etter to regnetegn etter hverandre eller en tom parentes.');
  }
  function postfix() { let value = primary(); while (peek() === '!') { cursor++; if (value.n !== null && value.d !== 1n) throw new MathError('Fakultet trenger et heltall.'); const n = factorial(value.value); value = fraction(n, BigInt(n)); } return value; }
  function power() {
    let value = postfix();
    if (peek() === '^') { cursor++; const exponent = unary(); const result = bounded(Math.pow(value.value, exponent.value));
      if (result === 0 && value.value !== 0) throw new MathError('Denne potensen blir for liten til å regnes nøyaktig her.');
      if (value.n !== null && exponent.n !== null && exponent.d === 1n && Math.abs(exponent.value) <= 1000) {
        const e = BigInt(Math.abs(exponent.value));
        value = exponent.value < 0 ? fraction(result, value.d ** e, value.n ** e) : fraction(result, value.n ** e, value.d ** e);
      } else { value = fraction(result); }
    }
    return value;
  }
  function unary() { if (peek() === '-') { cursor++; const v = unary(); return fraction(-v.value, v.n === null ? null : -v.n, v.d); } return power(); }
  function product() {
    let value = unary();
    while (peek() === '*' || peek() === '/') { const op = expression[cursor++]; const right = unary();
      value = combine(value, right, op);
    } return value;
  }
  function sum() { let value = product(); while (peek() === '+' || peek() === '-') { const op = expression[cursor++]; const right = product(); value = combine(value, right, op); } return value; }
  const value = sum();
  if (cursor !== expression.length) throw new MathError(peek() === ')' ? 'Du har en sluttparentes uten en startparentes.' : 'Her mangler det et regnetegn mellom to deler av uttrykket.');
  return value;
}
export function validateDiceUsage(input, dice) {
  const available = [...dice];
  for (const digit of normalizeExpression(input).match(/\d/g) || []) {
    const index = available.indexOf(Number(digit));
    if (index < 0) throw new MathError(`Du har ikke en ledig ${digit}-terning. Hver av de fem terningene kan brukes én gang i uttrykket.`);
    available.splice(index, 1);
  }
}
export function evaluateForRound(input, dice, level = 'advanced') {
  const expression = normalizeExpression(input);
  if (dice.length !== 5) throw new MathError('Start en runde først. Da får du fem terninger å bygge med.');
  if (level === 'basic' && /[!^]/.test(expression)) throw new MathError('Velg «Alle tegn» for å bruke potenser og fakultet.');
  validateDiceUsage(expression, dice);
  const computed = evaluateMath(expression);
  const value = computed.value;
  const nearest = Math.round(value);
  if (computed.n !== null && computed.d !== 1n && Math.abs(value-nearest) <= 1e-9) throw new MathError('Svaret ligger svært nær et heltall, men er fortsatt en brøk. Prøv å få brøken til å gå helt opp.');
  if ((computed.n !== null && computed.d !== 1n) || (computed.n === null && Math.abs(value - nearest) > 1e-9)) throw new MathError(`Uttrykket blir ${new Intl.NumberFormat('nb-NO', {maximumSignificantDigits:10}).format(value)}. Mellomregninger kan være brøker, men svaret må være et heltall.`);
  if (nearest < 1) throw new MathError(`Uttrykket blir ${nearest}. Bygg et heltall som er 1 eller større.`);
  return nearest;
}
export function parseManualDice(input) {
  const parts = input.split(',').map(s => s.trim());
  if (parts.length !== 5 || parts.some(s => !/^\d$/.test(s))) throw new MathError('Skriv nøyaktig fem enkeltsiffer fra 0 til 9, adskilt med komma. For eksempel 1, 3, 4, 5, 5.');
  return parts.map(Number);
}
export function scoreFor(solutions) { let score = 0; while (Object.hasOwn(solutions, score + 1)) score++; return score; }
export function newRound(dice, mode = 'sequential', level = 'basic') {
  if (dice.length !== 5 || dice.some(n => !Number.isInteger(n) || n < 0 || n > 9)) throw new MathError('Runden må ha fem gyldige siffer.');
  return { version:2, dice:[...dice], mode, level, solutions:{}, tokens:[], manual:'', entry:'build', muted:false };
}
export function recordSolution(state, expression) {
  const result = evaluateForRound(expression, state.dice, state.level);
  const target = scoreFor(state.solutions) + 1;
  if (state.mode === 'sequential' && result !== target) throw new MathError(`Du fikk ${result}. Målet er ${target}. Behold ideen og prøv å justere uttrykket.`);
  if (Object.hasOwn(state.solutions, result)) throw new MathError(`Du har allerede laget ${result}. Prøv et tall du ikke har funnet ennå.`);
  return { ...state, solutions:{...state.solutions, [result]:normalizeExpression(expression)}, tokens:[], manual:'' };
}
