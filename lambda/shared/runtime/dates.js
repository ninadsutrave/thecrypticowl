/**
 * Puzzle dates. Every game keys its puzzles by calendar date (YYYY-MM-DD).
 *
 * The Lambdas run in UTC, but players see the puzzle for *their* local date,
 * which can be a day behind (the Americas) or ahead (Asia-Pacific) of UTC.
 * Generating a window from yesterday to a few days ahead means every time
 * zone's "today" already exists, and leaves a buffer that rides out an AI
 * outage or a failed deploy without a missing puzzle.
 */

export function dateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export function addDays(key, days) {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(Date.UTC(y, m - 1, d + days)));
}

/** Inclusive list of date keys from `today + from` to `today + to`. */
export function dateWindow(today, from, to) {
  const out = [];
  for (let i = from; i <= to; i++) out.push(addDays(today, i));
  return out;
}

/** 0 = Monday … 6 = Sunday, for a date key. */
export function weekdayIndex(key) {
  const [y, m, d] = key.split('-').map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function isDateKey(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  // An impossible date (2026-13-40) is Invalid; one that rolls over
  // (2026-02-30 → 03-02) round-trips to a different key.
  return !Number.isNaN(d.getTime()) && dateKey(d) === s;
}
