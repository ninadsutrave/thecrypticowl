/**
 * Substitution-cipher helpers. A "guess map" goes from cipher letter to the
 * plain letter the solver thinks it hides.
 */

export type GuessMap = Record<string, string>;

const A = 'A'.charCodeAt(0);
const isLetter = (ch: string) => ch >= 'A' && ch <= 'Z';

export function encode(text: string, key: string): string {
  return [...text].map(ch => (isLetter(ch) ? key[ch.charCodeAt(0) - A] : ch)).join('');
}

/** Cipher letter → true plain letter, for every letter in the text. */
export function solutionMap(text: string, key: string): GuessMap {
  const map: GuessMap = {};
  for (const ch of text) if (isLetter(ch)) map[key[ch.charCodeAt(0) - A]] = ch;
  return map;
}

/** A valid key is a permutation of A–Z with no letter standing for itself. */
export function isValidKey(key: string): boolean {
  if (key.length !== 26 || new Set(key).size !== 26) return false;
  return [...key].every((c, i) => isLetter(c) && c.charCodeAt(0) - A !== i);
}

/**
 * Set `cipher` to stand for `plain` ('' clears it). A plain letter can only
 * be used once, so it is taken off whichever cipher letter had it before.
 */
export function assign(guesses: GuessMap, cipher: string, plain: string): GuessMap {
  const next: GuessMap = {};
  for (const [c, p] of Object.entries(guesses)) {
    if (c !== cipher && p !== plain) next[c] = p;
  }
  if (plain) next[cipher] = plain;
  return next;
}

export function isSolved(guesses: GuessMap, solution: GuessMap): boolean {
  return Object.entries(solution).every(([c, p]) => guesses[c] === p);
}

/**
 * The cipher letter a hint should reveal: the selected one if it is still
 * wrong, otherwise the most frequent letter not yet right.
 */
export function pickHint(
  guesses: GuessMap,
  solution: GuessMap,
  cipherText: string,
  selected: string | null
): string | null {
  if (selected && solution[selected] && guesses[selected] !== solution[selected]) return selected;
  const counts = new Map<string, number>();
  for (const ch of cipherText) {
    if (solution[ch] && guesses[ch] !== solution[ch]) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  }
  let best: string | null = null;
  for (const [c, n] of counts) if (!best || n > counts.get(best)!) best = c;
  return best;
}
