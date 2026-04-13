import { selectLexical } from "./generator/lexicalPlanner.js";
import { generateClue } from "./generator/clueGenerator.js";
import { judgeClue } from "./validator/judge.js";
import { MAX_ATTEMPTS } from "../constants/prompts.js";

/**
 * Orchestrates the AI pipeline to generate a valid, high-quality clue.
 */
export async function generateValidClue(callAI, aiProvider) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`Attempt ${attempt} using ${aiProvider}`);

    try {
      const lexical = await selectLexical(callAI);
      console.log(`Lexical chosen: ${lexical.answer} (${lexical.type})`);

      const clue = await generateClue(lexical, callAI);
      console.log(`Clue generated: ${clue.clue}`);

      const verdict = judgeClue(clue, lexical);

      if (verdict.valid) {
        return { lexical, clue };
      }

      console.log("Rejected:", verdict.errors);
    } catch (e) {
      console.error(`Attempt ${attempt} failed:`, e.message);
    }
  }

  throw new Error(`Failed to generate a valid clue after ${MAX_ATTEMPTS} attempts`);
}
