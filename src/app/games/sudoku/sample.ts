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
 * Placeholder until the daily generator ships. A 6×6 Killer: a 9×9 Killer
 * takes most solvers well past the 5–6 minute medium target.
 *
 * Machine-checked: a solver finds exactly one solution with these cages
 * and the two givens.
 */
export const SAMPLE_SUDOKU: SudokuPuzzle = {
  variant: 'killer',
  size: 6,
  boxRows: 2,
  boxCols: 3,
  givens: { 5: 1, 17: 6 },
  solution: '345621216354154236623145462513531462',
  cages: [
    { sum: 6, cells: [0, 6, 12] },
    { sum: 5, cells: [1, 7] },
    { sum: 14, cells: [2, 8, 9] },
    { sum: 14, cells: [3, 4, 5, 10] },
    { sum: 15, cells: [11, 15, 16, 17] },
    { sum: 9, cells: [13, 14] },
    { sum: 10, cells: [18, 24] },
    { sum: 5, cells: [19, 20] },
    { sum: 5, cells: [21, 22] },
    { sum: 9, cells: [23, 28, 29] },
    { sum: 14, cells: [25, 30, 31] },
    { sum: 3, cells: [26, 32] },
    { sum: 9, cells: [27, 33] },
    { sum: 8, cells: [34, 35] },
  ],
};
