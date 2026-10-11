import { fetchMonthlyViews, fetchOnThisDay } from '../../shared/sources/wikipedia.js';
import { screenEvents } from './judge.js';

export const EVENTS_PER_DAY = 6;
/** Oldest to newest: wide enough to cross eras without forcing in obscure old entries. */
const MIN_SPAN_YEARS = 100;
/** At most one birthday a set (and often none), so famous events lead. */
const MAX_BIRTHS = 1;
/**
 * Living people only when very widely known (Amitabh Bachchan, ~150k views a
 * month): their pages can turn controversial, so the bar is high and the
 * screen turns away anyone divisive.
 */
const LIVING_FLOOR = { india: 50_000, other: 100_000 };
/** Spread across history: no century supplies more than this many events. */
const MAX_PER_CENTURY = 3;

/**
 * Fame, by rank rather than a fixed bar. Fixed page-view thresholds left some
 * dates with five usable entries and no possible puzzle (a quarter of dates
 * failed in testing). Instead: the most-read events and people for the date,
 * above a low floor that only screens out the genuinely obscure.
 */
// Tightened so non-Indian events are the best known (medium, popular);
// Indian ones come in past this cap (INDIA_EXTRA), so they can be less famous.
const FAME_POOL = { event: 14, birth: 6 };
const FAME_FLOOR = { event: 1_000, birth: 20_000 };
/**
 * Lower floors for India-linked entries: English Wikipedia views understate
 * how well Indian figures are known to an Indian audience (Jayaprakash
 * Narayan draws ~17k a month to Luke Perry's ~125k).
 */
const INDIA_FAME_FLOOR = { event: 500, birth: 8_000 };

/**
 * Difficulty: close pairs (two events within 25 years) are what make a set
 * hard, so they're a ceiling, not a floor (eased after play-testing). Pairs
 * with an Indian event don't count (hardPairs): those may be close.
 * Tried strictest first: prefer none; a date whose feed can't manage that
 * allows one, then two, rather than failing the day.
 */
export const DIFFICULTY_LADDER = [
  { maxPairs: 0, within: 25 },
  { maxPairs: 1, within: 25 },
  { maxPairs: 2, within: 25 },
];
/** The reviewer's floor: no longer requires any close pair. */
export const MIN_CLOSE_PAIRS = { pairs: 0, within: 25 };

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Text that would give the year or the era away. */
const GIVEAWAY =
  /\b\d{3,4}\b|\bcentury\b|\bmillennium\b|\bBC\b|\bAD\b|\b(nineteen|eighteen|seventeen)[- ]?\w*\b/i;

/** Keeps the daily puzzle light — product rule, docs/games.md § Chronology. */
/**
 * Kept out: atrocities, terror, disasters and death tolls. Military history
 * itself is in (wars, battles, campaigns, sieges, coups, named operations):
 * a battle stays, a casualty count doesn't.
 */
const GRIM =
  /\b(kill|killed|killing|massacre|murder|bomb|terror|shot|shoots|shooting|execut|genocide|war crime|suicide|dies|died|death|deaths|crash|disaster|earthquake|tsunami|famine|epidemic|pandemic|hostage|assassinat|riot|lynch|slave|rape|torture|burn|explo|shipwreck|deport|persecut|purge|abolish|civilian|casualt|drown)\w*|\bdie\b/i;

/** Events and people with an Indian link: most of the audience is in India. */
export const INDIA_TERMS =
  /\b(India|Indian|Indians|Delhi|Mumbai|Bombay|Kolkata|Calcutta|Chennai|Madras|Bengaluru|Bangalore|Hyderabad|Punjab|Bengal|Gujarat|Kerala|Maharashtra|Rajasthan|Kashmir|Goa|Assam|Bihar|Odisha|Mysore|Mughal|Maratha|Gandhi|Nehru|Bollywood|ISRO|Hindi|Tagore)\b/;
export const isIndian = c => INDIA_TERMS.test(`${c.text} ${c.title ?? ''}`);
/** India-linked entries kept beyond the fame cap, so a set can include one. */
const INDIA_EXTRA = 8;
/** A few of the six, never most: at most two India-linked events a day. */
const MAX_INDIAN = 2;

export function dayLabel(date) {
  const [, m, d] = date.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

/** Feed entry → { id, text, year, url } in the puzzle's style, or null. */
export function normaliseEntry(entry, kind) {
  const year = Number(entry?.year);
  const page = entry?.pages?.[0];
  if (!Number.isInteger(year) || year < 1 || !page) return null;
  let text = String(entry.text ?? '').trim();
  let living = false;
  if (kind === 'births') {
    // The feed marks the dead "(d. 1980)"; anyone else is living, kept only
    // if very widely known (LIVING_FLOOR, in famous()).
    living = !/\((d\.|died)[^)]*\)\s*$/i.test(text);
    // "John Lennon, English musician (d. 1980)" → "John Lennon, English musician, is born"
    text = text.replace(/\s*\((d\.|died)[^)]*\)\s*$/i, '');
    text = `${text.replace(/[.,;]$/, '')}, is born`;
  }
  text = text
    // Asides and calendar notes — "(O.S.)", "(later split into …)" — only
    // lengthen the line, and some carry a year.
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\.$/, '');
  if (text.length < 20 || text.length > 140) return null;
  if (GIVEAWAY.test(text) || GRIM.test(text)) return null;
  const url =
    page.content_urls?.desktop?.page ??
    `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title ?? '')}`;
  const id = `${year}-${(page.title ?? text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40)}`;
  return {
    id,
    text: text[0].toUpperCase() + text.slice(1),
    year,
    url,
    // Bookkeeping for selection; stripped before the payload is stored.
    kind: kind === 'births' ? 'birth' : 'event',
    title: page.title,
    ...(living ? { living: true } : {}),
  };
}

export function candidatesFrom(feed) {
  const out = [];
  for (const kind of ['selected', 'events', 'births']) {
    for (const e of feed?.[kind] ?? []) {
      const n = normaliseEntry(e, kind);
      if (n) out.push(n);
    }
  }
  // Several entries may share a year; the pick takes at most one per year,
  // so the best known of them (not merely the first listed) can win.
  // Exact duplicates (an event in both "selected" and "events") go.
  const seen = new Set();
  return out.filter(e => !seen.has(e.id) && seen.add(e.id));
}

/**
 * Close pairs that count against the difficulty ceiling: two events within
 * `within` years, neither of them Indian. A close pair with an Indian event
 * is allowed (medium-hard for an Indian audience); the rest stay spread
 * (medium).
 */
export function hardPairs(events, within = 25) {
  const sorted = [...events].sort((a, b) => a.year - b.year);
  let pairs = 0;
  for (let i = 0; i + 1 < sorted.length; i++) {
    const [a, b] = [sorted[i], sorted[i + 1]];
    if (b.year - a.year <= within && !isIndian(a) && !isIndian(b)) {
      pairs++;
      i++;
    }
  }
  return pairs;
}

export function closePairs(years, within = 25) {
  const sorted = [...years].sort((a, b) => a - b);
  let pairs = 0;
  for (let i = 0; i + 1 < sorted.length; i++) {
    if (sorted[i + 1] - sorted[i] <= within) {
      pairs++;
      i++; // pairs must not share an event
    }
  }
  return pairs;
}

/** Tests inject fakes: skip the per-run cache so each test sees its own feed. */
async function uncachedSources(date, getFeed, getViews, callJudge) {
  const [, month, day] = date.split('-').map(Number);
  const candidates = candidatesFrom(await getFeed(month, day));
  const views = await getViews([...new Set(candidates.map(c => c.title))]);
  return screened(famous(candidates, views), callJudge);
}

/**
 * Apply the judge's suitability screen when a model is available. If the
 * screen fails, or leaves too few events to build a puzzle, the keyword
 * filters alone decide — a lighter day beats a missing one.
 */
async function screened(pool, callJudge) {
  if (!callJudge) return pool;
  try {
    const kept = await screenEvents(pool, callJudge);
    if (kept && kept.length >= EVENTS_PER_DAY + 2) return kept;
    console.warn(
      `[chronology] screen kept ${kept?.length ?? 0} of ${pool.length}; using keyword filters`
    );
  } catch (err) {
    if (err?.quotaExhausted) throw err;
    console.warn(`[chronology] screen unavailable (${err.message}); using keyword filters`);
  }
  return pool;
}

/** Shown order: shuffled so no event starts in its correct slot. */
export function derange(events, rng) {
  const sorted = [...events].sort((a, b) => a.year - b.year);
  for (let t = 0; t < 200; t++) {
    const order = rng.shuffle(events);
    if (order.every((e, i) => e.id !== sorted[i].id)) return order;
  }
  throw new Error('could not shuffle events out of order');
}

/** The most-read entries of each kind, above the floor. */
export function famous(candidates, views) {
  const v = c => views.get(c.title) ?? 0;
  candidates = candidates.filter(
    c => !c.living || v(c) >= (isIndian(c) ? LIVING_FLOOR.india : LIVING_FLOOR.other)
  );
  const top = kind =>
    candidates
      .filter(c => c.kind === kind && (views.get(c.title) ?? 0) >= FAME_FLOOR[kind])
      .sort((a, b) => (views.get(b.title) ?? 0) - (views.get(a.title) ?? 0))
      .slice(0, FAME_POOL[kind]);
  const chosen = [...top('event'), ...top('birth')];
  const extra = candidates
    .filter(c => isIndian(c) && !chosen.includes(c))
    .filter(c => (views.get(c.title) ?? 0) >= INDIA_FAME_FLOOR[c.kind])
    .sort((a, b) => (views.get(b.title) ?? 0) - (views.get(a.title) ?? 0))
    .slice(0, INDIA_EXTRA);
  // Remember each entry's readership: the pick favours the best known.
  return [...chosen, ...extra].map(c => ({ ...c, views: views.get(c.title) ?? 0 }));
}

/** India-linked entries weigh this many times more than their views suggest. */
const INDIA_WEIGHT = 2;

/**
 * A shuffle that puts better-known entries first more often (weighted
 * random order, Efraimidis–Spirakis): the six still vary day to day, but
 * the Reykjavík summit beats a society's founding far more often than not.
 * Entries without a view count shuffle evenly.
 */
export function popularFirst(pool, rng) {
  return pool
    .map(c => {
      // Square-rooted, so the most read are favoured without always winning:
      // 25 times the views makes an entry 5 times as likely to come first.
      const w = Math.sqrt(Math.max(1, c.views ?? 1)) * (isIndian(c) ? INDIA_WEIGHT : 1);
      return { c, key: Math.log(Math.max(rng.next(), 1e-12)) / w };
    })
    .sort((a, b) => b.key - a.key)
    .map(x => x.c);
}

/**
 * When a date runs short of fresh events, old ones come back: first at most
 * `MAX_REUSED` per puzzle, from events not used in the last three years;
 * only if that can't make a set, any number, from ever more recent windows.
 * Each puzzle is still a new mix of six, and no date ever goes without one.
 */
export const MAX_REUSED = 2;
export const REUSE_TIERS = [
  { days: 3 * 365, max: MAX_REUSED },
  { days: 3 * 365, max: EVENTS_PER_DAY },
  { days: 2 * 365, max: EVENTS_PER_DAY },
  { days: 365, max: EVENTS_PER_DAY },
];

const keyOf = e => `event:${e.id}`;

/**
 * Six events meeting the strictest difficulty rung the pool allows, with at
 * most `maxReused` of them from `reusable`. Throws when no set fits.
 */
export function pickEvents(
  candidates,
  rng,
  used,
  { reusable = [], maxReused = 0, needIndia = false } = {}
) {
  const fresh = candidates.filter(c => !used.has(keyOf(c)));
  const old = maxReused > 0 ? reusable : [];
  const pool = [...fresh, ...old];
  if (fresh.length + Math.min(old.length, maxReused) < EVENTS_PER_DAY) {
    throw new Error(`only ${fresh.length} fresh events (+${old.length} reusable)`);
  }
  const oldKeys = new Set(old.map(keyOf));
  for (const rung of DIFFICULTY_LADDER) {
    for (let t = 0; t < 400; t++) {
      // Mostly popularity-weighted orders; every fourth try a plain shuffle,
      // so a date whose only old events are obscure still makes a set.
      const order = t % 4 === 3 ? rng.shuffle(pool) : popularFirst(pool, rng);
      const pick = order.slice(0, EVENTS_PER_DAY);
      if (pick.filter(e => oldKeys.has(keyOf(e))).length > maxReused) continue;
      const indian = pick.filter(isIndian).length;
      if ((needIndia && indian === 0) || indian > MAX_INDIAN) continue;
      if (pick.filter(e => e.kind === 'birth').length > MAX_BIRTHS) continue;
      const years = pick.map(e => e.year);
      const perCentury = new Map();
      years.forEach(y =>
        perCentury.set(Math.floor(y / 100), (perCentury.get(Math.floor(y / 100)) ?? 0) + 1)
      );
      if ([...perCentury.values()].some(n => n > MAX_PER_CENTURY)) continue;
      if (new Set(years).size !== years.length) continue;
      const span = Math.max(...years) - Math.min(...years);
      if (span >= MIN_SPAN_YEARS && hardPairs(pick, rung.within) <= rung.maxPairs) return pick;
    }
  }
  throw new Error('no set of well-spread events with a wide span in this feed');
}

/**
 * Fresh events if they make a set; otherwise down the reuse tiers. Returns
 * the pick and how many of its events were reused.
 */
export async function pickWithReuse(candidates, ctx, { needIndia = false } = {}) {
  try {
    return { pick: pickEvents(candidates, ctx.rng, ctx.used, { needIndia }), reused: 0 };
  } catch (err) {
    if (!ctx.usedSince) throw err;
    let last = err;
    for (const tier of REUSE_TIERS) {
      const recent = await ctx.usedSince(tier.days);
      const reusable = candidates.filter(c => ctx.used.has(keyOf(c)) && !recent.has(keyOf(c)));
      try {
        const pick = pickEvents(candidates, ctx.rng, ctx.used, {
          reusable,
          maxReused: tier.max,
          needIndia,
        });
        const reused = pick.filter(e => ctx.used.has(keyOf(e))).length;
        return { pick, reused };
      } catch (tierErr) {
        last = tierErr;
      }
    }
    throw last;
  }
}

/**
 * Feed and page views per date, fetched once per Lambda run: retries and
 * later attempts reuse them instead of re-downloading (~10 s a date).
 */
const sourceCache = new Map();

async function sourcesFor(date, getFeed, getViews, callJudge) {
  if (!sourceCache.has(date)) {
    const load = (async () => {
      const [, month, day] = date.split('-').map(Number);
      const candidates = candidatesFrom(await getFeed(month, day));
      const views = await getViews([...new Set(candidates.map(c => c.title))]);
      return screened(famous(candidates, views), callJudge);
    })();
    sourceCache.set(date, load);
    // A failed fetch must not be cached: the next attempt should retry it.
    load.catch(() => sourceCache.delete(date));
  }
  return sourceCache.get(date);
}

export async function generateChronology(ctx, deps = {}) {
  const getFeed = deps.fetchOnThisDay ?? fetchOnThisDay;
  const getViews = deps.fetchMonthlyViews ?? fetchMonthlyViews;
  const pool = deps.fetchOnThisDay
    ? null
    : await sourcesFor(ctx.date, getFeed, getViews, ctx.callJudge);
  const candidates = pool ?? (await uncachedSources(ctx.date, getFeed, getViews, ctx.callJudge));
  // Every day, one or two of the six events have an Indian link when the
  // date has one that fits (most players are in India); otherwise any good set.
  const wantIndia = candidates.some(isIndian);
  let result;
  if (wantIndia) {
    try {
      result = await pickWithReuse(candidates, ctx, { needIndia: true });
    } catch {
      result = null;
    }
  }
  const { pick: picked, reused } = result ?? (await pickWithReuse(candidates, ctx));
  const events = derange(picked, ctx.rng).map(({ id, text, year, url }) => ({
    id,
    text,
    year,
    url,
  }));
  return {
    payload: { day: dayLabel(ctx.date), events },
    sourceKeys: events.map(e => `event:${e.id}`),
    summary:
      events
        .map(e => e.year)
        .sort((a, b) => a - b)
        .join(', ') + (reused ? ` (${reused} reused)` : ''),
  };
}
