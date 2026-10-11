import { normaliseText } from '../sources/wikipedia.js';

/**
 * Does a piece of puzzle text give its own answer away? Shared by the games
 * whose answer is a hidden name (What Am I, Trivia).
 */

/** Words too common to count as giving the answer away. */
const COMMON = new Set(
  'the and of for new great old big little mount saint city state united republic kingdom tower bridge house river island lake day night festival film show band company statue sauce engine trophy machine series brand product language programming system systems mission hotel palace temple temples fort railway railways airport station college university school academy institute museum library garden gardens stadium building society party movement award prize league church mosque cathedral monument foundation project programme network express airlines agency market square street road gate theatre cinema studios records valley desert forest falls beach empire dynasty national international world'.split(
    ' '
  )
);

/**
 * The answer and its aliases as whole names, plus the distinctive words of
 * the answer itself, e.g. "eiffel" for Eiffel Tower. Single words of an
 * alias don't count: "quickly" doesn't give away QR code just because one
 * alias is "Quick Response code". (`accepted[0]` is always the answer.)
 */
export function leakTerms(accepted) {
  const terms = new Set();
  accepted.forEach((name, i) => {
    const n = normaliseText(name);
    if (n.length >= 3) terms.add(n);
    if (i > 0) return;
    for (const w of n.split(' ')) if (w.length >= 5 && !COMMON.has(w)) terms.add(w);
  });
  return [...terms];
}

/**
 * Whether the text uses the term as a word — or, for longer terms, as the
 * start of one: "Icelandic" gives away Iceland as surely as "Iceland" does.
 */
export function containsTerm(text, term) {
  const t = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const end = term.length >= 5 ? '' : '($| )';
  return new RegExp(`(^| )${t}${end}`).test(` ${normaliseText(text)} `);
}

/** The first distinctive term of the answer found in `text`, if any. */
export function findLeak(text, accepted) {
  return leakTerms(accepted).find(t => containsTerm(text, t)) ?? null;
}
