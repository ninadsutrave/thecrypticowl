import { isGrounded, normaliseText } from '../../shared/sources/wikipedia.js';

/** Words too common to count as giving the answer away. */
const COMMON = new Set(
  'the and of for new great old big little mount saint city state united republic kingdom tower bridge house river island lake day night festival film show band company statue'.split(
    ' '
  )
);

const MIN_WORDS = 6;
const MAX_WORDS = 32;

/** Distinctive words of the answer and aliases, e.g. "eiffel" for Eiffel Tower. */
export function leakTerms(accepted) {
  const terms = new Set();
  for (const name of accepted) {
    const n = normaliseText(name);
    if (n.length >= 3) terms.add(n);
    for (const w of n.split(' ')) if (w.length >= 5 && !COMMON.has(w)) terms.add(w);
  }
  return [...terms];
}

/**
 * Whether the clue uses the term as a word — or, for longer terms, as the
 * start of one: "Icelandic" gives away Iceland as surely as "Iceland" does.
 */
function containsTerm(text, term) {
  const t = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const end = term.length >= 5 ? '' : '($| )';
  return new RegExp(`(^| )${t}${end}`).test(` ${normaliseText(text)} `);
}

/**
 * Free, deterministic checks before any judge call: shape, length, no
 * answer leak, and every clue backed by a sentence really in the source.
 */
export function reviewWhatAmI(candidate) {
  const { payload, evidence = [], sourceText = '' } = candidate;
  const errors = [];
  const clues = payload?.clues ?? [];

  if (clues.length !== 5) errors.push(`expected 5 clues, got ${clues.length}`);
  if (!payload?.accepted?.length) errors.push('no accepted answer names');
  if (new Set(clues.map(normaliseText)).size !== clues.length) errors.push('duplicate clues');

  const terms = leakTerms(payload?.accepted ?? []);
  clues.forEach((clue, i) => {
    const words = clue.split(/\s+/).filter(Boolean).length;
    if (words < MIN_WORDS || words > MAX_WORDS) {
      errors.push(`clue ${i + 1} has ${words} words (want ${MIN_WORDS}–${MAX_WORDS})`);
    }
    const leaked = terms.find(t => containsTerm(clue, t));
    if (leaked) errors.push(`clue ${i + 1} gives away the answer ("${leaked}")`);
    if (!isGrounded(evidence[i] ?? '', sourceText)) {
      errors.push(`clue ${i + 1}'s evidence is not a sentence from the source`);
    }
  });

  return {
    ok: errors.length === 0,
    errors,
    checks: { clues: clues.length, leakTerms: terms.length },
  };
}
