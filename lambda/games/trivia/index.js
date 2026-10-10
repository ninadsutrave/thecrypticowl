import { createGameHandler } from '../../shared/runtime/gameHandler.js';
import { pickFromBank } from './bank.js';
import { generateTrivia } from './generator.js';
import { judgeTrivia } from './judge.js';
import { reviewTrivia } from './reviewer.js';
import { ALL_TOPICS } from './topics.js';

/** Warn when this many subjects are left unused: about a month's notice. */
const LOW_STOCK = 30;
/** India subjects go 5 days in 8: 25 left is about six weeks' notice. */
const LOW_STOCK_INDIAN = 25;

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
    const unused = ALL_TOPICS.filter(t => !used.has(`wiki:${t.title}`));
    const indian = unused.filter(t => t.category === 'India').length;
    const rest = unused.length - indian;
    const warnings = [];
    // India subjects go 5 days in 8, the rest 3 in 8.
    if (indian < LOW_STOCK_INDIAN) {
      warnings.push(
        `Trivia: only ${indian} unused India subjects left (about ${Math.round(indian * 1.6)} days) — add to India in games/trivia/topics.js`
      );
    }
    if (rest < LOW_STOCK) {
      warnings.push(
        `Trivia: only ${rest} unused non-India subjects left — extend games/trivia/topics.js`
      );
    }
    return warnings;
  },
};

export const handler = createGameHandler(spec);
