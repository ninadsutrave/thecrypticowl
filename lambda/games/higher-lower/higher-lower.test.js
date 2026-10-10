import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRng } from '../../shared/runtime/random.js';
import {
  buildChain,
  cleanDescription,
  cleanName,
  directions,
  fairPair,
  fetchPool,
  generateHigherLower,
  INDIAN_PER_CHAIN,
  ROUNDS,
} from './generator.js';
import { reviewHigherLower } from './reviewer.js';
import { ROTATION, THEMES, themeFor } from './themes.js';

/** A snapshot of the stadium-capacity pool from Wikidata (150 stadiums). */
const POOL = JSON.parse(
  readFileSync(new URL('./fixtures/stadium-capacity.json', import.meta.url), 'utf8')
);
const stadium = THEMES.find(t => t.id === 'stadium-capacity');
const withUrl = x => ({ ...x, url: `https://www.wikidata.org/wiki/${x.id}` });

describe('themes', () => {
  it('rotate one per day, every theme once per cycle', () => {
    expect(new Set(ROTATION)).toEqual(new Set(THEMES));
    expect(ROTATION).toHaveLength(THEMES.length);
    expect(themeFor(0)).toBe(ROTATION[0]);
    expect(themeFor(ROTATION.length + 1)).toBe(ROTATION[1]);
    expect(themeFor(-1)).toBe(ROTATION[ROTATION.length - 1]);
  });

  it('never run two list themes and two data themes back to back in the same way', () => {
    // Places and sizes (Wikidata) are spread through the people/fame lists.
    const kinds = ROTATION.map(t => (t.wikipedia ? 'L' : 'D')).join('');
    expect(kinds).not.toMatch(/DD/);
  });

  it('are fully specified', () => {
    const formats = ['count', 'area', 'metres', 'kilometres', 'usd', 'inr', 'years'];
    expect(new Set(THEMES.map(t => t.id)).size).toBe(THEMES.length);
    for (const t of THEMES) {
      expect(formats).toContain(t.format);
      expect(t.close.minRatio).toBeGreaterThan(1);
      if (t.wikipedia) {
        expect(t.wikipedia.page).toBeTruthy();
        expect(typeof t.wikipedia.table).toBe('function');
        expect(t.wikipedia.name).toBeInstanceOf(RegExp);
        expect(t.wikipedia.value).toBeInstanceOf(RegExp);
      } else {
        expect(t.query).toMatch(/\?value/);
      }
    }
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
    expect(cleanDescription('35-time Grammy winner')).toBe('Grammy winner');
  });

  it("tidies what a removed number leaves behind, but keeps a name's digit", () => {
    expect(cleanDescription('American singer and actress (born 1992)')).toBe(
      'American singer and actress'
    );
    expect(cleanDescription('Prime Minister of India since 2014')).toBe('Prime Minister of India');
    expect(cleanDescription('President of the United States from 2009 to 2017')).toBe(
      'President of the United States'
    );
    expect(cleanDescription('2012 single by Maroon 5 featuring Wiz Khalifa')).toBe(
      'Single by Maroon 5 featuring Wiz Khalifa'
    );
  });
});

describe('cleanName', () => {
  it('drops list marks and quotes', () => {
    expect(cleanName('Sachin Tendulkar ^')).toBe('Sachin Tendulkar');
    expect(cleanName('Avatar †')).toBe('Avatar');
    expect(cleanName('"Blinding Lights"')).toBe('Blinding Lights');
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

describe('Indian items', () => {
  it('puts a couple in each chain, never all', () => {
    // Every fourth stadium marked Indian.
    const pool = POOL.map((x, i) => ({ ...x, india: i % 4 === 0 }));
    for (let i = 0; i < 20; i++) {
      const rng = createRng(`india-${i}`);
      const chain = buildChain(stadium, pool, rng, directions(rng));
      expect(chain.filter(x => x.india)).toHaveLength(INDIAN_PER_CHAIN);
    }
  });

  it('takes the one there is when a theme has a single Indian entry', () => {
    const pool = POOL.map((x, i) => ({ ...x, india: i === 3 }));
    const rng = createRng('one');
    const chain = buildChain(stadium, pool, rng, directions(rng));
    expect(chain.filter(x => x.india).length).toBeLessThanOrEqual(1);
  });
});

describe('review', () => {
  const items = POOL.slice(0, ROUNDS + 1).map(withUrl);
  const theme = 'stadium-capacity';

  it('accepts Wikipedia articles as sources', () => {
    const fromWikipedia = items.map((x, i) => ({
      ...x,
      url: `https://en.wikipedia.org/wiki/Stadium_${i}`,
    }));
    const { errors } = reviewHigherLower({ theme, items: fromWikipedia });
    expect(errors.filter(e => /source/.test(e))).toEqual([]);
  });

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

describe('fetchPool from a Wikipedia list', () => {
  const theme = THEMES.find(t => t.id === 'cricket-centuries');
  const row = (name, team, total, flag = team) =>
    `<tr><td>1</td><td><a href="/wiki/${name.replace(/ /g, '_')}">${name}</a> ^</td><td>2000–2010</td>` +
    `<td><span class="flagicon"><img alt="${flag}"></span> ${team}</td><td>1</td><td>2</td><td>0</td><td>${total}</td></tr>`;
  const html =
    `<h2>Men's international cricket</h2><table class="wikitable"><tr><th>Rank</th><th>Player</th><th>Period</th><th>Team</th><th>Test</th><th>ODI</th><th>T20I</th><th>Total</th></tr>` +
    row('Sachin Tendulkar', 'India', 100) +
    row('Ricky Ponting', 'Australia', 71) +
    `<tr><td>3</td><td>Unlinked Player</td><td>—</td><td>England</td><td>1</td><td>1</td><td>0</td><td>40</td></tr>` +
    `</table><h2>Women's international cricket</h2><table class="wikitable"><tr><th>Rank</th><th>Player</th><th>Total</th></tr><tr><td>1</td><td><a href="/wiki/Meg_Lanning">Meg Lanning</a></td><td>17</td></tr></table>`;
  const fetcher = async url => {
    if (url.includes('action=parse')) return { parse: { text: html } };
    if (url.includes('action=query')) {
      return {
        query: {
          pages: [
            {
              title: 'Sachin Tendulkar',
              description: 'Indian cricketer (born 1973)',
              pageprops: { wikibase_item: 'Q9488' },
            },
            {
              title: 'Ricky Ponting',
              description: 'Australian cricketer',
              pageprops: { wikibase_item: 'Q369473' },
            },
          ],
        },
      };
    }
    // Wikidata sitelinks: Ponting better known here, so he ranks first.
    return {
      entities: {
        Q9488: { sitelinks: { a: 1, b: 1 } },
        Q369473: { sitelinks: { a: 1, b: 1, c: 1 } },
      },
    };
  };

  it('reads the chosen table, skips unlinked rows, and ranks by fame', async () => {
    const pool = await fetchPool(theme, { fetcher });
    expect(pool.map(x => x.name)).toEqual(['Ricky Ponting', 'Sachin Tendulkar']);
    const sachin = pool[1];
    expect(sachin).toMatchObject({
      id: 'Sachin Tendulkar',
      value: 100,
      india: true,
      description: 'Indian cricketer',
      url: 'https://en.wikipedia.org/wiki/Sachin_Tendulkar',
    });
    expect(pool[0].india).toBe(false);
  });
});

describe('fetchPool from Wikidata', () => {
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
