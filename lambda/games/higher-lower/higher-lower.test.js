import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRng } from '../../shared/runtime/random.js';
import {
  buildChain,
  cleanDescription,
  directions,
  fairPair,
  fetchPool,
  generateHigherLower,
  ROUNDS,
} from './generator.js';
import { reviewHigherLower } from './reviewer.js';
import { THEMES, themeFor } from './themes.js';

/** A snapshot of the stadium-capacity pool from Wikidata (150 stadiums). */
const POOL = JSON.parse(
  readFileSync(new URL('./fixtures/stadium-capacity.json', import.meta.url), 'utf8')
);
const stadium = THEMES.find(t => t.id === 'stadium-capacity');
const withUrl = x => ({ ...x, url: `https://www.wikidata.org/wiki/${x.id}` });

describe('themes', () => {
  it('rotate one per day', () => {
    expect(themeFor(0)).toBe(THEMES[0]);
    expect(themeFor(THEMES.length + 1)).toBe(THEMES[1]);
    expect(themeFor(-1)).toBe(THEMES[THEMES.length - 1]);
  });

  it('compare sizes and counts, never dates (that is Chronology)', () => {
    for (const t of THEMES) expect(t.format).not.toBe('year');
  });
});

describe('cleanDescription', () => {
  it('drops numbers and rankings that would give the answer away', () => {
    expect(cleanDescription('1995 film by David Fincher')).toBe('Film by David Fincher');
    expect(cleanDescription('skyscraper in Dubai, UAE (2010)')).toBe('Skyscraper in Dubai, UAE');
    expect(cleanDescription('capital of Japan')).toBe('Capital of Japan');
    expect(cleanDescription('country in Eastern Europe, the largest in the world by area')).toBe(
      'Country in Eastern Europe'
    );
    expect(cleanDescription('highest mountain in the Alps')).toBe('');
    expect(cleanDescription('')).toBe('');
  });
});

describe('fair pairs', () => {
  const city = THEMES.find(t => t.id === 'city-population');
  it('need values clearly apart but not absurdly so', () => {
    expect(fairPair(city, { value: 100 }, { value: 105 })).toBe(false);
    expect(fairPair(city, { value: 100 }, { value: 150 })).toBe(true);
    expect(fairPair(city, { value: 100 }, { value: 500 })).toBe(false);
  });
});

describe('directions', () => {
  it('mix both answers over five rounds, never four the same way in a row', () => {
    for (let i = 0; i < 50; i++) {
      const d = directions(createRng(`dir-${i}`));
      expect(d).toHaveLength(ROUNDS);
      const ups = d.filter(x => x > 0).length;
      expect(ups).toBeGreaterThanOrEqual(2);
      expect(ups).toBeLessThanOrEqual(3);
      expect(d.map(x => (x > 0 ? 'U' : 'D')).join('')).not.toMatch(/UUUU|DDDD/);
    }
  });
});

describe('chains', () => {
  it('follow the pattern with fair steps', () => {
    const rng = createRng('chain');
    const pattern = directions(rng);
    const chain = buildChain(stadium, POOL, rng, pattern);
    expect(chain).toHaveLength(ROUNDS + 1);
    chain.slice(1).forEach((x, i) => expect(Math.sign(x.value - chain[i].value)).toBe(pattern[i]));
  });

  it('generates a full puzzle from a pool, avoiding recently used items', async () => {
    const used = new Set(POOL.slice(0, 30).map(x => `wd:${x.id}`));
    const base = Math.floor(Date.parse('2026-10-14T00:00:00Z') / 86_400_000);
    const k = THEMES.findIndex((_, i) => themeFor(base + i) === stadium);
    const date = new Date((base + k) * 86_400_000).toISOString().slice(0, 10);
    const c = await generateHigherLower(
      { date, attempt: 1, rng: createRng(9), used },
      { fetchPool: async () => POOL }
    );
    expect(c.payload.theme).toBe('stadium-capacity');
    expect(reviewHigherLower(c.payload).errors).toEqual([]);
    expect(c.sourceKeys.some(key => used.has(key))).toBe(false);
  });
});

describe('review', () => {
  const items = POOL.slice(0, ROUNDS + 1).map(withUrl);
  const theme = 'stadium-capacity';

  it('rejects ties, repeats, missing sources and unknown themes', () => {
    const tie = items.map((x, i) => (i === 1 ? { ...x, value: items[0].value } : x));
    expect(reviewHigherLower({ theme, items: tie }).errors.join(' ')).toMatch(/tie/);
    const repeat = items.map((x, i) => (i === 2 ? items[0] : x));
    expect(reviewHigherLower({ theme, items: repeat }).errors.join(' ')).toMatch(/repeats/);
    const noSource = items.map((x, i) => (i === 3 ? { ...x, url: '' } : x));
    expect(reviewHigherLower({ theme, items: noSource }).ok).toBe(false);
    expect(reviewHigherLower({ theme: 'nope', items }).ok).toBe(false);
  });
});

describe('fetchPool', () => {
  it('drops unnamed items, converts units and keeps the best known', async () => {
    const area = THEMES.find(t => t.id === 'country-area');
    const b = (id, label, value, links) => ({
      item: { value: `http://www.wikidata.org/entity/${id}` },
      itemLabel: { value: label },
      value: { value: String(value) },
      links: { value: String(links) },
    });
    const pool = await fetchPool(area, {
      fetcher: async () => ({
        results: {
          bindings: [
            b('Q1', 'Smallland', 2e9, 10),
            b('Q2', 'Q2', 5e9, 300),
            b('Q3', 'Bigland', 9e12, 200),
          ],
        },
      }),
    });
    expect(pool.map(x => x.name)).toEqual(['Bigland', 'Smallland']);
    expect(pool[0].value).toBe(9e6); // m² → km²
  });
});
