import { describe, expect, it } from 'vitest';
import { levelForXP, totalXP, xpForPlay } from './xp';

describe('xp', () => {
  it('scores a solve by hints, like the cryptic clue always has', () => {
    expect(xpForPlay({ outcome: 'solved', hints: 0 })).toBe(100);
    expect(xpForPlay({ outcome: 'solved', hints: 1 })).toBe(75);
    expect(xpForPlay({ outcome: 'solved', hints: 3 })).toBe(25);
    expect(xpForPlay({ outcome: 'solved', hints: 6 })).toBe(10);
  });

  it('gives a little for finishing and nothing for a reveal', () => {
    expect(xpForPlay({ outcome: 'failed', hints: 0 })).toBe(10);
    expect(xpForPlay({ outcome: 'revealed', hints: 0 })).toBe(0);
  });

  it('adds up every game and levels up on a widening curve', () => {
    expect(
      totalXP([
        { outcome: 'solved', hints: 0 },
        { outcome: 'solved', hints: 2 },
        { outcome: 'failed', hints: 1 },
      ])
    ).toBe(160);
    expect(levelForXP(0)).toBe(1);
    expect(levelForXP(50)).toBe(2);
    expect(levelForXP(200)).toBe(3);
  });
});
