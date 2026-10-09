import {
  buildLexicalPrompt,
  LEXICAL_PLANNER_SYSTEM,
  LEXICAL_RESPONSE_SCHEMA,
} from '../constants/prompts.js';

/**
 * Selects a word and cryptic mechanism for the daily clue.
 *
 * @param {Function} callAI  - AI client function (prompt, system, schema?) => object
 * @param {{ avoidTypes?: string[], avoidAnswers?: string[] }} constraints
 */
export async function selectLexical(callAI, constraints = {}) {
  const { avoidTypes = [], avoidAnswers = [] } = constraints;
  const prompt = buildLexicalPrompt(avoidTypes, avoidAnswers);
  return await callAI(prompt, LEXICAL_PLANNER_SYSTEM, LEXICAL_RESPONSE_SCHEMA);
}
