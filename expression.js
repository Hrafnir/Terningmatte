import {normalizeExpression} from './math.js';

// The text field and draggable tokens are two views of the same expression.
export function tokensForExpression(text, dice) {
  const used = new Set();
  return [...normalizeExpression(text)].map(value => {
    if (!/^\d$/.test(value)) return {value};
    const die = dice.findIndex((number,index) => String(number) === value && !used.has(index));
    if (die < 0) return {value,unavailable:true};
    used.add(die);
    return {value,die};
  });
}

export function expressionForTokens(tokens) {
  return tokens.map(token => token.value).join('');
}

export function restoredExpression(saved) {
  const text = typeof saved.manual === 'string' ? saved.manual.slice(0,150) : '';
  const built = Array.isArray(saved.tokens) ? saved.tokens.slice(0,100).map(token => typeof token?.value === 'string' ? token.value : '').join('') : '';
  return saved.entry === 'build' ? built || text : text || built;
}
