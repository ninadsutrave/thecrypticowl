import { createGameHandler } from '../../shared/runtime/gameHandler.js';
import { pickFromBank } from './bank.js';
import { generateTrivia } from './generator.js';
import { judgeTrivia } from './judge.js';
import { reviewTrivia } from './reviewer.js';
import { ALL_TOPICS } from './topics.js';

/** Warn when this many subjects are left unused: about a month's notice. */
const LOW_STOCK = 30;

/**
 * Trivia: one story question a day, answered in free text. Subject picked
 * in code, question written by the generator model from its Wikipedia
 * article, checked in code, then blind-solved by the judge model. A
 * hand-written bank steps in if every AI attempt fails.
 */
export const spec = {
  game: 'trivia',
  label: 'Trivia',
  needsAI: true,
  maxAttempts: 4,
  generate: ctx => generateTrivia(ctx),
  review: candidate => reviewTrivia(candidate),
  judge: (candidate, ctx) => judgeTrivia(candidate, ctx),
  fallback: async ctx => pickFromBank(ctx),
  healthCheck: async ({ store, dbProvider }) => {
    const used = await store.usedSourceKeys('trivia', null, dbProvider);
    const left = ALL_TOPICS.filter(t => !used.has(`wiki:${t.title}`)).length;
    return left < LOW_STOCK
      ? [`Trivia: only ${left} unused subjects left — extend games/trivia/topics.js`]
      : [];
  },
};

export const handler = createGameHandler(spec);
