import {
  buildJudgePrompt,
  buildLookupPrompt,
  buildSolvePrompt,
  JUDGE_RESPONSE_SCHEMA,
  JUDGE_SYSTEM,
  LOOKUP_SCHEMA,
  LOOKUP_SYSTEM,
  SOLVE_SCHEMA,
  SOLVE_SYSTEM,
  VERIFIABLE_TYPES,
} from '../constants/prompts.js';
import {
  isChestnut,
  letters,
  needsLookup,
  pieceGives,
  PIECE_TYPES,
  REFUTED,
  VERIFIED,
  verifyMechanism,
} from './mechanics.js';

/**
 * Quality threshold for shipping a clue. The judge must return score ≥ this AND
 * both valid === true AND wordplay_correct === true.
 */
export const MIN_QUALITY_SCORE = 7;

/** Longest plausible single-line cryptic clue, in characters. */
const MAX_CLUE_LENGTH = 140;

/** Above this, clue_parts has clearly lost structural coherence. */
const MAX_CLUE_PARTS = 30;

/**
 * Patterns for model self-correction and narration leaking into the clue text.
 *
 * Deliberately narrow. Anchored where the phrase is only a problem as an
 * opener, and context-bound elsewhere: bare "wait", "actually" and "here's"
 * appear naturally in cryptic surfaces and are not banned.
 */
const META_PHRASES = [
  /^```/,
  /^json\b/i,
  /^here('?s| is)\b/i,
  /^note\s*:/i,
  /\bas an ai\b/i,
  /\bsorry\b/i,
  /\bon second thought\b/i,
  /\blet me (try|reconsider|rephrase|rewrite|correct)\b/i,
  /\bi (apologi[sz]e|realize|realise)\b/i,
  /\b(revised|corrected|updated|alternative|alternate|new) (clue|version|attempt)\b/i,
  /\bwait,?\s+(let me|actually|no)\b/i,
];

const isMeaningfulString = v => typeof v === 'string' && v.trim().length > 0;

/**
 * @param {string} feedback
 * @param {'structural'|'mechanical'|'judge'|'unavailable'} stage
 *   Which gate rejected the clue. The pipeline reports these counts in its
 *   failure alert, so a run that dies is diagnosable from the alert alone:
 *   many `mechanical` rejections point at the generator prompt, many `judge`
 *   ones at the quality bar or the model.
 */
const reject = (feedback, stage, rejectLexical = false) => ({
  valid: false,
  score: 0,
  feedback,
  stage,
  rejectLexical,
});

/**
 * Stage 1 — structural checks. Pure, synchronous, no AI call.
 *
 * Exported so the test suite can exercise it directly, and so the pipeline
 * could pre-screen candidates without a judge if that ever becomes useful.
 *
 * @returns {string[]} human-readable failures; empty means the clue passed.
 */
export function structuralErrors(clue, lexical) {
  const errors = [];
  const type = lexical.type;
  const answer = String(lexical.answer ?? '').toUpperCase();

  // ── Shape ──────────────────────────────────────────────────────────────────
  // JSON schema mode guarantees the object shape but says nothing about the
  // string contents: empty strings and whitespace-only values pass it.
  if (!isMeaningfulString(clue.clue) || !isMeaningfulString(clue.definition)) {
    return ['Missing or empty core fields (clue or definition).'];
  }
  if (!Array.isArray(clue.clue_parts) || clue.clue_parts.length === 0) {
    return ['Missing clue_parts breakdown.'];
  }
  // A structural segment (type null/absent) is pure connective tissue and is
  // very often just a space — the canonical hidden-word example in the
  // generator prompt contains `{ "text": " ", "type": null }`. Only *typed*
  // segments must carry real content. Requiring meaningful text on every
  // segment rejected clues that were correctly formed.
  const badPart = clue.clue_parts.find(p => {
    if (!p || typeof p.text !== 'string' || p.text.length === 0) return true;
    return Boolean(p.type) && p.text.trim().length === 0;
  });
  if (badPart) {
    return ['clue_parts contains an empty or malformed segment.'];
  }
  if (clue.clue_parts.length > MAX_CLUE_PARTS) {
    return [`clue_parts has ${clue.clue_parts.length} segments — implausible for a cryptic clue.`];
  }

  const clueText = String(clue.clue);

  // ── Text sanity ────────────────────────────────────────────────────────────
  if (/[\r\n]/.test(clueText)) {
    errors.push('Clue contains line breaks (should be a single line).');
  }
  if (clueText.length > MAX_CLUE_LENGTH) {
    errors.push(`Clue is unreasonably long (${clueText.length} chars) — likely meta-text leakage.`);
  }
  const meta = META_PHRASES.find(rx => rx.test(clueText));
  if (meta) {
    errors.push(`Clue contains meta-commentary or narration (matched ${meta}).`);
  }
  for (const field of ['definition', 'indicator', 'fodder', 'wordplay_summary']) {
    if (clue[field] !== undefined && typeof clue[field] !== 'string') {
      errors.push(`Field "${field}" is not a string.`);
    }
  }

  // ── Answer leakage (hidden embeds the answer by design) ────────────────────
  if (type !== 'hidden' && clueText.toUpperCase().includes(answer)) {
    errors.push('Answer leaked in clue text.');
  }

  // ── Ximenean extremity ─────────────────────────────────────────────────────
  // Strip punctuation so the trailing "(5)" doesn't block an end match.
  const clueClean = clueText
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim();
  const defClean = String(clue.definition)
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim();
  if (!clueClean.startsWith(defClean) && !clueClean.endsWith(defClean)) {
    errors.push('Definition not at an extremity (non-Ximenean).');
  }

  // ── clue_parts reconstruct the clue exactly ────────────────────────────────
  const normalise = s => s.replace(/\s+/g, ' ').trim();
  const reconstructed = clue.clue_parts.map(p => p.text).join('');
  if (normalise(reconstructed) !== normalise(clueText)) {
    errors.push('Clue parts do not reconstruct the full clue text.');
  }

  // ── Exactly one definition segment ─────────────────────────────────────────
  // Double definitions are the documented exception: the second definition is
  // tagged as an indicator so the hints UI can surface both halves.
  const defParts = clue.clue_parts.filter(p => p.type === 'definition');
  if (defParts.length === 0) {
    errors.push('No clue_parts segment is tagged as the definition.');
  } else if (defParts.length > 1) {
    errors.push(
      `${defParts.length} clue_parts segments are tagged "definition" — a clue has exactly one.`
    );
  }

  // ── Definition and wordplay must not overlap ───────────────────────────────
  // In an &lit the whole clue is both at once, so the check does not apply.
  if (type !== 'andlit' && type !== 'cryptic_definition' && isMeaningfulString(clue.fodder)) {
    const defWords = new Set(defClean.split(/\s+/).filter(Boolean));
    const fodderWords = String(clue.fodder)
      .toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);
    const shared = fodderWords.filter(w => defWords.has(w));
    if (shared.length > 0 && shared.length === fodderWords.length) {
      errors.push(
        `The fodder "${clue.fodder}" is entirely inside the definition "${clue.definition}" — ` +
          `definition and wordplay must be disjoint spans of the clue.`
      );
    }
  }

  // ── Indicator must appear in the clue ──────────────────────────────────────
  if (isMeaningfulString(clue.indicator) && type !== 'double_definition') {
    if (!letters(clueText).includes(letters(clue.indicator))) {
      errors.push(`Indicator "${clue.indicator}" does not appear in the clue text.`);
    }
  }

  // ── Letter count ───────────────────────────────────────────────────────────
  const letterCountMatch = clueText.match(/\((\d+(?:[,-]\d+)*)\)\s*$/);
  if (!letterCountMatch) {
    errors.push('Missing letter count at end of clue.');
  } else {
    const declared = letterCountMatch[1].split(/[,-]/).reduce((s, n) => s + parseInt(n, 10), 0);
    if (declared !== answer.length) {
      errors.push(`Letter count (${declared}) does not match answer length (${answer.length}).`);
    }
  }

  return errors;
}

/**
 * Validate a generated clue in three stages.
 *
 * Stage 1 — Structural checks (no AI call): field shape, answer leakage,
 *   Ximenean extremity, clue-part reconstruction, exactly one definition,
 *   definition/wordplay disjointness, indicator presence, letter count.
 *
 * Stage 2 — Mechanical verification (no AI call): the wordplay arithmetic is
 *   computed directly. See `mechanics.js`. For literal-fodder mechanisms a
 *   failure is decisive and the clue is rejected here, saving the AI call
 *   entirely. For substitutable mechanisms the result is passed to the judge
 *   as context — either "arithmetic confirmed, don't second-guess it" or
 *   "this needs a synonym substitution, verify it".
 *
 * Stage 3 — Expert model review: surface quality, indicator fairness, overall
 *   score, and the rejectLexical signal.
 *
 * Fail-safe: if the judge is unreachable the clue is REJECTED, never shipped.
 *
 * @param {object}   clue        - generated clue payload
 * @param {object}   lexical     - { answer, type, definition }
 * @param {Function} callJudge   - (prompt, system, schema) => Promise<object>
 */
export async function judgeClue(clue, lexical, callJudge) {
  if (typeof callJudge !== 'function') {
    throw new TypeError('judgeClue requires a callJudge function — none was supplied.');
  }

  // ── Stage 1 ────────────────────────────────────────────────────────────────
  const errors = structuralErrors(clue, lexical);
  if (errors.length > 0) {
    return reject(errors.join(' '), 'structural');
  }

  // ── Stage 2 ────────────────────────────────────────────────────────────────
  const mechanical = verifyMechanism(lexical.type, clue, lexical.answer);

  if (mechanical.status === REFUTED) {
    // The mechanism requires literal fodder and the letters do not work out.
    // Decisive — reject without spending an AI call.
    console.log(`[judge] Mechanically refuted (${lexical.type}): ${mechanical.detail}`);
    return reject(`Wordplay is mechanically incorrect. ${mechanical.detail}`, 'mechanical');
  }
  console.log(
    `[judge] Mechanical check (${lexical.type}): ${mechanical.status} — ${mechanical.detail}`
  );
  if (!VERIFIABLE_TYPES.includes(lexical.type)) {
    return reject(
      `"${lexical.type}" wordplay can't be checked letter by letter, so it is never published.`,
      'mechanical',
      true
    );
  }
  if (isChestnut(lexical.type, clue.fodder, lexical.answer)) {
    return reject(
      `${lexical.answer} from "${clue.fodder}" is a crossword chestnut every solver knows.`,
      'mechanical',
      true
    );
  }

  // ── Stage 3: blind checks ──────────────────────────────────────────────────
  // The checker never sees the answer here, so it can't be talked into it.
  let blind;
  try {
    blind = await blindChecks(clue, lexical, callJudge);
  } catch (e) {
    if (e?.quotaExhausted) throw e;
    console.error('[judge] Blind check unavailable — rejecting clue (fail-safe):', e.message);
    return {
      ...reject(`Quality gate unavailable (blind check error: ${e.message}).`, 'unavailable'),
      judgeUnavailable: true,
    };
  }
  if (!blind.ok) {
    console.log(`[judge] Blind check failed: ${blind.feedback}`);
    return reject(blind.feedback, 'blind');
  }

  // ── Stage 4 ────────────────────────────────────────────────────────────────
  let judgeResult;
  try {
    judgeResult = await callJudge(
      buildJudgePrompt(lexical, clue, mechanical),
      JUDGE_SYSTEM,
      JUDGE_RESPONSE_SCHEMA
    );
  } catch (e) {
    // Quota exhaustion must reach the pipeline so it can abort the whole run
    // rather than burn its budget on calls that will all fail the same way.
    if (e?.quotaExhausted) throw e;
    console.error('[judge] Judge model unavailable — rejecting clue (fail-safe):', e.message);
    return {
      ...reject(
        `Quality gate unavailable (judge error: ${e.message}). Clue rejected to prevent ` +
          `unreviewed content from shipping.`,
        'unavailable'
      ),
      judgeUnavailable: true,
    };
  }

  const valid =
    judgeResult.valid === true &&
    judgeResult.wordplay_correct === true &&
    typeof judgeResult.score === 'number' &&
    judgeResult.score >= MIN_QUALITY_SCORE;

  return {
    valid,
    score: judgeResult.score,
    surfaceQuality: judgeResult.surface_quality,
    wordplayCorrect: judgeResult.wordplay_correct,
    indicatorFair: judgeResult.indicator_fair,
    feedback: judgeResult.feedback,
    rejectLexical: judgeResult.reject_lexical ?? false,
    stage: 'judge',
    mechanicalStatus: mechanical.status,
    mechanicallyVerified: mechanical.status === VERIFIED,
    blindVerified: true,
  };
}

/**
 * Two calls to the checker, neither showing it the answer:
 *
 *   solve   — it must solve the clue cold. Nonsense wordplay ("Bob, a man
 *             holding back" for BAMBOO) fails here, however confident the
 *             writer's explanation.
 *   lookup  — the definition (both, for a double definition) must really
 *             mean the answer, and every synonym or abbreviation piece must
 *             really stand for its letters.
 */
export async function blindChecks(clue, lexical, callJudge) {
  const answer = letters(lexical.answer);
  const n = answer.length;

  const solved = await callJudge(buildSolvePrompt(clue.clue), SOLVE_SYSTEM, SOLVE_SCHEMA);
  const guesses = (Array.isArray(solved?.answers) ? solved.answers : []).map(letters);
  if (!guesses.slice(0, 3).includes(answer)) {
    return {
      ok: false,
      feedback:
        `A solver who wasn't told the answer couldn't get ${lexical.answer} from this clue ` +
        `(it suggested ${guesses.length ? guesses.join(', ') : 'nothing'}). The wordplay or ` +
        `definition doesn't work as written.`,
    };
  }

  const definitions = [clue.definition];
  if (lexical.type === 'double_definition') definitions.push(clue.indicator);
  const pieces = PIECE_TYPES.has(lexical.type)
    ? (Array.isArray(clue.letter_pieces) ? clue.letter_pieces : []).filter(p =>
        needsLookup(lexical.type, p)
      )
    : [];
  const items = [
    ...definitions.map(phrase => ({ phrase: String(phrase ?? ''), length: n })),
    ...pieces.map(p => ({ phrase: String(p.clue_words ?? ''), length: null })),
  ];
  const looked = await callJudge(buildLookupPrompt(items), LOOKUP_SYSTEM, LOOKUP_SCHEMA);
  const found = Array.isArray(looked?.items) ? looked.items : [];
  const candidatesFor = (phrase, i) => {
    const byPhrase = found.find(f => letters(f?.phrase) === letters(phrase));
    const item = byPhrase ?? found[i];
    return (Array.isArray(item?.candidates) ? item.candidates : []).map(letters);
  };

  for (const [i, phrase] of definitions.entries()) {
    if (!candidatesFor(phrase, i).includes(answer)) {
      return {
        ok: false,
        feedback: `"${phrase}" doesn't clearly mean ${lexical.answer}: use a definition that a thesaurus would give for it.`,
      };
    }
  }
  for (const [j, p] of pieces.entries()) {
    const candidates = candidatesFor(p.clue_words, definitions.length + j);
    if (!pieceGives(lexical.type, p.clue_words, p.letters, candidates)) {
      return {
        ok: false,
        feedback: `"${p.clue_words}" doesn't stand for ${letters(p.letters)} in standard crossword usage.`,
      };
    }
  }
  return { ok: true };
}
