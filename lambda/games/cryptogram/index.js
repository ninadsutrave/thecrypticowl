import { createGameHandler } from '../../shared/runtime/gameHandler.js';
import { pickFresh } from '../../shared/runtime/pool.js';
import { makeKey, pickGivens } from './cipher.js';
import { QUOTES } from './quotes.js';
import { isSuitable, reviewCryptogram } from './reviewer.js';

/** Unused quotes left before the alert starts nagging. */
const LOW_STOCK = 45;

const usable = () => QUOTES.filter(q => isSuitable(q.text));

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
    const { item: quote, reused } = await pickFresh(usable(), q => `quote:${q.id}`, ctx);
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
