import { closePairs, EVENTS_PER_DAY, MIN_CLOSE_PAIRS } from './selector.js';

const YEAR_IN_TEXT = /\b\d{3,4}\b/;

export function reviewChronology(candidate) {
  const { day, events = [] } = candidate.payload ?? {};
  const errors = [];
  if (!day) errors.push('missing day label');
  if (events.length !== EVENTS_PER_DAY) errors.push(`expected ${EVENTS_PER_DAY} events`);
  const years = events.map(e => e.year);
  if (new Set(years).size !== years.length) errors.push('two events share a year');
  if (new Set(events.map(e => e.id)).size !== events.length) errors.push('duplicate event ids');
  for (const e of events) {
    if (YEAR_IN_TEXT.test(e.text)) errors.push(`"${e.text}" gives its year away`);
    if (!/^https:\/\//.test(e.url ?? '')) errors.push(`"${e.text}" has no source link`);
  }
  if (closePairs(years, MIN_CLOSE_PAIRS.within) < MIN_CLOSE_PAIRS.pairs) {
    errors.push('no close pair of years — too easy for medium');
  }
  const sorted = [...events].sort((a, b) => a.year - b.year);
  if (events.some((e, i) => e.id === sorted[i].id))
    errors.push('an event starts in its correct slot');
  return {
    ok: errors.length === 0,
    errors,
    checks: { closePairs: closePairs(years), closePairsWithin40: closePairs(years, 40) },
  };
}
