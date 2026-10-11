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

/**
 * Words with more than one accepted spelling, all mapped to one form on both
 * sides, so "St Petersburg", "St. Petersburg" and "Saint Petersburg" match.
 */
const SAME_WORD: Record<string, string> = {
  saint: 'st',
  sankt: 'st',
  mount: 'mt',
  fort: 'ft',
  doctor: 'dr',
  mister: 'mr',
  centre: 'center',
  theatre: 'theater',
  colour: 'color',
  grey: 'gray',
};

/**
 * Words that describe what an answer is rather than which one it is. The
 * name alone is enough: "Ajanta" for Ajanta Caves, "Everest" for Mount
 * Everest, "Infosys" for Infosys Limited.
 */
const DESCRIPTORS = new Set([
  'caves',
  'cave',
  'temple',
  'temples',
  'palace',
  'ft',
  'festival',
  'falls',
  'national',
  'park',
  'river',
  'lake',
  'island',
  'islands',
  'mountains',
  'mt',
  'dynasty',
  'empire',
  'company',
  'corporation',
  'limited',
  'ltd',
  'inc',
  'group',
  'film',
  'band',
  'tower',
  'stadium',
  'monument',
  'museum',
]);

/** A name too ordinary to stand alone ("Golden" for the Golden Temple). */
const TOO_PLAIN = new Set([
  'golden',
  'great',
  'grand',
  'red',
  'white',
  'black',
  'blue',
  'green',
  'new',
  'old',
  'royal',
  'sacred',
  'holy',
  'big',
  'little',
  'high',
  'north',
  'south',
  'east',
  'west',
]);

const canonical = (s: string) =>
  normalizeGuess(s)
    .split(' ')
    .map(w => SAME_WORD[w] ?? w)
    .join(' ');

/**
 * Every way of writing an answer that should count: as written, without its
 * descriptor words, and either of those with the spaces run together
 * ("Kho Kho" / "Khokho").
 */
export function answerForms(answer: string): string[] {
  const full = canonical(answer);
  const words = full.split(' ').filter(Boolean);
  const core = words.filter(w => !DESCRIPTORS.has(w)).join(' ');
  const forms = [full];
  if (core && core !== full && core.replace(/ /g, '').length >= 4 && !TOO_PLAIN.has(core)) {
    forms.push(core);
  }
  return [...new Set(forms.flatMap(f => [f, f.replace(/ /g, '')]))].filter(Boolean);
}

export function isCorrectGuess(guess: string, accepted: readonly string[]): boolean {
  const g = canonical(guess);
  if (!g) return false;
  const guesses = [g, g.replace(/ /g, '')];
  return accepted.some(answer =>
    answerForms(answer).some(a =>
      guesses.some(x => x === a || typoDistance(x, a) <= tolerance(a.length))
    )
  );
}
