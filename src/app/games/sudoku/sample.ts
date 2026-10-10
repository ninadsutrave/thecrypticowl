import type { SudokuVariant } from './variants';

export interface Cage {
  sum: number;
  /** Cell indices, row-major. */
  cells: number[];
}

export interface KropkiDot {
  a: number;
  b: number;
  color: 'white' | 'black';
}

export interface Arrow {
  /** The circled cell. */
  circle: number;
  /** Cells the arrow passes through, leaving the circle. */
  path: number[];
}

/**
 * One day's puzzle, exactly as the sudoku Lambda stores it
 * (lambda/games/sudoku/model.js documents the same shape).
 */
export interface SudokuPuzzle {
  variant: SudokuVariant;
  size: 6 | 9;
  boxRows: number;
  boxCols: number;
  /** Cell index → digit, for the cells filled in at the start. */
  givens: Record<number, number>;
  /** Row-major digits of the unique solution. */
  solution: string;
  /** Jigsaw: the region id of each cell, replacing the boxes. */
  regions?: number[];
  /** Diagonal: no repeats on either main diagonal. */
  diagonal?: boolean;
  cages?: Cage[];
  kropki?: KropkiDot[];
  /** Thermometers, bulb first. */
  thermos?: number[][];
  arrows?: Arrow[];
  /** Sum between the 1 and the largest digit, per row and column (null = no clue). */
  sandwich?: { rows: (number | null)[]; cols: (number | null)[] };
}

/**
 * Practice puzzle, shown when today's generated one is unavailable: a 6×6
 * Killer made by the Lambda's own generator (seed "sudoku-sample-0") at the
 * eased difficulty, so it plays like a daily one. Unique by the solver.
 */
export const SAMPLE_SUDOKU: SudokuPuzzle = {
  variant: 'killer',
  size: 6,
  boxRows: 2,
  boxCols: 3,
  givens: { 2: 1, 7: 3, 24: 4, 30: 3 },
  solution: '621453534216163524245631412365356142',
  cages: [
    { sum: 14, cells: [8, 9, 14, 15] },
    { sum: 11, cells: [10, 11, 17] },
    { sum: 11, cells: [32, 33, 34] },
    { sum: 11, cells: [13, 19, 25] },
    { sum: 17, cells: [0, 1, 2, 6, 7] },
    { sum: 7, cells: [29, 35] },
    { sum: 6, cells: [16, 22, 23] },
    { sum: 12, cells: [24, 30, 31] },
    { sum: 13, cells: [20, 21, 26] },
    { sum: 12, cells: [3, 4, 5] },
    { sum: 9, cells: [27, 28] },
    { sum: 3, cells: [12, 18] },
  ],
};
