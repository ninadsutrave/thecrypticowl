import { isCorrectGuess } from '../../shared/runtime/match.js';
import { buildSolverPrompt, GUESS_SCHEMA, SOLVER_SYSTEM } from './prompts.js';

/**
 * Blind-solve judge, on a different model from the writer. It sees only the
 * category and clues — never the answer — and plays the puzzle twice:
 *
 *   clue 1 alone   → must NOT already name the answer (too easy otherwise)
 *   all five clues → MUST name it first (unique and solvable), and the
 *                    clues must be fair and on-policy
 */
export async function judgeWhatAmI(candidate, ctx) {
  const { category, clues, accepted } = candidate.payload;

  const first = await ctx.callJudge(
    buildSolverPrompt(category, clues.slice(0, 1)),
    SOLVER_SYSTEM,
    GUESS_SCHEMA
  );
  const firstGuess = first?.guesses?.[0] ?? '';
  if (isCorrectGuess(firstGuess, accepted)) {
    return {
      ok: false,
      feedback: `Clue 1 alone gives it away (a blind solver guessed "${firstGuess}"). Make clue 1 vaguer.`,
    };
  }

  const all = await ctx.callJudge(buildSolverPrompt(category, clues), SOLVER_SYSTEM, GUESS_SCHEMA);
  const guesses = all?.guesses ?? [];
  if (!isCorrectGuess(guesses[0] ?? '', accepted)) {
    return {
      ok: false,
      feedback:
        `All five clues together don't point clearly to the answer: a blind solver guessed ` +
        `${guesses.map(g => `"${g}"`).join(', ') || 'nothing'}. Make clues 4 and 5 more specific.`,
    };
  }
  if (all.fair === false) {
    return { ok: false, feedback: `Fairness problem: ${all.issues || 'unspecified'}` };
  }
  return {
    ok: true,
    feedback: 'blind solver needed more than clue 1 and solved it with all five',
    score: 1,
  };
}
