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
  rows: 8,
  cols: 8,
  clues: '..1.123..121.32.121...3.21....3.2.....1.1.1.2.3.32231...10......',
  solution:
    '000111100000011001100110000000101000001100001101011000101001000000000000000100010000101000010000010010000100100000001100010110110110000000000000',
};
