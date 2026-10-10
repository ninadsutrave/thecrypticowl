import { describe, expect, it } from 'vitest';
import { createRng } from './random.js';
import { INDIA_QUOTE_SHARE, INDIA_SHARE, isIndiaDay, poolForDay } from './india.js';

const items = ['a', 'b', 'c', 'IN1', 'IN2'];
const indian = x => x.startsWith('IN');
const key = x => x;
const ctxWith = (used, chance) => ({ used: new Set(used), rng: { chance: () => chance } });

describe('poolForDay', () => {
  it('gives the Indian items on an India day, the rest otherwise', () => {
    expect(poolForDay(items, indian, key, ctxWith([], true))).toEqual(['IN1', 'IN2']);
    expect(poolForDay(items, indian, key, ctxWith([], false))).toEqual(['a', 'b', 'c']);
  });

  it('falls back to the rest once every Indian item is used', () => {
    expect(poolForDay(items, indian, key, ctxWith(['IN1', 'IN2'], true))).toEqual(['a', 'b', 'c']);
  });

  it('never returns an empty pool when one side is missing', () => {
    expect(poolForDay(['IN1'], indian, key, ctxWith([], false))).toEqual(['IN1']);
    expect(poolForDay(['a'], indian, key, ctxWith([], true))).toEqual(['a']);
  });
});

describe('isIndiaDay', () => {
  it('lands near five days in eight, and two in ten for quotes', () => {
    const count = share =>
      Array.from({ length: 4000 }, (_, i) => isIndiaDay(createRng(`d${i}`), share)).filter(Boolean)
        .length / 4000;
    expect(count(INDIA_SHARE)).toBeCloseTo(0.625, 1);
    expect(count(INDIA_QUOTE_SHARE)).toBeCloseTo(0.2, 1);
  });
});
