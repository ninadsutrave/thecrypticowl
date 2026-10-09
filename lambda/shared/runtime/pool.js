/**
 * Pick from a finite pool without ever failing for lack of supply.
 *
 * First choice: something never used. When the pool is exhausted, fall back
 * to things not used in the last year, then six months, then three — so a
 * forgotten top-up degrades to an occasional repeat (and a low-stock alert)
 * instead of a missing puzzle.
 */
export const REUSE_LADDER_DAYS = [365, 180, 90];

export async function pickFresh(items, keyOf, ctx) {
  const never = items.filter(i => !ctx.used.has(keyOf(i)));
  if (never.length) return { item: ctx.rng.pick(never), reused: null };
  for (const days of REUSE_LADDER_DAYS) {
    const recent = await ctx.usedSince(days);
    const pool = items.filter(i => !recent.has(keyOf(i)));
    if (pool.length) return { item: ctx.rng.pick(pool), reused: days };
  }
  // Everything used in the last 90 days: take any — still not a missing day.
  return { item: ctx.rng.pick(items), reused: 0 };
}
