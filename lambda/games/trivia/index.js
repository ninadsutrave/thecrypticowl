import { createGameHandler } from '../../shared/runtime/gameHandler.js';
import { generateTrivia } from './generator.js';
import { judgeTrivia } from './judge.js';
import { fetchOpenTdb } from './opentdb.js';
import { QUESTIONS_PER_DAY, reviewTrivia } from './reviewer.js';

/** A topic rests this long before it can be used again (with a new excerpt). */
const REPEAT_WINDOW_DAYS = 21;

/**
 * Trivia: ten medium questions. Topics chosen in code, questions written by
 * the generator model from Wikipedia, reviewed in code, blind-answered by
 * the judge model. Open Trivia DB steps in if every AI attempt fails.
 */
export const spec = {
  game: 'trivia',
  label: 'Trivia',
  needsAI: true,
  maxAttempts: 3,
  repeatWindowDays: REPEAT_WINDOW_DAYS,
  generate: ctx => generateTrivia(ctx),
  review: candidate => reviewTrivia(candidate),
  judge: (candidate, ctx) => judgeTrivia(candidate, ctx),
  fallback: async ctx => ({
    payload: { questions: await fetchOpenTdb(QUESTIONS_PER_DAY, ctx.rng) },
    sourceKeys: [],
    summary: 'Open Trivia DB',
  }),
};

export const handler = createGameHandler(spec);
