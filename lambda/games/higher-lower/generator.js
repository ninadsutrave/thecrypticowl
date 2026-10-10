import { fetchJson } from '../../shared/runtime/http.js';
import { themeFor } from './themes.js';

const SPARQL = 'https://query.wikidata.org/sparql';
export const ROUNDS = 5;
/** The best-known entries of a theme: the ones most players will have heard of. */
const DEFAULT_POOL_SIZE = 150;

/** Display units: SI values from Wikidata to what the game shows. */
const SCALE = { count: 1, area: 1e-6, metres: 1, kilometres: 1e-3 };

export async function fetchPool(theme, { fetcher = fetchJson } = {}) {
  const url = `${SPARQL}?format=json&query=${encodeURIComponent(theme.query)}`;
  const data = await fetcher(url, {
    headers: { Accept: 'application/sparql-results+json' },
    timeoutMs: 60_000,
    retries: 2,
  });
  const seen = new Set();
  return (data?.results?.bindings ?? [])
    .map(b => ({
      id: b.item.value.split('/').pop(),
      name: b.itemLabel?.value ?? '',
      description: cleanDescription(b.itemDescription?.value),
      value: Number(b.value?.value) * SCALE[theme.format],
      links: Number(b.links?.value ?? 0),
    }))
    .filter(x => x.name && !/^Q\d+$/.test(x.name) && Number.isFinite(x.value) && x.value > 0)
    .sort((a, b) => b.links - a.links)
    .filter(x => !seen.has(x.name) && seen.add(x.name))
    .slice(0, theme.poolSize ?? DEFAULT_POOL_SIZE);
}

/** Rankings that would answer the question for the player. */
const SUPERLATIVE =
  /\b(largest|biggest|highest|tallest|longest|smallest|shortest|lowest|oldest|newest|most populous|least populous|most populated|first|second|third)\b/i;

/**
 * Wikidata's one-line description, minus anything that gives the answer
 * away: numbers ("1995 film by David Fincher" → "Film by David Fincher")
 * and any clause with a ranking ("…, the largest in the world by area").
 * Empty when nothing safe is left; kept short enough for a card.
 */
export function cleanDescription(text) {
  const out = String(text ?? '')
    .split(/[,;]\s*/)
    .filter(part => !SUPERLATIVE.test(part))
    .join(', ')
    .replace(/\(?[^\s()]*\d[^\s()]*\)?/g, '')
    .replace(/\s+([,;:])/g, '$1')
    .replace(/^[\s,;:–-]+|[\s,;:–-]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!out || out.length > 90) return '';
  return out[0].toUpperCase() + out.slice(1);
}

/** Whether b is a fair next step from a: clearly different, not wildly so. */
export function fairPair(theme, a, b) {
  const { minRatio, maxRatio } = theme.close;
  const ratio = Math.max(a.value, b.value) / Math.min(a.value, b.value);
  return ratio >= minRatio && ratio <= maxRatio;
}

/** How many answers may go up: 2–3 of five, so neither call dominates. */
export const UPS = [Math.floor(ROUNDS * 0.4), Math.ceil(ROUNDS * 0.6)];

/**
 * Up/down pattern for the day: a fair mix, never more than three the same
 * way in a row, so guessing one direction all game doesn't pay.
 */
export function directions(rng) {
  for (;;) {
    const d = Array.from({ length: ROUNDS }, () => (rng.chance(0.5) ? 1 : -1));
    const ups = d.filter(x => x > 0).length;
    const longRun = d.some((x, i) => i >= 3 && d[i - 1] === x && d[i - 2] === x && d[i - 3] === x);
    if (ups >= UPS[0] && ups <= UPS[1] && !longRun) return d;
  }
}

/**
 * Pick from a list sorted best-known first, leaning towards the front: half
 * the picks come from the top quarter, so most rounds feature things people
 * have heard of, with the occasional deeper cut.
 */
const pickFamous = (rng, list) => list[Math.floor(rng.next() ** 2 * list.length)];

/** A chain of ROUNDS + 1 items following the pattern, each step a fair pair. */
export function buildChain(theme, pool, rng, pattern) {
  for (let attempt = 0; attempt < 300; attempt++) {
    const chain = [pickFamous(rng, pool)];
    for (const dir of pattern) {
      const cur = chain[chain.length - 1];
      const options = pool.filter(
        x => !chain.includes(x) && Math.sign(x.value - cur.value) === dir && fairPair(theme, cur, x)
      );
      if (!options.length) break;
      chain.push(pickFamous(rng, options));
    }
    if (chain.length === ROUNDS + 1) return chain;
  }
  throw new Error(`could not build a ${theme.id} chain`);
}

const dayNumber = date => Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);

export async function generateHigherLower(ctx, deps = {}) {
  // The day's theme; a later attempt moves to the next one, in case a
  // query is failing today.
  const theme = themeFor(dayNumber(ctx.date) + Math.floor(((ctx.attempt ?? 1) - 1) / 2));
  const all = await (deps.fetchPool ?? fetchPool)(theme);
  const key = x => `wd:${x.id}`;
  const fresh = all.filter(x => !ctx.used.has(key(x)));
  // Prefer items not seen lately; if that leaves too few, use them all.
  // (A theme comes round every eight days and uses six items, so a 60-day
  // rest takes about 45 out of a pool of 80–150.)
  const pool = fresh.length >= 30 ? fresh : all;
  const chain = buildChain(theme, pool, ctx.rng, directions(ctx.rng));
  return {
    payload: {
      theme: theme.id,
      title: theme.title,
      noun: theme.noun,
      higher: theme.higher,
      lower: theme.lower,
      format: theme.format,
      items: chain.map(({ id, name, description, value }) => ({
        id,
        name,
        description,
        value: Number(value.toPrecision(6)),
        url: `https://www.wikidata.org/wiki/${id}`,
      })),
    },
    sourceKeys: chain.map(key),
    summary: `${theme.id}: ${chain.map(x => x.name).join(' → ')}`,
  };
}
