/** Substitution cipher helpers, mirroring src/app/games/cryptogram/logic.ts. */

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** A random alphabet in which no letter stands for itself. */
export function makeKey(rng) {
  for (let t = 0; t < 1000; t++) {
    const key = rng.shuffle([...ALPHABET]);
    if (key.every((c, i) => c !== ALPHABET[i])) return key.join('');
  }
  throw new Error('could not build a derangement key');
}

export function isValidKey(key) {
  return (
    typeof key === 'string' &&
    key.length === 26 &&
    new Set(key).size === 26 &&
    [...key].every((c, i) => c >= 'A' && c <= 'Z' && c !== ALPHABET[i])
  );
}

export function letterCounts(text) {
  const counts = new Map();
  for (const ch of text) if (ch >= 'A' && ch <= 'Z') counts.set(ch, (counts.get(ch) ?? 0) + 1);
  return counts;
}

/**
 * Two starting letters for a medium puzzle: mid-frequency ones. Giving away
 * the commonest letter (usually E) would make it easy; a letter that appears
 * once barely helps.
 */
export function pickGivens(text, rng, count = 4) {
  const ranked = [...letterCounts(text)].sort((a, b) => b[1] - a[1]);
  const middle = ranked
    .slice(2)
    .filter(([, n]) => n >= 2 && n <= 4)
    .map(([c]) => c);
  const pool = middle.length >= count ? middle : ranked.slice(2).map(([c]) => c);
  return rng.shuffle(pool).slice(0, count);
}
