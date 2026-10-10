/**
 * Deterministic wordplay verification.
 *
 * Before spending an AI call on a clue, we check whether the wordplay
 * *literally* works out. For a cryptic clue this is often decidable: if the
 * clue says the answer is the initial letters of "wears the thumbs", that
 * either spells the answer or it doesn't, and no amount of model judgement
 * changes the arithmetic.
 *
 * Every verifier returns one of three verdicts:
 *
 *   VERIFIED     The letters work out exactly. The judge is told so, which
 *                keeps it from second-guessing correct arithmetic.
 *   REFUTED      The mechanism requires literal fodder and the letters do
 *                NOT work out. Rejected immediately — no AI call.
 *   UNVERIFIABLE The fodder is a synonym, abbreviation or description, so the
 *                letters can't be checked here. Handed to the judge with a
 *                note explaining exactly what to verify.
 *
 * The literal/substitutable split is the important design decision:
 *
 *   Literal-only mechanisms — hidden, initial_letters, final_letters,
 *   alternating_letters — take their fodder straight from the clue surface.
 *   Cryptic convention does not permit synonym substitution there, so a
 *   failure is a genuine refutation and we reject without asking a model.
 *
 *   Substitutable mechanisms — anagram, reversal, container, deletion,
 *   charade, homophone, spoonerism — routinely operate on a synonym of a word
 *   in the clue ("flower" → ROSE → anagram fodder). A failed literal check
 *   there proves nothing, so it becomes UNVERIFIABLE rather than REFUTED.
 */

export const VERIFIED = 'verified';
export const REFUTED = 'refuted';
export const UNVERIFIABLE = 'unverifiable';

/** Mechanisms whose fodder must be taken literally from the clue surface. */
export const LITERAL_FODDER_TYPES = new Set([
  'anagram',
  'hidden',
  'initial_letters',
  'final_letters',
  'alternating_letters',
]);

/** Mechanisms with no decidable letter arithmetic at all. */
export const OPAQUE_TYPES = new Set([
  'homophone',
  'spoonerism',
  'cryptic_definition',
  'andlit',
  'compound',
]);

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Uppercase A–Z only. Drops spaces, punctuation, accents. */
export const letters = s =>
  String(s ?? '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');

/** Uppercase alphabetic words, in order. "wears the thumbs" → [WEARS, THE, THUMBS] */
export const words = s =>
  String(s ?? '')
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter(Boolean);

/** Sorted letter multiset — equal for two strings iff they are anagrams. */
export const sortedLetters = s => letters(s).split('').sort().join('');

const ok = detail => ({ status: VERIFIED, detail });
const no = detail => ({ status: REFUTED, detail });
const meh = detail => ({ status: UNVERIFIABLE, detail });

/**
 * Fodder written as a compound ("wears the thumbs + small", "ROSE and SHIRE")
 * split into its operand parts.
 */
export function splitFodderParts(fodder) {
  return String(fodder ?? '')
    .split(/\s*(?:\+|,|\band\b|\bthen\b|\bplus\b)\s*/i)
    .map(p => p.trim())
    .filter(Boolean);
}

// ─── PER-MECHANISM VERIFIERS ──────────────────────────────────────────────────

/**
 * Letters of the fodder rearranged spell the answer, and the fodder is in the
 * clue as written. British cryptic convention (Times, Guardian, Telegraph)
 * does not allow indirect anagrams, so any mismatch is a wrong clue, not a
 * synonym to give the benefit of the doubt. ("Altering great ruin" for
 * TRIANGLE shipped because this used to be lenient.)
 */
export function verifyAnagram(fodder, answer, clueText = null) {
  const f = letters(fodder);
  const a = letters(answer);
  if (!f) return no('No anagram fodder given.');
  if (clueText !== null && !letters(clueText).includes(f)) {
    return no(`Anagram fodder "${fodder}" does not appear in the clue as written.`);
  }
  if (sortedLetters(f) === sortedLetters(a)) {
    return ok(`"${f}" is an exact anagram of ${a}.`);
  }
  return no(
    `Fodder "${f}" is not an anagram of ${a} (${sortedLetters(f)} vs ${sortedLetters(a)}). ` +
      `Anagram fodder must be the exact letters, taken literally from the clue.`
  );
}

/** The fodder read backwards spells the answer. */
export function verifyReversal(fodder, answer) {
  const f = letters(fodder);
  const a = letters(answer);
  if (!f) return meh('No fodder supplied to check.');
  const reversed = f.split('').reverse().join('');
  if (reversed === a) return ok(`"${f}" reversed is exactly ${a}.`);
  if (f.length === a.length) {
    return meh(
      `Fodder "${f}" reversed gives "${reversed}", not ${a}. Same length, so the fodder is ` +
        `standing in for a synonym.`
    );
  }
  return meh(`Fodder "${f}" reversed gives "${reversed}", not ${a}.`);
}

/**
 * The answer is spelled out consecutively across the clue surface.
 *
 * Literal by definition — no synonym substitution is permitted — so a failure
 * is a refutation. We also require the run to cross at least one word boundary:
 * an answer sitting wholly inside a single clue word is unfair form, because
 * the solver has no gap to spot.
 */
export function verifyHidden(clueText, answer) {
  const a = letters(answer);
  if (!a) return no('No answer supplied to check.');

  // Track which clue word each surface letter came from, so we can tell
  // whether the hidden run spans a boundary.
  const wordList = words(clueText);
  const owners = [];
  wordList.forEach((w, wi) => {
    for (let i = 0; i < w.length; i++) owners.push(wi);
  });
  const flat = wordList.join('');

  const at = flat.indexOf(a);
  if (at === -1) {
    return no(`Hidden answer ${a} does not appear consecutively in the clue text "${flat}".`);
  }
  const firstWord = owners[at];
  const lastWord = owners[at + a.length - 1];
  if (firstWord === lastWord) {
    return no(
      `Hidden answer ${a} sits entirely inside the single word "${wordList[firstWord]}". ` +
        `A hidden word must straddle at least one word boundary to be fair.`
    );
  }
  return ok(
    `${a} is hidden across words ${firstWord + 1}–${lastWord + 1} of the clue ` +
      `("${wordList.slice(firstWord, lastWord + 1).join(' ')}").`
  );
}

/** First letter of each consecutive fodder word spells the answer. */
export function verifyInitialLetters(fodder, answer) {
  const w = words(fodder);
  const a = letters(answer);
  if (w.length === 0) return no('No fodder supplied for an initial-letters clue.');
  const taken = w.map(x => x[0]).join('');
  if (taken === a) return ok(`Initial letters of "${w.join(' ')}" spell ${a}.`);
  return no(
    `Initial letters of "${w.join(' ')}" spell "${taken}", not ${a}. ` +
      `Initial-letters fodder must be literal — synonym substitution is not permitted.`
  );
}

/** Last letter of each consecutive fodder word spells the answer. */
export function verifyFinalLetters(fodder, answer) {
  const w = words(fodder);
  const a = letters(answer);
  if (w.length === 0) return no('No fodder supplied for a final-letters clue.');
  const taken = w.map(x => x[x.length - 1]).join('');
  if (taken === a) return ok(`Final letters of "${w.join(' ')}" spell ${a}.`);
  return no(
    `Final letters of "${w.join(' ')}" spell "${taken}", not ${a}. ` +
      `Final-letters fodder must be literal — synonym substitution is not permitted.`
  );
}

/** Odd- or even-indexed letters of the fodder spell the answer. */
export function verifyAlternatingLetters(fodder, answer) {
  const f = letters(fodder);
  const a = letters(answer);
  if (!f) return no('No fodder supplied for an alternating-letters clue.');
  const odds = f
    .split('')
    .filter((_, i) => i % 2 === 0)
    .join('');
  const evens = f
    .split('')
    .filter((_, i) => i % 2 === 1)
    .join('');
  if (odds === a) return ok(`Odd-position letters of "${f}" spell ${a}.`);
  if (evens === a) return ok(`Even-position letters of "${f}" spell ${a}.`);
  return no(
    `Alternating letters of "${f}" give "${odds}" (odds) or "${evens}" (evens), neither of ` +
      `which is ${a}. Alternating fodder must be literal.`
  );
}

/** Fodder parts concatenated in order spell the answer. */
export function verifyCharade(fodder, answer) {
  const parts = splitFodderParts(fodder);
  const a = letters(answer);
  if (parts.length === 0) return meh('No fodder parts supplied to check.');
  const joined = parts.map(letters).join('');
  if (joined === a) return ok(`"${parts.join('" + "')}" concatenates to exactly ${a}.`);
  return meh(
    `Fodder parts "${parts.join('" + "')}" concatenate to "${joined}", not ${a}. ` +
      `Charade parts are usually cryptic abbreviations or synonyms (DR = doctor, O = love), ` +
      `so verify each part resolves to the letters it contributes.`
  );
}

/**
 * One fodder part inserted inside another spells the answer.
 * Tries both orderings and every insertion point.
 */
export function verifyContainer(fodder, answer) {
  const parts = splitFodderParts(fodder).map(letters).filter(Boolean);
  const a = letters(answer);
  if (parts.length < 2) {
    return meh(
      `Container clues need two operands (outer and inner); fodder "${fodder}" did not ` +
        `parse into two parts. Verify one part is inserted inside the other to give ${a}.`
    );
  }
  const [p, q] = parts;
  for (const [outer, inner] of [
    [p, q],
    [q, p],
  ]) {
    for (let i = 1; i < outer.length; i++) {
      if (outer.slice(0, i) + inner + outer.slice(i) === a) {
        return ok(`"${inner}" inserted into "${outer}" after ${i} letter(s) gives exactly ${a}.`);
      }
    }
  }
  return meh(
    `Neither "${p}" inside "${q}" nor "${q}" inside "${p}" produces ${a} directly, so at ` +
      `least one operand must be a synonym. Verify the substitution.`
  );
}

/**
 * Removing letters from the fodder leaves the answer.
 * Covers beheading, curtailing, heart-removal and any contiguous excision.
 */
export function verifyDeletion(fodder, answer) {
  const f = letters(fodder);
  const a = letters(answer);
  if (!f) return meh('No fodder supplied to check.');
  if (f.length <= a.length) {
    return meh(
      `Fodder "${f}" (${f.length}) is not longer than ${a} (${a.length}), so the deletion ` +
        `must operate on a synonym rather than on the fodder as written.`
    );
  }
  // Any single contiguous run removed from the fodder.
  for (let start = 0; start < f.length; start++) {
    for (let end = start + 1; end <= f.length; end++) {
      if (f.slice(0, start) + f.slice(end) === a) {
        const removed = f.slice(start, end);
        const where =
          start === 0 ? 'beheading' : end === f.length ? 'curtailing' : 'removing the heart';
        return ok(`Removing "${removed}" from "${f}" (${where}) leaves exactly ${a}.`);
      }
    }
  }
  return meh(
    `No single contiguous deletion from "${f}" yields ${a}, so the fodder is standing in ` +
      `for a synonym. Verify the substitution.`
  );
}

/**
 * Two independent definitions, one at each end of the clue.
 * The second definition is carried in the `indicator` field by convention.
 */
export function verifyDoubleDefinition(clueText, definition, second) {
  const d1 = letters(definition);
  const d2 = letters(second);
  if (!d1 || !d2) {
    return no('A double definition needs two non-empty definitions (the second in `indicator`).');
  }
  if (d1 === d2) return no('Both halves of the double definition are the same text.');

  const clue = letters(clueText);
  if (!clue.startsWith(d1) && !clue.endsWith(d1)) {
    return no(`First definition "${definition}" is not at either end of the clue.`);
  }
  if (!clue.startsWith(d2) && !clue.endsWith(d2)) {
    return no(`Second definition "${second}" is not at either end of the clue.`);
  }
  if ((clue.startsWith(d1) && clue.startsWith(d2)) || (clue.endsWith(d1) && clue.endsWith(d2))) {
    return no('Both definitions occupy the same end of the clue — they must sit at opposite ends.');
  }
  return ok(`"${definition}" and "${second}" sit at opposite ends of the clue.`);
}

// ─── DISPATCH ─────────────────────────────────────────────────────────────────

/**
 * Verify the wordplay for a clue against its declared mechanism.
 *
 * @param {string} type   - wordplay mechanism id
 * @param {{ clue: string, definition: string, indicator: string, fodder: string }} clue
 * @param {string} answer
 * @returns {{ status: 'verified'|'refuted'|'unverifiable', detail: string }}
 */
export function verifyMechanism(type, clue, answer) {
  switch (type) {
    case 'anagram':
      return verifyAnagram(clue.fodder, answer, clue.clue);
    case 'reversal':
      return verifyReversal(clue.fodder, answer);
    case 'hidden':
      return verifyHidden(clue.clue, answer);
    case 'initial_letters':
      return verifyInitialLetters(clue.fodder, answer);
    case 'final_letters':
      return verifyFinalLetters(clue.fodder, answer);
    case 'alternating_letters':
      return verifyAlternatingLetters(clue.fodder, answer);
    case 'charade':
      return verifyCharade(clue.fodder, answer);
    case 'container':
      return verifyContainer(clue.fodder, answer);
    case 'deletion':
      return verifyDeletion(clue.fodder, answer);
    case 'double_definition':
      return verifyDoubleDefinition(clue.clue, clue.definition, clue.indicator);
    default:
      // homophone, spoonerism, cryptic_definition, andlit, compound — the
      // arithmetic depends on pronunciation or on combining several
      // mechanisms, neither of which is decidable here.
      return meh(
        `"${type}" wordplay cannot be verified mechanically — assess the wordplay yourself ` +
          `and set wordplay_correct accordingly.`
      );
  }
}
