import { describe, expect, it } from 'vitest';
import { createRng } from '../../shared/runtime/random.js';
import { generateShikaku, partition, SIZE } from './generator.js';
import { judgeShikaku } from './judge.js';
import { reviewShikaku } from './reviewer.js';
import { candidatesFor, solve } from './solver.js';

describe('partition', () => {
  it('cuts the grid into rectangles of 2–12 cells with no gaps', () => {
    const rects = partition(createRng('part'));
    expect(rects.reduce((s, r) => s + r.h * r.w, 0)).toBe(SIZE * SIZE);
    for (const r of rects) {
      expect(r.h * r.w).toBeGreaterThanOrEqual(2);
      expect(r.h * r.w).toBeLessThanOrEqual(12);
    }
  });
});

describe('candidates', () => {
  it('lists every rectangle of the clue area that holds only that clue', () => {
    // A 2 in a corner of an empty 5×5: right or down.
    const list = candidatesFor(5, [{ r: 0, c: 0, n: 2 }]);
    expect(list[0]).toEqual(
      expect.arrayContaining([
        { r: 0, c: 0, h: 1, w: 2 },
        { r: 0, c: 0, h: 2, w: 1 },
      ])
    );
    expect(list[0]).toHaveLength(2);
  });
});

describe('a generated shikaku', () => {
  const p = generateShikaku(createRng('shikaku-test'));

  it('passes review and the judge', () => {
    expect(reviewShikaku(p).errors).toEqual([]);
    expect(judgeShikaku(p).ok).toBe(true);
  });

  it('has exactly one solution', () => {
    expect(solve(p, { limit: 2 }).count).toBe(1);
  });

  it('generates reliably', () => {
    for (let i = 0; i < 10; i++) {
      expect(() => generateShikaku(createRng(`seed-${i}`))).not.toThrow();
    }
  });
});

describe('review and judge catch bad puzzles', () => {
  const p = generateShikaku(createRng('shikaku-bad'));

  it('rejects a clue whose number is not its area', () => {
    const clues = p.clues.map((k, i) => (i === 0 ? { ...k, n: k.n + 1 } : k));
    expect(reviewShikaku({ ...p, clues }).ok).toBe(false);
  });

  it('rejects overlapping or missing rectangles', () => {
    const solution = p.solution.map((r, i) => (i === 0 ? { ...r, w: r.w + 1 } : r));
    expect(reviewShikaku({ ...p, solution }).ok).toBe(false);
    expect(reviewShikaku({ ...p, solution: p.solution.slice(1) }).ok).toBe(false);
  });

  it('rejects a stored solution that is not the unique one', () => {
    const solution = [...p.solution].reverse();
    expect(judgeShikaku({ ...p, solution }).ok).toBe(false);
  });
});
