import { describe, expect, it } from 'vitest';
import { cageOutline, findConflicts, matchesSolution } from './logic';
import { SAMPLE_SUDOKU } from './sample';

const solved = [...SAMPLE_SUDOKU.solution].map(Number);

describe('the sample Killer sudoku', () => {
  it('has a solution that breaks no rule', () => {
    expect(findConflicts(solved, SAMPLE_SUDOKU).size).toBe(0);
  });

  it('cages every cell exactly once', () => {
    const cells = (SAMPLE_SUDOKU.cages ?? []).flatMap(c => c.cells).sort((a, b) => a - b);
    expect(cells).toEqual(Array.from({ length: 36 }, (_, i) => i));
  });

  it('gives starting digits that agree with the solution', () => {
    for (const [cell, digit] of Object.entries(SAMPLE_SUDOKU.givens)) {
      expect(SAMPLE_SUDOKU.solution[Number(cell)]).toBe(String(digit));
    }
  });
});

describe('findConflicts', () => {
  it('flags a repeated digit in a row', () => {
    const values = Array(36).fill(0);
    values[0] = 3;
    values[4] = 3;
    expect([...findConflicts(values, SAMPLE_SUDOKU)].sort()).toEqual([0, 4]);
  });

  it('flags a cage whose digits overshoot its sum', () => {
    // Cage {12, 18} sums to 3.
    const values = Array(36).fill(0);
    values[12] = 6;
    expect(findConflicts(values, SAMPLE_SUDOKU).has(12)).toBe(true);
  });

  it('ignores empty cells', () => {
    expect(findConflicts(Array(36).fill(0), SAMPLE_SUDOKU).size).toBe(0);
  });
});

describe('matchesSolution', () => {
  it('needs every digit right', () => {
    expect(matchesSolution(solved, SAMPLE_SUDOKU.solution)).toBe(true);
    expect(matchesSolution([...solved.slice(0, -1), 0], SAMPLE_SUDOKU.solution)).toBe(false);
  });
});

describe('cageOutline', () => {
  it('draws a single cell as four inset sides', () => {
    const segs = cageOutline({ sum: 5, cells: [0] }, 6, 100, 10);
    expect(segs).toHaveLength(4);
    expect(segs).toContainEqual({ x1: 10, x2: 90, y1: 10, y2: 10 });
  });

  it('joins an L-shaped cage at its inside corner', () => {
    // Cells (0,0), (1,0), (1,1): the inside corner sits at (100, 100).
    const segs = cageOutline({ sum: 6, cells: [0, 6, 7] }, 6, 100, 10);
    // Right edge of (0,0) runs down past the corner; top of (1,1) starts before it.
    expect(segs).toContainEqual({ x1: 90, x2: 90, y1: 10, y2: 110 });
    expect(segs).toContainEqual({ x1: 90, x2: 190, y1: 110, y2: 110 });
  });
});
