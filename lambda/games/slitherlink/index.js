import { createGameHandler } from '../../shared/runtime/gameHandler.js';
import { generateSlitherlink } from './generator.js';
import { judgeSlitherlink } from './judge.js';
import { reviewSlitherlink } from './reviewer.js';

/** Slitherlink: no AI. Generated, reviewed and re-solved entirely in code. */
export const spec = {
  game: 'slitherlink',
  label: 'Slitherlink',
  maxAttempts: 8,
  generate: ({ rng }) => {
    const payload = generateSlitherlink(rng);
    return {
      payload,
      sourceKeys: [],
      summary: `${payload.rows}×${payload.cols}, ${payload.clues.replace(/\./g, '').length} clues`,
    };
  },
  review: candidate => reviewSlitherlink(candidate.payload),
  judge: candidate => judgeSlitherlink(candidate.payload),
};

export const handler = createGameHandler(spec);
