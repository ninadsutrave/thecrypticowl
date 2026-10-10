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
  // Calibrated to about 4/10 (easy-medium): raised by three after the first
  // calibration played too hard, then trimmed by one (two for the easier
  // Jigsaw and Diagonal) when that played at 3/10.
  diagonal: { extraGivens: 3 },
  kropki: { extraGivens: 4 },
  thermo: { extraGivens: 3 },
  arrow: { extraGivens: 3 },
  sandwich: { extraGivens: 4 },
  jigsaw: { extraGivens: 3 },
  killer: { extraGivens: 3 },
};

/** Review bands for a medium 6×6 puzzle. */
export const MEDIUM = {
  minGivens: 0,
  maxGivens: 16,
  /** Solver search nodes: above this, the puzzle needs too much guessing. */
  maxNodes: 4_000,
};
