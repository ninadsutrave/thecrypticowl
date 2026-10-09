import { describe, expect, it } from 'vitest';
import { createRng } from '../../shared/runtime/random.js';
import { generateSlitherlink } from './generator.js';
import { judgeSlitherlink } from './judge.js';
import { cellCounts, fromBits, isSingleLoop, makeGrid } from './model.js';
import { reviewSlitherlink } from './reviewer.js';
import { solve } from './solver.js';

describe('the grid', () => {
  it('numbers edges and finds a single loop', () => {
    const g = makeGrid(2, 2);
    expect(g.edges).toBe(12);
    // The outline of the whole 2×2 grid.
    const on = new Array(g.edges).fill(0);
    [
      g.h(0, 0),
      g.h(0, 1),
      g.h(2, 0),
      g.h(2, 1),
      g.v(0, 0),
      g.v(1, 0),
      g.v(0, 2),
      g.v(1, 2),
    ].forEach(e => (on[e] = 1));
    expect(isSingleLoop(g, on)).toBe(true);
    expect(cellCounts(g, on)).toEqual([2, 2, 2, 2]);
    on[g.v(0, 1)] = 1;
    expect(isSingleLoop(g, on)).toBe(false);
  });
});

describe('the solver', () => {
  it('solves a tiny puzzle uniquely', () => {
    // 2×2, loop around the top-left cell only.
    const g = makeGrid(2, 2);
    const r = solve(g, [4, 1, 1, 0]);
    expect(r.count).toBe(1);
    expect(cellCounts(g, r.solutions[0])).toEqual([4, 1, 1, 0]);
  });
});

describe('a generated slitherlink', () => {
  const p = generateSlitherlink(createRng('slither-test'));

  it('passes review and the judge', () => {
    expect(reviewSlitherlink(p).errors).toEqual([]);
    expect(judgeSlitherlink(p).ok).toBe(true);
  });

  it('generates reliably', () => {
    for (let i = 0; i < 5; i++)
      expect(() => generateSlitherlink(createRng(`s-${i}`))).not.toThrow();
  });

  it('rejects a wrong clue or a broken loop', () => {
    const i = [...p.clues].findIndex(ch => ch !== '.');
    const wrong = p.clues.slice(0, i) + String((Number(p.clues[i]) + 1) % 4) + p.clues.slice(i + 1);
    expect(reviewSlitherlink({ ...p, clues: wrong }).ok).toBe(false);
    const on = fromBits(p.solution);
    on[on.indexOf(1)] = 0;
    expect(reviewSlitherlink({ ...p, solution: on.join('') }).ok).toBe(false);
  });
});
