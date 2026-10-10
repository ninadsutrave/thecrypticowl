import { isCorrectGuess } from '../../shared/runtime/match.js';
import { buildSolverPrompt, GUESS_SCHEMA, SOLVER_SYSTEM } from './prompts.js';

/**
 * Blind-solve judge, on a different model from the writer. It sees only the
 * category and clues — never the answer — and plays the puzzle twice:
 *
 *   opening clues  → must NOT already name the answer (too easy otherwise):
 *                    clue 1 for a popular subject, clues 1–2 for an Indian
 *                    one (medium-hard)
 *   all five clues → MUST name it first (unique and solvable), and the
 *                    clues must be fair and on-policy
 *   clues 1–3      → popular subjects only: MUST name it (medium, not hard)
 */
export async function judgeWhatAmI(candidate, ctx) {
  const { category, clues, accepted } = candidate.payload;
  const solve = async n =>
    ctx.callJudge(buildSolverPrompt(category, clues.slice(0, n)), SOLVER_SYSTEM, GUESS_SCHEMA);

  // Too easy? Medium-hard (Indian answers): clues 1–2 together must not give
  // it away. Medium (everything else): clue 1 alone must not.
  const india = Boolean(candidate.india);
  const early = india ? 2 : 1;
  const opening = await solve(early);
  const openingGuess = opening?.guesses?.[0] ?? '';
  if (isCorrectGuess(openingGuess, accepted)) {
    return {
      ok: false,
      feedback: `${early === 1 ? 'Clue 1 alone gives' : 'Clues 1 and 2 give'} it away (a blind solver guessed "${openingGuess}"). Make ${early === 1 ? 'clue 1' : 'clues 1 and 2'} vaguer.`,
    };
  }

  const all = await solve(5);
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

  // Too hard? A popular subject at medium should fall by clue 3.
  if (!india) {
    const mid = await solve(3);
    if (!isCorrectGuess(mid?.guesses?.[0] ?? '', accepted)) {
      return {
        ok: false,
        feedback:
          'Too hard for a popular subject: a blind solver still could not name it after three clues. Make clue 3 more telling.',
      };
    }
  }
  return {
    ok: true,
    feedback: india
      ? 'not given away by clues 1–2; solved with all five'
      : 'not given away by clue 1; solved by clue 3',
    score: 1,
  };
}
