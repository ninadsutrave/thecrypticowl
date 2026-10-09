import type { Rect, ShikakuPuzzle } from './sample';

/** The rectangle spanned by two corner cells, in either order. */
export function rectBetween(a: [number, number], b: [number, number]): Rect {
  const r = Math.min(a[0], b[0]);
  const c = Math.min(a[1], b[1]);
  return { r, c, h: Math.abs(a[0] - b[0]) + 1, w: Math.abs(a[1] - b[1]) + 1 };
}

export const sameRect = (a: Rect, b: Rect) =>
  a.r === b.r && a.c === b.c && a.h === b.h && a.w === b.w;

export const contains = (q: Rect, r: number, c: number) =>
  r >= q.r && r < q.r + q.h && c >= q.c && c < q.c + q.w;

export const overlaps = (a: Rect, b: Rect) =>
  a.r < b.r + b.h && b.r < a.r + a.h && a.c < b.c + b.w && b.c < a.c + a.w;

/** Draw a rectangle: anything it overlaps is replaced. */
export function place(rects: readonly Rect[], next: Rect): Rect[] {
  return [...rects.filter(q => !overlaps(q, next)), next];
}

export function removeAt(rects: readonly Rect[], r: number, c: number): Rect[] {
  return rects.filter(q => !contains(q, r, c));
}

/**
 * A drawn rectangle is "right" when it holds exactly one number and that
 * number is its area. (Right by the rules; whether it's in the answer only
 * shows once the grid is done.)
 */
export function isValidRect(q: Rect, puzzle: ShikakuPuzzle): boolean {
  const inside = puzzle.clues.filter(k => contains(q, k.r, k.c));
  return inside.length === 1 && inside[0].n === q.h * q.w;
}

/**
 * Solved when every cell is covered and every rectangle is valid. The
 * puzzle has exactly one such cutting, so this is the answer.
 */
export function isSolved(rects: readonly Rect[], puzzle: ShikakuPuzzle): boolean {
  const area = rects.reduce((s, q) => s + q.h * q.w, 0);
  return (
    rects.length === puzzle.clues.length &&
    area === puzzle.size * puzzle.size &&
    rects.every(q => isValidRect(q, puzzle))
  );
}

/**
 * The hint: one rectangle of the answer the player doesn't have yet,
 * preferring the one under the cursor.
 */
export function nextHint(
  rects: readonly Rect[],
  puzzle: ShikakuPuzzle,
  at: [number, number] | null
): Rect | null {
  const missing = puzzle.solution.filter(s => !rects.some(q => sameRect(q, s)));
  if (!missing.length) return null;
  return (at && missing.find(s => contains(s, at[0], at[1]))) || missing[0];
}

/** Share line: grid size and rectangle count, then 💡 per hint (or ✨ for none). */
export function shikakuGrid(puzzle: ShikakuPuzzle, hints: number): string {
  const total = puzzle.clues.length;
  return `▦ ${puzzle.size}×${puzzle.size} · ${total} rectangles ${hints ? '💡'.repeat(Math.min(hints, 8)) : '✨ no hints'}`;
}
