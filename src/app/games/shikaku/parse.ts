import { isObj } from '../parsers';
import type { ShikakuPuzzle } from './sample';

const isInt = (v: unknown): v is number => Number.isInteger(v);

/** `{ size, clues: [{ r, c, n }], solution: [{ r, c, h, w }] }`, one rectangle per clue. */
export function parseShikaku(raw: unknown): ShikakuPuzzle | null {
  if (!isObj(raw)) return null;
  const { size, clues, solution } = raw;
  if (!isInt(size) || size < 4 || size > 15) return null;
  if (!Array.isArray(clues) || !Array.isArray(solution) || clues.length === 0) return null;
  if (clues.length !== solution.length) return null;
  const inGrid = (v: unknown) => isInt(v) && v >= 0 && v < size;
  const cluesOk = clues.every(k => isObj(k) && inGrid(k.r) && inGrid(k.c) && isInt(k.n) && k.n > 0);
  const rectsOk = solution.every(
    q =>
      isObj(q) &&
      inGrid(q.r) &&
      inGrid(q.c) &&
      isInt(q.h) &&
      isInt(q.w) &&
      q.h > 0 &&
      q.w > 0 &&
      (q.r as number) + (q.h as number) <= size &&
      (q.c as number) + (q.w as number) <= size
  );
  return cluesOk && rectsOk ? (raw as unknown as ShikakuPuzzle) : null;
}
