import { describe, expect, it } from 'vitest';
import { createRng } from '../../shared/runtime/random.js';
import { isValidKey, makeKey, pickGivens } from './cipher.js';
import { INDIAN_QUOTES, QUOTES } from './quotes.js';
import { isSuitable, reviewCryptogram } from './reviewer.js';
import { spec } from './index.js';

describe('quote pool', () => {
  it('has unique ids and full attribution', () => {
    expect(new Set(QUOTES.map(q => q.id)).size).toBe(QUOTES.length);
    for (const q of QUOTES) {
      expect(q.author).toBeTruthy();
      expect(q.source.url).toMatch(/^https:\/\//);
    }
  });

  it('has enough usable quotes for months of puzzles', () => {
    expect(QUOTES.filter(q => isSuitable(q.text)).length).toBeGreaterThanOrEqual(90);
  });

  it('has Indian quotes, all usable, attributed and distinct from the rest', () => {
    const ids = new Set(QUOTES.map(q => q.id));
    expect(INDIAN_QUOTES.length).toBeGreaterThanOrEqual(40);
    for (const q of INDIAN_QUOTES) {
      expect(q.india).toBe(true);
      expect(isSuitable(q.text)).toBe(true);
      expect(q.source.url).toMatch(/^https:\/\//);
      expect(ids.has(q.id)).toBe(false);
    }
    expect(new Set(INDIAN_QUOTES.map(q => q.id)).size).toBe(INDIAN_QUOTES.length);
  });
});

describe('cipher', () => {
  it('never maps a letter to itself', () => {
    for (let s = 0; s < 20; s++) expect(isValidKey(makeKey(createRng(s)))).toBe(true);
  });

  it('gives four letters, never the commonest', () => {
    const text = 'EARLY TO BED AND EARLY TO RISE, MAKES A MAN HEALTHY, WEALTHY, AND WISE.';
    const given = pickGivens(text, createRng(1));
    expect(given).toHaveLength(4);
    expect(given).not.toContain('A');
  });
});

describe('generate + review', () => {
  it('produces a reviewable puzzle and skips used quotes', async () => {
    const used = new Set(QUOTES.slice(1).map(q => `quote:${q.id}`));
    const c = await spec.generate({ rng: createRng(2), used, usedSince: async () => used });
    expect(c.sourceKeys).toEqual([`quote:${QUOTES[0].id}`]);
    expect(reviewCryptogram(c)).toMatchObject({ ok: true });
  });

  it('rejects a key that leaves a letter in place', async () => {
    const c = await spec.generate({
      rng: createRng(3),
      used: new Set(),
      usedSince: async () => new Set(),
    });
    expect(
      reviewCryptogram({ payload: { ...c.payload, key: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' } }).ok
    ).toBe(false);
  });
});
