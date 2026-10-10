import { isValidKey, letterCounts } from './cipher.js';

/** Bounds for a medium cryptogram. Too short decodes more than one way. */
export const LETTERS = [24, 110];
export const MIN_DISTINCT = 11;

/** Can this quote make a fair medium puzzle at all? Used to filter the pool. */
export function isSuitable(text) {
  const upper = String(text).toUpperCase();
  const counts = letterCounts(upper);
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  return total >= LETTERS[0] && total <= LETTERS[1] && counts.size >= MIN_DISTINCT;
}

export function reviewCryptogram(candidate) {
  const p = candidate.payload ?? {};
  const errors = [];
  const text = String(p.text ?? '');
  if (text !== text.toUpperCase()) errors.push('text must be upper case');
  if (/[^A-Z0-9 .,;:'’!?\-—"“”]/.test(text))
    errors.push('text has characters the board cannot show');
  if (!isSuitable(text))
    errors.push(`needs ${LETTERS.join('–')} letters and ≥${MIN_DISTINCT} distinct`);
  if (!isValidKey(p.key)) errors.push('key is not a derangement of A–Z');
  const counts = letterCounts(text);
  const top = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
  for (const g of p.given ?? []) {
    if (!counts.has(g)) errors.push(`given letter ${g} is not in the text`);
    if (g === top) errors.push('the commonest letter must not be given');
  }
  if ((p.given ?? []).length !== 4) errors.push('gives exactly four letters');
  if (!p.author || !p.source?.url) errors.push('missing attribution');
  return {
    ok: errors.length === 0,
    errors,
    checks: { letters: [...counts.values()].reduce((a, b) => a + b, 0), distinct: counts.size },
  };
}
