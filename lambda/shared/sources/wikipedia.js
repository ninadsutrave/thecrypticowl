import { fetchJson } from '../runtime/http.js';

/**
 * Wikipedia and Wikidata, the factual ground for the AI-written games.
 *
 * Generators hand the model *only* text fetched here, and reviewers check
 * that every clue or question cites a sentence that really is in it. That
 * is what keeps a free, small model from inventing facts.
 *
 * Content is CC BY-SA: every puzzle stores and shows its source URL.
 */

const API = 'https://en.wikipedia.org/w/api.php';
const WIKIDATA = 'https://www.wikidata.org/w/api.php';
const REST = 'https://en.wikipedia.org/api/rest_v1';

/** Sections after these headings are lists and citations, not prose. */
const TAIL_SECTIONS =
  /\n(See also|References|Notes|Further reading|External links|Bibliography|Sources|Citations|Footnotes)\n/;

export function cleanExtract(text = '') {
  const cut = text.split(TAIL_SECTIONS)[0];
  return cut
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export async function fetchArticle(title, { fetcher = fetchJson } = {}) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    redirects: '1',
    prop: 'extracts|pageprops|pageviews|info',
    inprop: 'url',
    explaintext: '1',
    exsectionformat: 'plain',
    pvipdays: '30',
    titles: title,
  });
  const data = await fetcher(`${API}?${params}`);
  const page = data?.query?.pages?.[0];
  if (!page || page.missing || !page.extract)
    throw new Error(`Wikipedia has no article "${title}"`);
  const views = Object.values(page.pageviews ?? {}).reduce((a, b) => a + (b ?? 0), 0);
  return {
    title: page.title,
    url:
      page.fullurl ??
      `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
    text: cleanExtract(page.extract),
    wikidataId: page.pageprops?.wikibase_item ?? null,
    monthlyViews: views,
  };
}

/** English label plus "also known as" aliases from Wikidata. */
export async function fetchAliases(wikidataId, { fetcher = fetchJson } = {}) {
  if (!wikidataId) return [];
  const params = new URLSearchParams({
    action: 'wbgetentities',
    format: 'json',
    ids: wikidataId,
    props: 'labels|aliases',
    languages: 'en',
  });
  const data = await fetcher(`${WIKIDATA}?${params}`);
  const entity = data?.entities?.[wikidataId];
  const label = entity?.labels?.en?.value;
  const aliases = (entity?.aliases?.en ?? []).map(a => a.value);
  return [...new Set([label, ...aliases].filter(Boolean))];
}

/**
 * Page views over the last 30 days for up to 50 titles per request — a fame
 * filter: a puzzle about something nobody reads about is not medium, it's
 * unfair.
 */
export async function fetchMonthlyViews(titles, { fetcher = fetchJson } = {}) {
  const views = new Map();
  for (let i = 0; i < titles.length; i += 50) {
    const base = {
      action: 'query',
      format: 'json',
      formatversion: '2',
      prop: 'pageviews',
      pvipdays: '30',
      titles: titles.slice(i, i + 50).join('|'),
    };
    // The API returns views for only part of a batch per response and a
    // `continue` token for the rest. Ignoring it counted every later title
    // as unread, which filtered famous events out as obscure.
    let cont = {};
    for (let page = 0; page < 10; page++) {
      const data = await fetcher(`${API}?${new URLSearchParams({ ...base, ...cont })}`);
      const aliases = new Map(
        [...(data?.query?.normalized ?? []), ...(data?.query?.redirects ?? [])].map(n => [
          n.to,
          n.from,
        ])
      );
      for (const p of data?.query?.pages ?? []) {
        if (!p.pageviews) continue;
        const total = Object.values(p.pageviews).reduce((a, b) => a + (b ?? 0), 0);
        views.set(p.title, total);
        if (aliases.has(p.title)) views.set(aliases.get(p.title), total);
      }
      if (!data?.continue) break;
      cont = data.continue;
    }
  }
  return views;
}

/** Wikipedia's "On this day" feed for a month and day. */
export async function fetchOnThisDay(month, day, { fetcher = fetchJson } = {}) {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return fetcher(`${REST}/feed/onthisday/all/${mm}/${dd}`);
}

/**
 * A window of consecutive paragraphs, chosen by the seeded rng, so the same
 * article reused weeks later yields different facts.
 */
export function excerpt(text, rng, maxChars = 5000) {
  const paras = text.split(/\n+/).filter(p => p.trim().length > 60);
  if (paras.join('\n').length <= maxChars) return paras.join('\n');
  // Always include the lead: it carries the defining facts.
  const lead = paras[0];
  const body = paras.slice(1);
  const start = rng.int(0, Math.max(0, body.length - 1));
  const picked = [lead];
  for (let i = start; i < body.length && picked.join('\n').length < maxChars; i++) {
    picked.push(body[i]);
  }
  return picked.join('\n').slice(0, maxChars);
}

/** Normalise for "is this quoted sentence really in the source?" checks. */
export function normaliseText(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Whether `quote` appears in `source`: exactly after normalisation, or with
 * at least `minOverlap` of its words present in one window of the source —
 * models trim and lightly re-punctuate when they quote.
 */
export function isGrounded(quote, source, minOverlap = 0.85) {
  const q = normaliseText(quote);
  const s = normaliseText(source);
  if (!q || q.split(' ').length < 4) return false;
  if (s.includes(q)) return true;
  const words = q.split(' ');
  const sWords = s.split(' ');
  const set = new Set(words);
  const span = words.length * 2;
  for (let i = 0; i + 1 < sWords.length; i += Math.max(1, Math.floor(words.length / 2))) {
    const window = new Set(sWords.slice(i, i + span));
    let hit = 0;
    for (const w of set) if (window.has(w)) hit++;
    if (hit / set.size >= minOverlap) return true;
  }
  return false;
}
