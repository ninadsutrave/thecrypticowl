import { 
  CLUE_GENERATOR_PROMPT, 
  CLUE_GENERATOR_SYSTEM 
} from "../../constants/prompts.js";

/**
 * Generates the actual cryptic clue for a given target word and mechanism.
 */
export async function generateClue(lexical, callAI) {
  const prompt = CLUE_GENERATOR_PROMPT
    .replace("{{ANSWER}}", lexical.answer)
    .replace("{{TYPE}}", lexical.type);

  return await callAI(prompt, CLUE_GENERATOR_SYSTEM);
}
