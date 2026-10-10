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
  rows: 6,
  cols: 6,
  clues: '3222..22213.22..3.1.113.2112........',
  solution: '111100111010110010001010000110110000001000100010000010101011100100001010010000011000',
};
