import { createGameHandler } from '../../shared/runtime/gameHandler.js';
import { pickFresh } from '../../shared/runtime/pool.js';
import { makeKey, pickGivens } from './cipher.js';
import { INDIAN_QUOTES, QUOTES } from './quotes.js';
import { INDIA_QUOTE_SHARE, poolForDay } from '../../shared/runtime/india.js';
import { isSuitable, reviewCryptogram } from './reviewer.js';

/** Unused quotes left before the alert starts nagging. */
const LOW_STOCK = 45;

const usable = () => [...QUOTES, ...INDIAN_QUOTES].filter(q => isSuitable(q.text));

/**
 * Cryptogram: no AI. A public-domain quote from the curated pool, a fresh
 * random key, two mid-frequency letters given. Each quote is used once;
 * if the pool runs dry the least recently used return (see pool.js).
 */
export const spec = {
  game: 'cryptogram',
  label: 'Cryptogram',
  maxAttempts: 4,
  generate: async ctx => {
    const key = q => `quote:${q.id}`;
    // Two days in ten an Indian quote (Tagore, Gandhi, Vivekananda…).
    const pool = poolForDay(usable(), q => q.india === true, key, ctx, INDIA_QUOTE_SHARE);
    const { item: quote, reused } = await pickFresh(pool, key, ctx);
    const text = quote.text.toUpperCase();
    return {
      payload: {
        text,
        author: quote.author,
        source: quote.source,
        key: makeKey(ctx.rng),
        given: pickGivens(text, ctx.rng),
      },
      sourceKeys: [`quote:${quote.id}`],
      summary: `"${quote.text}" — ${quote.author}${reused != null ? ` (reused: pool exhausted)` : ''}`,
    };
  },
  review: candidate => reviewCryptogram(candidate),
  healthCheck: async ({ store, dbProvider }) => {
    const used = await store.usedSourceKeys('cryptogram', null, dbProvider);
    const left = usable().filter(q => !used.has(`quote:${q.id}`)).length;
    return left < LOW_STOCK
      ? [
          `Only ${left} unused cryptogram quotes left (~${left} days). Add more to games/cryptogram/quotes.js.`,
        ]
      : [];
  },
};

export const handler = createGameHandler(spec);
