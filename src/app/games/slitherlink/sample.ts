export interface SlitherlinkPuzzle {
  rows: number;
  cols: number;
  /** One character per cell, row by row: a digit 0–3, or "." for no clue. */
  clues: string;
  /**
   * The unique loop, one bit per edge: the (rows + 1) × cols horizontal
   * edges row by row, then the rows × (cols + 1) vertical ones.
   */
  solution: string;
}

/**
 * Practice puzzle, shown when today's generated one is unavailable. Made by
 * the Lambda's own generator (seed "slitherlink-sample"), so it is unique and
 * medium like every daily one.
 */
export const SAMPLE_SLITHERLINK: SlitherlinkPuzzle = {
  rows: 5,
  cols: 5,
  clues: '.111.121.2.1.03...1.1123.',
  solution: '000000111000001100011110000010000000010010010001100010000110',
};
