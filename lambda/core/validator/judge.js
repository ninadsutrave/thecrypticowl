import { buildJudgePrompt, JUDGE_SYSTEM, JUDGE_RESPONSE_SCHEMA } from '../../constants/prompts.js';
import { callGeminiFlash } from '../../clients/providers/gemini.js';

/**
 * Validates a generated clue in two stages.
 *
 * Stage 1 — Fast structural checks (no AI call):
 *   • Core fields present
 *   • Answer not leaked (except hidden type)
 *   • Ximenean extremity (definition at start or end)
 *   • Clue-parts reconstruct the full clue string
 *   • Letter count in parentheses matches answer length
 *   • Hidden word literally embedded (hidden type only)
 *   • Anagram exact-letter check: if fodder and answer have the same letter count,
 *     sorted letters must match. If they don't, the clue still proceeds to Flash
 *     with a flag — the fodder may be a synonym, which Flash can assess.
 *
 * Stage 2 — Gemini 3 Flash expert review (temperature 0.1 — deterministic):
 *   • Wordplay correctness (synonym-aware for anagram/reversal)
 *   • Surface quality score (1–5)
 *   • Indicator fairness in British cryptics
 *   • Overall score (1–10) — must be ≥7 to pass
 *   • rejectLexical signal (word+type fundamentally unsuitable)
 *
 * Fallback: if Flash is unavailable, the clue is REJECTED (fail-safe) and
 * the pipeline retries — a clue that bypasses quality review never ships.
 *
 * @param {{ clue: string, definition: string, indicator: string, fodder: string,
 *           clue_parts: object[], wordplay_summary: string }} clue
 * @param {{ answer: string, type: string }} lexical
 */
export async function judgeClue(clue, lexical) {
  const errors = [];
  const type = lexical.type;
  const answer = lexical.answer.toUpperCase();

  // ── Stage 1: Structural checks ───────────────────────────────────────────────

  // 1a. Core fields
  if (!clue.clue || !clue.definition) {
    return {
      valid: false,
      score: 0,
      feedback: 'Missing core fields (clue or definition).',
      rejectLexical: false,
    };
  }

  // 1b. Answer leak (hidden type is exempt — the answer is embedded by design)
  if (type !== 'hidden' && clue.clue.toUpperCase().includes(answer)) {
    errors.push('Answer leaked in clue text.');
  }

  // 1c. Ximenean extremity — strip punctuation so "(5)" doesn't block the match
  const clueClean = clue.clue.toLowerCase().replace(/[^a-z\s]/g, '').trim();
  const defClean = clue.definition.toLowerCase().replace(/[^a-z\s]/g, '').trim();
  if (!clueClean.startsWith(defClean) && !clueClean.endsWith(defClean)) {
    errors.push('Definition not at an extremity (non-Ximenean).');
  }

  // 1d. Clue-parts reconstruction
  if (Array.isArray(clue.clue_parts) && clue.clue_parts.length > 0) {
    const reconstructed = clue.clue_parts.map((p) => p.text).join('');
    const normalise = (s) => s.replace(/\s+/g, ' ').trim();
    if (normalise(reconstructed) !== normalise(clue.clue)) {
      errors.push('Clue parts do not reconstruct the full clue text.');
    }
  } else {
    errors.push('Clue parts array is missing or empty.');
  }

  // 1e. Letter count
  const letterCountMatch = clue.clue.match(/\((\d+(?:,\d+)*)\)\s*$/);
  if (!letterCountMatch) {
    errors.push('Missing letter count at end of clue.');
  } else {
    const declared = letterCountMatch[1].split(',').reduce((s, n) => s + parseInt(n, 10), 0);
    if (declared !== answer.length) {
      errors.push(`Letter count (${declared}) does not match answer length (${answer.length}).`);
    }
  }

  // 1f. Hidden word: answer must be literally embedded across the clue text
  if (type === 'hidden') {
    const clueLetters = clue.clue.toUpperCase().replace(/[^A-Z]/g, '');
    if (!clueLetters.includes(answer)) {
      errors.push(`Hidden word "${answer}" is not literally embedded in the clue text.`);
    }
  }

  // 1g. Anagram exact-letter check
  // When fodder and answer have the same number of letters, the letter multisets
  // must match exactly (sorted comparison). If they don't, the fodder is being
  // used as a synonym — which may be legitimate. We flag it for Flash rather
  // than hard-rejecting, so Flash can assess the synonym substitution.
  let anagramSynonymFlag = false;
  if (type === 'anagram' && clue.fodder) {
    const sortLetters = (str) =>
      str.toUpperCase().replace(/[^A-Z]/g, '').split('').sort().join('');
    const sortedFodder = sortLetters(clue.fodder);
    const sortedAnswer = sortLetters(answer);

    if (sortedFodder.length === sortedAnswer.length && sortedFodder !== sortedAnswer) {
      // Same letter count but letters don't match → fodder must be a synonym.
      // Flag for Flash to verify the synonym is valid.
      anagramSynonymFlag = true;
      console.log(
        `[judge] Anagram: sorted fodder "${sortedFodder}" ≠ sorted answer "${sortedAnswer}". ` +
        `Flagging as synonym substitution for Flash review.`
      );
    }
  }

  // Hard structural failures — skip AI judge
  if (errors.length > 0) {
    return {
      valid: false,
      score: 0,
      feedback: errors.join(' '),
      rejectLexical: false,
    };
  }

  // ── Stage 2: Gemini 3 Flash expert review ────────────────────────────────────
  // - Different model family from generator (2.5 Pro) → independent blind spots
  // - Temperature 0.1 → deterministic, consistent scoring across runs
  // - Fail-safe: if Flash is unavailable, the clue is REJECTED (not passed)
  let judgeResult;
  try {
    judgeResult = await callGeminiFlash(
      buildJudgePrompt(lexical, clue, anagramSynonymFlag),
      JUDGE_SYSTEM,
      JUDGE_RESPONSE_SCHEMA
    );
  } catch (e) {
    // Flash unavailable — fail safe. Never let an unreviewed clue ship.
    console.error('[judge] Gemini Flash unavailable — rejecting clue (fail-safe):', e.message);
    return {
      valid: false,
      score: 0,
      feedback: `Quality gate unavailable (Flash error: ${e.message}). Clue rejected to prevent unreviewed content from shipping.`,
      rejectLexical: false,
      judgeUnavailable: true, // signal for pipeline logging/alerting
    };
  }

  // Threshold: 7+ = "high quality, minor polish needed"
  const valid = judgeResult.valid && judgeResult.wordplay_correct && judgeResult.score >= 7;

  return {
    valid,
    score: judgeResult.score,
    surfaceQuality: judgeResult.surface_quality,
    wordplayCorrect: judgeResult.wordplay_correct,
    indicatorFair: judgeResult.indicator_fair,
    feedback: judgeResult.feedback,
    rejectLexical: judgeResult.reject_lexical ?? false,
  };
}
