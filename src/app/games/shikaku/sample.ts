export interface ShikakuClue {
  r: number;
  c: number;
  /** The area of the rectangle this cell belongs to. */
  n: number;
}

export interface Rect {
  r: number;
  c: number;
  h: number;
  w: number;
}

export interface ShikakuPuzzle {
  size: number;
  clues: ShikakuClue[];
  /** The unique answer: rectangle i holds clue i. */
  solution: Rect[];
}

/**
 * Practice puzzle, shown when today's generated one is unavailable. Made by
 * the Lambda's own generator (seed "shikaku-sample"), so it is unique and
 * medium like every daily one.
 */
export const SAMPLE_SHIKAKU: ShikakuPuzzle = {
  size: 10,
  clues: [
    { r: 0, c: 1, n: 5 },
    { r: 1, c: 6, n: 6 },
    { r: 0, c: 9, n: 6 },
    { r: 1, c: 1, n: 4 },
    { r: 2, c: 2, n: 2 },
    { r: 4, c: 3, n: 6 },
    { r: 4, c: 4, n: 5 },
    { r: 5, c: 5, n: 12 },
    { r: 3, c: 1, n: 12 },
    { r: 4, c: 2, n: 3 },
    { r: 3, c: 8, n: 5 },
    { r: 6, c: 9, n: 6 },
    { r: 6, c: 2, n: 3 },
    { r: 6, c: 4, n: 4 },
    { r: 6, c: 5, n: 4 },
    { r: 7, c: 7, n: 2 },
    { r: 9, c: 3, n: 3 },
    { r: 9, c: 5, n: 4 },
    { r: 8, c: 7, n: 2 },
    { r: 9, c: 0, n: 3 },
    { r: 9, c: 9, n: 3 },
  ],
  solution: [
    { r: 0, c: 0, h: 1, w: 5 },
    { r: 0, c: 5, h: 2, w: 3 },
    { r: 0, c: 8, h: 3, w: 2 },
    { r: 1, c: 0, h: 2, w: 2 },
    { r: 1, c: 2, h: 2, w: 1 },
    { r: 1, c: 3, h: 6, w: 1 },
    { r: 1, c: 4, h: 5, w: 1 },
    { r: 2, c: 5, h: 4, w: 3 },
    { r: 3, c: 0, h: 6, w: 2 },
    { r: 3, c: 2, h: 3, w: 1 },
    { r: 3, c: 8, h: 5, w: 1 },
    { r: 3, c: 9, h: 6, w: 1 },
    { r: 6, c: 2, h: 3, w: 1 },
    { r: 6, c: 4, h: 4, w: 1 },
    { r: 6, c: 5, h: 2, w: 2 },
    { r: 6, c: 7, h: 2, w: 1 },
    { r: 7, c: 3, h: 3, w: 1 },
    { r: 8, c: 5, h: 2, w: 2 },
    { r: 8, c: 7, h: 1, w: 2 },
    { r: 9, c: 0, h: 1, w: 3 },
    { r: 9, c: 7, h: 1, w: 3 },
  ],
};
