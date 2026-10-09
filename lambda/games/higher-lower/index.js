import { createGameHandler } from '../../shared/runtime/gameHandler.js';
import { generateHigherLower } from './generator.js';
import { reviewHigherLower } from './reviewer.js';

/**
 * Higher or Lower: no AI. A theme a day (city populations, mountain
 * heights, film years…), with values from Wikidata; ten fair steps chosen
 * in code. Items rest for 60 days before they can return.
 */
export const spec = {
  game: 'higher-lower',
  label: 'Higher or Lower',
  maxAttempts: 6,
  repeatWindowDays: 60,
  generate: ctx => generateHigherLower(ctx),
  review: candidate => reviewHigherLower(candidate.payload),
};

export const handler = createGameHandler(spec);
