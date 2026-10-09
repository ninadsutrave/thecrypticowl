import { cleanDescription, fairPair, ROUNDS } from './generator.js';
import { THEMES } from './themes.js';

/**
 * Deterministic review: the right number of distinct, named items with real
 * values; every step a fair pair (no ties, nothing absurdly far apart); and
 * a mix of both answers.
 */
export function reviewHigherLower(p) {
  const errors = [];
  const theme = THEMES.find(t => t.id === p?.theme);
  if (!theme) return { ok: false, errors: [`unknown theme ${p?.theme}`] };
  const items = p.items ?? [];
  if (items.length !== ROUNDS + 1) errors.push(`${items.length} items (want ${ROUNDS + 1})`);
  if (new Set(items.map(x => x.id)).size !== items.length) errors.push('an item repeats');
  if (new Set(items.map(x => x.name)).size !== items.length) errors.push('two items share a name');
  items.forEach((x, i) => {
    if (!x.name || /^Q\d+$/.test(x.name)) errors.push(`item ${i} has no name`);
    if (!Number.isFinite(x.value) || x.value <= 0) errors.push(`item ${i} has no value`);
    if (x.description && cleanDescription(x.description) !== x.description) {
      errors.push(`item ${i}'s description gives the answer away`);
    }
    if (!/^https:\/\/www\.wikidata\.org\/wiki\/Q\d+$/.test(x.url ?? ''))
      errors.push(`item ${i} has no source`);
  });
  let ups = 0;
  for (let i = 1; i < items.length; i++) {
    if (items[i].value === items[i - 1].value) errors.push(`round ${i} is a tie`);
    else if (!fairPair(theme, items[i - 1], items[i])) errors.push(`round ${i} is not a fair pair`);
    if (items[i].value > items[i - 1].value) ups++;
  }
  if (ups < 3 || ups > ROUNDS - 3) errors.push(`${ups} of ${ROUNDS} answers go up: too lopsided`);
  return { ok: errors.length === 0, errors, checks: { items: items.length, ups } };
}
