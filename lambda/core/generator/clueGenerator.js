import {
  buildCluePrompt,
  CLUE_GENERATOR_SYSTEM,
  CLUE_RESPONSE_SCHEMA,
} from '../../constants/prompts.js';

/**
 * Generates a British cryptic clue for a given word and mechanism.
 *
 * @param {{ answer: string, type: string, definition: string }} lexical
 * @param {Function} callAI          - AI client (prompt, system, schema?) => object
 * @param {string|null} feedback     - Feedback from the judge on a previous failed attempt.
 *                                     When provided, the model is instructed to address the issues.
 */
export async function generateClue(lexical, callAI, feedback = null) {
  const prompt = buildCluePrompt(
    lexical.answer,
    lexical.type,
    lexical.definition,
    lexical.answer.length,
    feedback
  );

  const result = await callAI(prompt, CLUE_GENERATOR_SYSTEM, CLUE_RESPONSE_SCHEMA);

  // Append the letter count ourselves — it's deducible from the answer length,
  // so we don't burn a model token on it, and we guarantee correctness.
  // Strip any count the model slipped in despite instructions.
  const letterCountSegment = ` (${lexical.answer.length})`;
  result.clue = result.clue.replace(/\s*\(\d+(?:,\d+)*\)\s*$/, '').trimEnd() + letterCountSegment;

  if (Array.isArray(result.clue_parts)) {
    // Drop any trailing structural letter-count segment the model may have included
    // despite instructions, then append our own canonical one.
    const trailing = result.clue_parts[result.clue_parts.length - 1];
    if (trailing && !trailing.type && /^\s*\(\d+(?:,\d+)*\)\s*$/.test(trailing.text)) {
      result.clue_parts.pop();
    }
    result.clue_parts.push({ text: letterCountSegment, type: null });
  }

  return result;
}
