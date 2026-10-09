import { createGameHandler } from '../../shared/runtime/gameHandler.js';
import { generateShikaku } from './generator.js';
import { judgeShikaku } from './judge.js';
import { reviewShikaku } from './reviewer.js';

/** Shikaku: no AI. Generated, reviewed and re-solved entirely in code. */
export const spec = {
  game: 'shikaku',
  label: 'Shikaku',
  maxAttempts: 8,
  generate: ({ rng }) => {
    const payload = generateShikaku(rng);
    return {
      payload,
      sourceKeys: [],
      summary: `${payload.size}×${payload.size}, ${payload.clues.length} rectangles`,
    };
  },
  review: candidate => reviewShikaku(candidate.payload),
  judge: candidate => judgeShikaku(candidate.payload),
};

export const handler = createGameHandler(spec);
