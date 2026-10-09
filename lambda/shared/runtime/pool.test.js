import { describe, expect, it } from 'vitest';
import { pickFresh } from './pool.js';
import { createRng } from './random.js';

const items = ['a', 'b', 'c'];
const ctx = (used, recentByDays = {}) => ({
  rng: createRng(1),
  used: new Set(used),
  usedSince: async days => new Set(recentByDays[days] ?? used),
});

describe('pickFresh', () => {
  it('prefers anything never used', async () => {
    expect(await pickFresh(items, x => x, ctx(['a', 'b']))).toEqual({ item: 'c', reused: null });
  });

  it('reuses the least recently used tier when the pool is exhausted', async () => {
    const r = await pickFresh(
      items,
      x => x,
      ctx(['a', 'b', 'c'], { 365: ['a', 'b', 'c'], 180: ['a', 'c'] })
    );
    expect(r).toEqual({ item: 'b', reused: 180 });
  });

  it('never fails, even when everything was used recently', async () => {
    const r = await pickFresh(items, x => x, ctx(['a', 'b', 'c']));
    expect(items).toContain(r.item);
    expect(r.reused).toBe(0);
  });
});
