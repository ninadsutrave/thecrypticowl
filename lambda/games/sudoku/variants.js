/**
 * The weekly variant rotation (docs/games.md § Variant Sudoku). All grids are
 * 6×6 with 2×3 boxes: a 9×9 variant with few givens runs well past the
 * 5–6 minute medium target.
 *
 * `extraGivens` is the difficulty dial. The generator first strips givens to
 * the minimum that still leaves exactly one solution (the hardest version),
 * then adds this many back to land at medium.
 */

export const SIZE = 6;
export const BOX_ROWS = 2;
export const BOX_COLS = 3;

export const WEEKLY_ROTATION = [
  'diagonal', // Mon
  'kropki', // Tue
  'thermo', // Wed
  'arrow', // Thu
  'sandwich', // Fri
  'jigsaw', // Sat
  'killer', // Sun
];

export const VARIANT_CONFIG = {
  // Raised by three each: players found the first calibration too hard.
  diagonal: { extraGivens: 5 },
  kropki: { extraGivens: 5 },
  thermo: { extraGivens: 4 },
  arrow: { extraGivens: 4 },
  sandwich: { extraGivens: 5 },
  jigsaw: { extraGivens: 5 },
  killer: { extraGivens: 4 },
};

/** Review bands for a medium 6×6 puzzle. */
export const MEDIUM = {
  minGivens: 0,
  maxGivens: 16,
  /** Solver search nodes: above this, the puzzle needs too much guessing. */
  maxNodes: 4_000,
};
