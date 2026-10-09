import { describe, expect, it } from 'vitest';
import { createRng } from '../../shared/runtime/random.js';
import { generateSudoku, killerCages, randomRegions } from './generator.js';
import { judgeSudoku } from './judge.js';
import { reviewSudoku } from './reviewer.js';
import { solve } from './solver.js';
import { WEEKLY_ROTATION } from './variants.js';

describe('every weekday variant', () => {
  for (const variant of WEEKLY_ROTATION) {
    it(`${variant}: generates a unique, rule-abiding, medium puzzle`, () => {
      const p = generateSudoku(variant, createRng(`test:${variant}`));
      const review = reviewSudoku(p);
      expect(review.errors).toEqual([]);
      const verdict = judgeSudoku(p);
      expect(verdict.ok).toBe(true);
    });
  }
});

describe('reviewer', () => {
  const p = generateSudoku('killer', createRng('review'));

  it('catches a given that disagrees with the solution', () => {
    const cell = Object.keys(p.givens)[0];
    const bad = { ...p, givens: { ...p.givens, [cell]: (p.givens[cell] % 6) + 1 } };
    expect(reviewSudoku(bad).ok).toBe(false);
  });

  it('catches a cage sum that the solution breaks', () => {
    const cages = p.cages.map((c, i) => (i === 0 ? { ...c, sum: c.sum + 1 } : c));
    expect(reviewSudoku({ ...p, cages }).errors.join()).toMatch(/cage/);
  });
});

describe('judge', () => {
  it('rejects a puzzle with more than one solution', () => {
    const p = generateSudoku('diagonal', createRng('judge'));
    expect(judgeSudoku({ ...p, givens: {} }).ok).toBe(false);
  });
});

describe('building blocks', () => {
  it('cages partition the grid without repeating a digit', () => {
    const grid = solve(
      { size: 6, boxRows: 2, boxCols: 3, givens: {} },
      { limit: 1, rng: createRng(3) }
    ).solutions[0];
    const cages = killerCages(grid, createRng(4));
    expect(cages.flatMap(c => c.cells).sort((a, b) => a - b)).toEqual([...Array(36).keys()]);
    for (const c of cages) expect(new Set(c.cells.map(i => grid[i])).size).toBe(c.cells.length);
  });

  it('grows six regions of six cells', () => {
    const regions = randomRegions(6, createRng(5));
    const counts = regions.reduce((m, r) => m.set(r, (m.get(r) ?? 0) + 1), new Map());
    expect([...counts.values()]).toEqual([6, 6, 6, 6, 6, 6]);
  });
});
