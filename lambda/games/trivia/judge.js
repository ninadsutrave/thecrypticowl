import { isCorrectGuess } from '../../shared/runtime/match.js';
import { buildSolverPrompt, SOLVE_SCHEMA, SOLVER_SYSTEM } from './prompts.js';

/** The opening the judge sees first: the first two sentences, as a question. */
export function opening(question) {
  const sentences = question.split(/(?<=[.!?])\s+/);
  return `${sentences.slice(0, 2).join(' ')} What is it?`;
}

/**
 * Blind-solve judge on a different model from the writer. It never sees the
 * answer, and plays the question twice:
 *
 *   the opening alone → must NOT already name it (otherwise too easy)
 *   the full question → MUST name it first (solvable, one clear answer),
 *                       rated medium (Indian subjects: medium or
 *                       hard), and fair
 */
export async function judgeTrivia(candidate, ctx) {
  const { category, question, accepted } = candidate.payload;

  const early = await ctx.callJudge(
    buildSolverPrompt(category, opening(question)),
    SOLVER_SYSTEM,
    SOLVE_SCHEMA
  );
  const earlyGuess = early?.guesses?.[0] ?? '';
  if (isCorrectGuess(earlyGuess, accepted)) {
    return {
      ok: false,
      feedback: `The first two sentences give it away (a blind solver guessed "${earlyGuess}"). Open with more oblique facts and save the telling ones for the end.`,
    };
  }

  const full = await ctx.callJudge(
    buildSolverPrompt(category, question),
    SOLVER_SYSTEM,
    SOLVE_SCHEMA
  );
  const guesses = full?.guesses ?? [];
  if (!isCorrectGuess(guesses[0] ?? '', accepted)) {
    return {
      ok: false,
      feedback:
        `The full question doesn't point clearly to the answer: a blind solver guessed ` +
        `${guesses.map(g => `"${g}"`).join(', ') || 'nothing'}. Make the last facts more specific.`,
    };
  }
  if (full.fair === false) {
    return { ok: false, feedback: `Fairness problem: ${full.issues || 'unspecified'}` };
  }
  // Indian subjects: medium-hard (medium or hard passes). Everything else is
  // a popular subject at medium: hard is too much for it.
  const india = candidate.india ?? category === 'India';
  if (full.difficulty === 'easy') {
    return {
      ok: false,
      feedback: 'Rated easy: most people would get it at once. Lead with less familiar facts.',
    };
  }
  if (full.difficulty === 'hard' && !india) {
    return {
      ok: false,
      feedback:
        'Rated hard: aim for medium. Make the last sentence point to something most people know.',
    };
  }
  if (full.difficulty === 'obscure') {
    return {
      ok: false,
      feedback:
        'Rated obscure: almost nobody could get it. Include one well-known fact near the end.',
    };
  }
  return {
    ok: true,
    feedback: `opening alone didn't give it away; solved in full; rated ${full.difficulty}`,
    score: 1,
  };
}
