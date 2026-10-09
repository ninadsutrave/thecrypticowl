import { createGameHandler } from '../../shared/runtime/gameHandler.js';
import { reviewChronology } from './reviewer.js';
import { generateChronology } from './selector.js';

/**
 * Chronology: six events from Wikipedia's "On this day" feed for the
 * puzzle's date, chosen in code for medium difficulty, screened for
 * suitability by the judge model when one is available. Events are tracked
 * by source key: fresh ones first, and once a date runs short, at most two
 * not used in the last three years (selector.js § reuse tiers).
 */
export const spec = {
  game: 'chronology',
  label: 'Chronology',
  // Uses the judge model to screen events when a key is configured, and
  // runs on keyword filters alone when not.
  optionalAI: true,
  maxAttempts: 4,
  generate: ctx => generateChronology(ctx),
  review: candidate => reviewChronology(candidate),
};

export const handler = createGameHandler(spec);
