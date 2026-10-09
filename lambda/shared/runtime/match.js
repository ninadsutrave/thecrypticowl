/**
 * Answer matching, mirroring src/app/games/whatami/match.ts so the
 * generator's blind-solve judge accepts exactly what a player's guess would.
 * (The Lambda and the SPA deliberately share no modules; keep these in step.)
 */

export function normalizeGuess(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/^\s*the\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Insert, delete or swap adjacent letters cost 1; replacing a letter costs 2. */
export function typoDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const same = a[i - 1] === b[j - 1];
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (same ? 0 : 2));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

const tolerance = len => (len < 5 ? 0 : len < 10 ? 1 : 2);

export function isCorrectGuess(guess, accepted) {
  const g = normalizeGuess(guess);
  if (!g) return false;
  return accepted.some(answer => {
    const a = normalizeGuess(answer);
    return g === a || typoDistance(g, a) <= tolerance(a.length);
  });
}
