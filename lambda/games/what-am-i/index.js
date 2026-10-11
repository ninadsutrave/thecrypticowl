import { createGameHandler } from '../../shared/runtime/gameHandler.js';
import { CATEGORIES, INDIAN } from './candidates.js';
import { generateWhatAmI } from './generator.js';
import { judgeWhatAmI } from './judge.js';
import { reviewWhatAmI } from './reviewer.js';

/**
 * Categories rotate daily (11 of them), so each is drawn every 11 days and
 * runs dry on its own. Warn when any is down to this many unused answers —
 * about a month's notice.
 */
const LOW_STOCK_PER_CATEGORY = 3;
/** Indian answers go 5 days in 8: 20 left is about a month's notice. */
const LOW_STOCK_INDIAN = 20;

/**
 * What Am I?: subject picked in code, clues written by the
 * generator model from Wikipedia, checked in code, then blind-solved by the
 * judge model.
 */
export const spec = {
  game: 'what-am-i',
  label: 'What Am I?',
  needsAI: true,
  maxAttempts: 4,
  generate: ctx => generateWhatAmI(ctx),
  review: candidate => reviewWhatAmI(candidate),
  judge: (candidate, ctx) => judgeWhatAmI(candidate, ctx),
  healthCheck: async ({ store, dbProvider }) => {
    const used = await store.usedSourceKeys('what-am-i', null, dbProvider);
    const warnings = Object.entries(CATEGORIES)
      .map(([category, titles]) => [category, titles.filter(t => !used.has(`wiki:${t}`)).length])
      .filter(([, left]) => left < LOW_STOCK_PER_CATEGORY)
      .map(
        ([category, left]) =>
          `What Am I: only ${left} unused "${category}" answers left — extend games/what-am-i/candidates.js`
      );
    const indianLeft = [...INDIAN].filter(t => !used.has(`wiki:${t}`)).length;
    if (indianLeft < LOW_STOCK_INDIAN) {
      warnings.push(
        `What Am I: only ${indianLeft} unused Indian answers left (about ${Math.round(indianLeft * 1.6)} days) — add to INDIA in games/what-am-i/candidates.js`
      );
    }
    return warnings;
  },
};

export const handler = createGameHandler(spec);
