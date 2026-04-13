import { 
  LEXICAL_PLANNER_PROMPT, 
  LEXICAL_PLANNER_SYSTEM 
} from "../../constants/prompts.js";

/**
 * Selects a word and a cryptic mechanism for the daily clue.
 */
export async function selectLexical(callAI) {
  return await callAI(LEXICAL_PLANNER_PROMPT, LEXICAL_PLANNER_SYSTEM);
}
