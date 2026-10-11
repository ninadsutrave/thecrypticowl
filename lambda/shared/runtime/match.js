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

/** Words with more than one accepted spelling ("Saint" / "St"). */
const SAME_WORD = {
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

/** Words that say what an answer is, not which one ("Ajanta" for Ajanta Caves). */
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

const canonical = s =>
  normalizeGuess(s)
    .split(' ')
    .map(w => SAME_WORD[w] ?? w)
    .join(' ');

/** Every way of writing an answer that should count. */
export function answerForms(answer) {
  const full = canonical(answer);
  const words = full.split(' ').filter(Boolean);
  const core = words.filter(w => !DESCRIPTORS.has(w)).join(' ');
  const forms = [full];
  if (core && core !== full && core.replace(/ /g, '').length >= 4 && !TOO_PLAIN.has(core)) {
    forms.push(core);
  }
  return [...new Set(forms.flatMap(f => [f, f.replace(/ /g, '')]))].filter(Boolean);
}

export function isCorrectGuess(guess, accepted) {
  const g = canonical(guess);
  if (!g) return false;
  const guesses = [g, g.replace(/ /g, '')];
  return accepted.some(answer =>
    answerForms(answer).some(a =>
      guesses.some(x => x === a || typoDistance(x, a) <= tolerance(a.length))
    )
  );
}
