import { describe, expect, it, vi } from 'vitest';
import { createRng } from '../../shared/runtime/random.js';
import { reviewChronology } from './reviewer.js';
import {
  closePairs,
  dayLabel,
  famous,
  generateChronology,
  isIndian,
  normaliseEntry,
  pickEvents,
} from './selector.js';

const page = title => ({
  title,
  content_urls: { desktop: { page: `https://en.wikipedia.org/wiki/${title}` } },
});

describe('normaliseEntry', () => {
  it('turns a birth into a sentence without its death year', () => {
    const e = normaliseEntry(
      { year: 1940, text: 'John Lennon, English musician (d. 1980)', pages: [page('John_Lennon')] },
      'births'
    );
    expect(e.text).toBe('John Lennon, English musician, is born');
  });

  it('drops entries that give the year away or are grim', () => {
    expect(
      normaliseEntry(
        { year: 1990, text: 'The 1990 World Cup final is played in Rome', pages: [page('x')] },
        'events'
      )
    ).toBeNull();
    expect(
      normaliseEntry(
        { year: 1990, text: 'A bombing in the capital shocks the nation', pages: [page('x')] },
        'events'
      )
    ).toBeNull();
  });
});

describe('selection', () => {
  const years = [1446, 1701, 1874, 1888, 1940, 1962, 1600, 1750, 1820, 1999];
  const feed = {
    events: years.map(y => ({
      year: y,
      text: `A notable thing happened somewhere famous, number ${String.fromCharCode(65 + (y % 26))}`,
      pages: [page(`P${y}`)],
    })),
  };
  const views = new Map(years.map(y => [`P${y}`, 50_000]));

  it('picks six famous events with two close pairs, none starting in place', async () => {
    const c = await generateChronology(
      { date: '2026-10-09', rng: createRng(1), used: new Set() },
      { fetchOnThisDay: async () => feed, fetchMonthlyViews: async () => views }
    );
    expect(c.payload.day).toBe('9 October');
    expect(c.payload.events).toHaveLength(6);
    expect(closePairs(c.payload.events.map(e => e.year))).toBeGreaterThanOrEqual(2);
    expect(reviewChronology(c)).toMatchObject({ ok: true });
    expect(c.payload.events[0]).not.toHaveProperty('title');
  });

  it('filters out obscure entries', () => {
    const cands = [
      { title: 'A', kind: 'birth' },
      { title: 'B', kind: 'event' },
    ];
    expect(
      famous(
        cands,
        new Map([
          ['A', 1000],
          ['B', 5000],
        ])
      ).map(c => c.title)
    ).toEqual(['B']);
  });

  describe('reusing old events', () => {
    const key = y => `event:${y}-p${y}`;
    const sources = { fetchOnThisDay: async () => feed, fetchMonthlyViews: async () => views };
    const run = (used, usedSince) =>
      generateChronology(
        { date: '2026-10-09', rng: createRng(7), used: new Set(used.map(key)), usedSince },
        sources
      );

    it('uses only fresh events while there are enough', async () => {
      const usedSince = vi.fn();
      const c = await run([1446, 1999], usedSince);
      expect(usedSince).not.toHaveBeenCalled();
      expect(c.summary).not.toMatch(/reused/);
    });

    it('tops up a short date with at most two events not used in three years', async () => {
      const used = [1446, 1701, 1874, 1888, 1940, 1962];
      const c = await run(used, async () => new Set());
      const reused = c.payload.events.filter(e => used.includes(e.year));
      expect(reused.length).toBeGreaterThan(0);
      expect(reused.length).toBeLessThanOrEqual(2);
      expect(c.summary).toMatch(/\(\d reused\)/);
    });

    it('never reuses an event inside the window, stepping down to shorter ones', async () => {
      const all = years;
      const recentWithin = days => async d => new Set(d > days ? all.map(key) : []);
      const c = await run(all, recentWithin(365));
      expect(c.payload.events).toHaveLength(6);
      await expect(run(all, async () => new Set(all.map(key)))).rejects.toThrow();
    });

    it('fails as before when the handler gives no reuse history', async () => {
      await expect(run(years, undefined)).rejects.toThrow(/fresh events/);
    });
  });

  it('labels the day', () => {
    expect(dayLabel('2026-03-01')).toBe('1 March');
  });
});

describe('suitability screen', () => {
  const years = [1446, 1701, 1874, 1888, 1940, 1962, 1600, 1750, 1820, 1999];
  const feed = {
    events: years.map(y => ({
      year: y,
      text: `A notable thing happened somewhere famous, number ${String.fromCharCode(65 + (y % 26))}`,
      pages: [page(`P${y}`)],
    })),
  };
  const views = new Map(years.map(y => [`P${y}`, 50_000]));
  const deps = { fetchOnThisDay: async () => feed, fetchMonthlyViews: async () => views };

  it('picks only events the judge marks suitable', async () => {
    // Mark the 1999 event unsuitable.
    const callJudge = vi.fn(async prompt => ({
      verdicts: prompt
        .split('\n')
        .map((line, index) => ({ index, suitable: !line.includes('number X') })),
    }));
    const c = await generateChronology(
      { date: '2026-10-09', rng: createRng(1), used: new Set(), callJudge },
      deps
    );
    expect(callJudge).toHaveBeenCalledTimes(1);
    expect(c.payload.events.map(e => e.year)).not.toContain(1999);
  });

  it('falls back to keyword filters when the judge fails', async () => {
    const callJudge = vi.fn(async () => {
      throw new Error('timeout');
    });
    const c = await generateChronology(
      { date: '2026-10-09', rng: createRng(1), used: new Set(), callJudge },
      deps
    );
    expect(c.payload.events).toHaveLength(6);
  });

  it('falls back when the judge leaves too few to build a puzzle', async () => {
    const callJudge = vi.fn(async () => ({ verdicts: [{ index: 0, suitable: true }] }));
    const c = await generateChronology(
      { date: '2026-10-09', rng: createRng(1), used: new Set(), callJudge },
      deps
    );
    expect(c.payload.events).toHaveLength(6);
  });
});

describe('India days', () => {
  const ev = (year, text, kind = 'event') => ({
    id: `${year}-x`,
    year,
    text,
    title: `P${year}`,
    kind,
  });
  const pool = [
    ev(1446, 'A treaty is signed in Venice'),
    ev(1701, 'A university is founded in Connecticut'),
    ev(1874, 'A bridge opens in St. Louis'),
    ev(1888, 'A tower is completed in Paris'),
    ev(1940, 'A film premieres in New York'),
    ev(1962, 'A satellite is launched from Florida'),
    ev(1600, 'A trading company is chartered in London'),
    ev(1950, 'The Constitution of India comes into force'),
  ];

  it('recognises an Indian link in the text', () => {
    expect(isIndian(pool[7])).toBe(true);
    expect(isIndian(pool[0])).toBe(false);
  });

  it('always includes an Indian event when asked to', () => {
    for (let i = 0; i < 20; i++) {
      const pick = pickEvents(pool, createRng(`india-${i}`), new Set(), { needIndia: true });
      expect(pick.some(isIndian)).toBe(true);
    }
  });
});
