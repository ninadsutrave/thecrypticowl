import { createGameHandler } from '../../shared/runtime/gameHandler.js';
import { weekdayIndex } from '../../shared/runtime/dates.js';
import { generateSudoku } from './generator.js';
import { judgeSudoku } from './judge.js';
import { reviewSudoku } from './reviewer.js';
import { WEEKLY_ROTATION } from './variants.js';

/** Variant Sudoku: no AI. The weekday picks the variant. */
export const spec = {
  game: 'sudoku',
  label: 'Variant Sudoku',
  maxAttempts: 8,
  generate: ({ date, rng }) => {
    const variant = WEEKLY_ROTATION[weekdayIndex(date)];
    const payload = generateSudoku(variant, rng);
    return {
      payload,
      sourceKeys: [],
      summary: `${variant}, ${Object.keys(payload.givens).length} givens`,
    };
  },
  review: candidate => reviewSudoku(candidate.payload),
  judge: candidate => judgeSudoku(candidate.payload),
};

export const handler = createGameHandler(spec);
