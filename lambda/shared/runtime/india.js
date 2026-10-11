import { createRng } from './random.js';

/**
 * India is most of the audience. Single-answer games lean Indian on a share
 * of days: five days in eight for What Am I and Trivia, two in ten for the
 * Cryptogram (the rest are the world's famous quotes). Games with several
 * items mix instead: Chronology and Higher or Lower include one or two
 * Indian items every day (see their selectors).
 *
 * The draw is per day (seeded by the date), so every retry of a day keeps
 * its India or world side, and it's reproducible.
 */
export const INDIA_SHARE = 5 / 8;
export const INDIA_QUOTE_SHARE = 2 / 10;

export const isIndiaDay = (rng, share = INDIA_SHARE) => rng.chance(share);

/**
 * The part of a pool to pick from today: the Indian items on an India day
 * (while any are still unused), otherwise the rest. Either side running dry
 * falls back to the other, so a day never goes without a puzzle.
 */
export function poolForDay(items, isIndian, keyOf, ctx, share = INDIA_SHARE) {
  const indian = items.filter(isIndian);
  const rest = items.filter(i => !isIndian(i));
  const fresh = list => list.some(i => !ctx.used.has(keyOf(i)));
  // Drawn once per date, not per attempt: re-drawing on every retry let the
  // stricter checks on Indian subjects tip days away from India (a week of
  // Trivia had none).
  const draw = ctx.date ? createRng(`india:${ctx.date}`) : ctx.rng;
  if (isIndiaDay(draw, share)) return fresh(indian) ? indian : rest.length ? rest : indian;
  return rest.length ? rest : indian;
}
