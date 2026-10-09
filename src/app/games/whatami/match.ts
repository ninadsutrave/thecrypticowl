/**
 * Free-text answer matching for guessing games.
 *
 * Forgiving where a human marker would be: case, accents, punctuation, a
 * leading "the", and a dropped, doubled or swapped letter on longer answers.
 *
 * Deliberately *not* forgiving a wrong letter. Substituting one letter is how
 * one real answer becomes another (Iceland → Ireland, Iraq → Iran), so a
 * substitution counts as two edits and never fits inside the typo allowance.
 */

export function normalizeGuess(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/^\s*the\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Edit distance where inserting, deleting or swapping two adjacent letters
 * costs 1, and replacing a letter costs 2.
 */
export function typoDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const same = a[i - 1] === b[j - 1];
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (same ? 0 : 2));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/** Typos allowed for an answer of this length. */
function tolerance(length: number): number {
  if (length < 5) return 0;
  if (length < 10) return 1;
  return 2;
}

export function isCorrectGuess(guess: string, accepted: readonly string[]): boolean {
  const g = normalizeGuess(guess);
  if (!g) return false;
  return accepted.some(answer => {
    const a = normalizeGuess(answer);
    return g === a || typoDistance(g, a) <= tolerance(a.length);
  });
}
