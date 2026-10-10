import { fetchJson } from '../../shared/runtime/http.js';
import { cellNumber, readTables } from '../../shared/runtime/wikiTables.js';
import { indiaAwareQuery, themeFor } from './themes.js';

const SPARQL = 'https://query.wikidata.org/sparql';
const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php';
const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
export const ROUNDS = 5;
/** The best-known entries of a theme: the ones most players will have heard of. */
const DEFAULT_POOL_SIZE = 150;
/** Indian entries kept past the fame cap, so a chain can include a couple. */
const INDIA_EXTRA = 12;
/** Indian items in a chain of six: a few, never all. */
export const INDIAN_PER_CHAIN = 2;

/** Display units: SI values from Wikidata to what the game shows. */
const SCALE = { count: 1, area: 1e-6, metres: 1, kilometres: 1e-3, years: 1, usd: 1, inr: 1 };

/** Where an item's number comes from, for the 60-day rest. */
export const sourceKey = x => (x.source === 'wikipedia' ? `wp:${x.id}` : `wd:${x.id}`);

/** A theme's candidates, best known first, from Wikidata or a Wikipedia list. */
export function fetchPool(theme, deps = {}) {
  return theme.wikipedia ? fetchWikipediaPool(theme, deps) : fetchWikidataPool(theme, deps);
}

/** Keeps the best-known entries, plus a few Indian ones past the cap. */
function capped(theme, all) {
  const top = all.slice(0, theme.poolSize ?? DEFAULT_POOL_SIZE);
  const extra = all.filter(x => x.india && !top.includes(x)).slice(0, INDIA_EXTRA);
  return [...top, ...extra];
}

async function fetchWikidataPool(theme, { fetcher = fetchJson } = {}) {
  const url = `${SPARQL}?format=json&query=${encodeURIComponent(indiaAwareQuery(theme))}`;
  const data = await fetcher(url, {
    headers: { Accept: 'application/sparql-results+json' },
    timeoutMs: 60_000,
    retries: 2,
  });
  const seen = new Set();
  const all = (data?.results?.bindings ?? [])
    .map(b => ({
      id: b.item.value.split('/').pop(),
      name: b.itemLabel?.value ?? '',
      description: cleanDescription(b.itemDescription?.value),
      value: Number(b.value?.value) * SCALE[theme.format],
      links: Number(b.links?.value ?? 0),
      india: b.india?.value === 'true',
    }))
    .filter(x => x.name && !/^Q\d+$/.test(x.name) && Number.isFinite(x.value) && x.value > 0)
    .sort((a, b) => b.links - a.links)
    .filter(x => !seen.has(x.name) && seen.add(x.name));
  return capped(theme, all);
}

/** Footnote and status marks lists put after names: "Sachin Tendulkar ^", "Avatar †". */
export const cleanName = text =>
  String(text ?? '')
    .replace(/[†‡^ǂ*§#¶]+/g, '')
    .replace(/^["“”']+|["“”']+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const isIndia = cell =>
  !!cell && (cleanName(cell.text) === 'India' || cell.flags.includes('India'));

/**
 * A theme's candidates from a ranked Wikipedia list; a name in several of the
 * chosen tables counts once. Ranked by fame like the Wikidata themes (how
 * many Wikipedias cover each one), since a list's own order is by its number
 * and its long tail can be obscure. Descriptions come from each article's
 * short description, scrubbed like Wikidata's.
 */
async function fetchWikipediaPool(theme, { fetcher = fetchJson } = {}) {
  const cfg = theme.wikipedia;
  const page = await fetcher(
    `${WIKIPEDIA_API}?action=parse&format=json&formatversion=2&redirects=1&prop=text&page=${encodeURIComponent(cfg.page)}`,
    { timeoutMs: 30_000, retries: 2 }
  );
  const tables = readTables(page?.parse?.text ?? '');
  const headings = tables.map(t => t.heading);
  let chosen = tables.filter(t => cfg.table(t.heading, headings));
  if (cfg.newestFirst) chosen = chosen.reverse();
  const byId = new Map();
  for (const table of chosen) {
    const col = re => table.header.findIndex(h => re.test(h));
    const [nameAt, valueAt] = [col(cfg.name), col(cfg.value)];
    const indiaAt = cfg.india ? col(cfg.india) : -1;
    if (nameAt < 0 || valueAt < 0) continue;
    for (const row of table.rows) {
      const nameCell = row[nameAt];
      const name = cleanName(nameCell?.text);
      const value = cellNumber(row[valueAt]?.text) * (cfg.scale ?? 1);
      if (!name || !Number.isFinite(value) || value <= 0) continue;
      // Unlinked rows have no article to cite: skip them.
      if (cfg.exclude?.test(name) || !nameCell.link) continue;
      const id = nameCell.link;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        name,
        description: '',
        value,
        source: 'wikipedia',
        links: 0,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(id.replace(/ /g, '_'))}`,
        india: theme.countries ? name === 'India' : indiaAt >= 0 && isIndia(row[indiaAt]),
      });
    }
  }
  const all = [...byId.values()];
  await enrich(all, fetcher, { describe: theme.describe !== false });
  // Stable sort: equally famous rows keep the list's order.
  return capped(
    theme,
    all.sort((a, b) => b.links - a.links)
  );
}

/**
 * Fills in each item's short description and fame (Wikidata sitelinks),
 * 50 titles a request. Best-effort: a failed batch leaves its items plain.
 */
async function enrich(items, fetcher, { describe }) {
  const qids = new Map(); // QID → item
  for (let i = 0; i < items.length; i += 50) {
    const batch = items.slice(i, i + 50);
    const titles = batch.map(x => x.id).join('|');
    const data = await fetcher(
      `${WIKIPEDIA_API}?action=query&format=json&formatversion=2&redirects=1&prop=description%7Cpageprops&ppprop=wikibase_item&titles=${encodeURIComponent(titles)}`,
      { timeoutMs: 20_000, retries: 1 }
    ).catch(() => null);
    if (!data?.query) continue;
    // Requested title → final title, through normalisation and redirects.
    const final = new Map();
    for (const step of [...(data.query.normalized ?? []), ...(data.query.redirects ?? [])]) {
      final.set(step.from, step.to);
    }
    const resolve = t => (final.has(t) ? resolve(final.get(t)) : t);
    const pages = new Map((data.query.pages ?? []).map(p => [p.title, p]));
    for (const x of batch) {
      const page = pages.get(resolve(x.id));
      if (describe) x.description = cleanDescription(page?.description);
      const qid = page?.pageprops?.wikibase_item;
      if (qid) qids.set(qid, x);
    }
  }
  const ids = [...qids.keys()];
  for (let i = 0; i < ids.length; i += 50) {
    const data = await fetcher(
      `${WIKIDATA_API}?action=wbgetentities&format=json&props=sitelinks&ids=${ids.slice(i, i + 50).join('|')}`,
      { timeoutMs: 20_000, retries: 1 }
    ).catch(() => null);
    for (const [qid, entity] of Object.entries(data?.entities ?? {})) {
      const x = qids.get(qid);
      if (x) x.links = Object.keys(entity.sitelinks ?? {}).length;
    }
  }
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
  const words = String(text ?? '')
    .split(/[,;]\s*/)
    .filter(part => !SUPERLATIVE.test(part))
    .join(', ')
    // "(born 1992)", "(1925–2008)": a bracket holding a number goes whole.
    .replace(/\([^)]*\d[^)]*\)/g, '')
    .split(/\s+/);
  // Every number goes, except a name's single digit ("Maroon 5").
  const kept = words.map((word, i) => {
    if (!/\d/.test(word)) return word;
    const bare = word.replace(/[,;:]+$/, '');
    if (/^\d$/.test(bare) && /^\p{Lu}/u.test(words[i - 1] ?? '')) return word;
    return word.slice(bare.length);
  });
  let out = kept
    .join(' ')
    .replace(/\s+([,;:])/g, '$1')
    .replace(/^[\s,;:–-]+|[\s,;:–-]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  // Words left hanging by a removed number: "since", "from … to", "born".
  while (DANGLING.test(out)) out = out.replace(DANGLING, '').trim();
  if (!out || out.length > 90) return '';
  return out[0].toUpperCase() + out.slice(1);
}

const DANGLING = /[\s,]+(?:born|since|from|until|to|and|in|between|circa|c\.|–|-)$/i;

/** Whether b is a fair next step from a: clearly different, not wildly so. */
export function fairPair(theme, a, b) {
  const { minRatio, maxRatio } = eased(theme.close);
  const ratio = Math.max(a.value, b.value) / Math.min(a.value, b.value);
  return ratio >= minRatio && ratio <= maxRatio;
}

/**
 * Pairs a notch further apart than each theme's calibration, which players
 * found too close: the gap above 1 grows by half (1.12× → 1.18×), and the
 * upper bound by a fifth so a chain can still be built.
 */
export const EASE = 1.5;
function eased({ minRatio, maxRatio }) {
  const min = 1 + (minRatio - 1) * EASE;
  return { minRatio: min, maxRatio: Math.max(maxRatio * 1.2, min * 1.3) };
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

/**
 * A chain of ROUNDS + 1 items following the pattern, each step a fair pair,
 * with `INDIAN_PER_CHAIN` Indian items where the pool allows (fewer if it
 * can't: a theme with one Indian entry, like countries, gets that one).
 */
export function buildChain(theme, pool, rng, pattern) {
  const indianInPool = pool.filter(x => x.india).length;
  for (let want = Math.min(INDIAN_PER_CHAIN, indianInPool); want >= 0; want--) {
    for (let attempt = 0; attempt < 300; attempt++) {
      // Lean towards Indian items while the chain still needs them.
      const choose = (options, chain) => {
        const short = chain.filter(x => x.india).length < want;
        const indian = options.filter(x => x.india);
        return short && indian.length && rng.chance(0.6)
          ? pickFamous(rng, indian)
          : pickFamous(rng, options);
      };
      const chain = [];
      chain.push(choose(pool, chain));
      for (const dir of pattern) {
        const cur = chain[chain.length - 1];
        const options = pool.filter(
          x =>
            !chain.includes(x) && Math.sign(x.value - cur.value) === dir && fairPair(theme, cur, x)
        );
        if (!options.length) break;
        chain.push(choose(options, chain));
      }
      const indian = chain.filter(x => x.india).length;
      if (
        chain.length === ROUNDS + 1 &&
        indian >= want &&
        indian <= Math.max(want, INDIAN_PER_CHAIN)
      ) {
        return chain;
      }
    }
  }
  throw new Error(`could not build a ${theme.id} chain`);
}

const dayNumber = date => Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);

export async function generateHigherLower(ctx, deps = {}) {
  // The day's theme; a later attempt moves to the next one, in case a
  // query is failing today.
  const theme =
    deps.theme ?? themeFor(dayNumber(ctx.date) + Math.floor(((ctx.attempt ?? 1) - 1) / 2));
  const all = await (deps.fetchPool ?? fetchPool)(theme);
  const key = sourceKey;
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
      items: chain.map(({ id, name, description, value, url }) => ({
        id,
        name,
        description,
        value: Number(value.toPrecision(6)),
        url: url ?? `https://www.wikidata.org/wiki/${id}`,
      })),
    },
    sourceKeys: chain.map(key),
    summary: `${theme.id}: ${chain.map(x => x.name).join(' → ')}`,
  };
}
