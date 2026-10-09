import type { SlitherlinkPuzzle } from './sample';

/** Edge marks as the player sets them. */
export const EMPTY = 0;
export const LINE = 1;
export const CROSS = 2;
export type Mark = typeof EMPTY | typeof LINE | typeof CROSS;

/**
 * The same numbering as the Lambda (lambda/games/slitherlink/model.js):
 * horizontal edges row by row, then vertical ones. Vertices are
 * (rows + 1) × (cols + 1).
 */
export function makeGrid(rows: number, cols: number) {
  const H = (rows + 1) * cols;
  const h = (r: number, c: number) => r * cols + c;
  const v = (r: number, c: number) => H + r * (cols + 1) + c;
  const vertex = (r: number, c: number) => r * (cols + 1) + c;
  const edges = H + rows * (cols + 1);
  const cellEdges: number[][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) cellEdges.push([h(r, c), h(r + 1, c), v(r, c), v(r, c + 1)]);
  }
  /** Each edge's endpoints as [row, col] vertex coordinates. */
  const ends: [[number, number], [number, number]][] = new Array(edges);
  for (let r = 0; r <= rows; r++)
    for (let c = 0; c < cols; c++)
      ends[h(r, c)] = [
        [r, c],
        [r, c + 1],
      ];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c <= cols; c++)
      ends[v(r, c)] = [
        [r, c],
        [r + 1, c],
      ];
  return { rows, cols, edges, H, h, v, vertex, cellEdges, ends };
}
export type Grid = ReturnType<typeof makeGrid>;

/**
 * The edge nearest a point given in cell units ((0, 0) is the top-left dot),
 * or null when the point is off the board.
 */
export function nearestEdge(grid: Grid, x: number, y: number): number | null {
  if (x < -0.5 || y < -0.5 || x > grid.cols + 0.5 || y > grid.rows + 0.5) return null;
  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
  const hr = clamp(Math.round(y), 0, grid.rows);
  const hc = clamp(Math.floor(x), 0, grid.cols - 1);
  const vc = clamp(Math.round(x), 0, grid.cols);
  const vr = clamp(Math.floor(y), 0, grid.rows - 1);
  return Math.abs(y - hr) <= Math.abs(x - vc) ? grid.h(hr, hc) : grid.v(vr, vc);
}

/** The edge between two neighbouring dots, if they are neighbours. */
export function edgeBetween(grid: Grid, a: [number, number], b: [number, number]): number | null {
  const [r1, c1] = a;
  const [r2, c2] = b;
  if (r1 === r2 && Math.abs(c1 - c2) === 1) return grid.h(r1, Math.min(c1, c2));
  if (c1 === c2 && Math.abs(r1 - r2) === 1) return grid.v(Math.min(r1, r2), c1);
  return null;
}

export function lineCount(grid: Grid, marks: readonly Mark[], cell: number) {
  return grid.cellEdges[cell].filter(e => marks[e] === LINE).length;
}

/** Lines meeting at each dot: more than two is always a mistake. */
export function dotDegrees(grid: Grid, marks: readonly Mark[]) {
  const deg = new Map<string, number>();
  marks.forEach((m, e) => {
    if (m !== LINE) return;
    for (const [r, c] of grid.ends[e]) deg.set(`${r},${c}`, (deg.get(`${r},${c}`) ?? 0) + 1);
  });
  return deg;
}

export function isSingleLoop(grid: Grid, marks: readonly Mark[]): boolean {
  const deg = dotDegrees(grid, marks);
  if (!deg.size || [...deg.values()].some(d => d !== 2)) return false;
  const adj = new Map<string, string[]>();
  marks.forEach((m, e) => {
    if (m !== LINE) return;
    const [a, b] = grid.ends[e].map(([r, c]) => `${r},${c}`);
    adj.set(a, [...(adj.get(a) ?? []), b]);
    adj.set(b, [...(adj.get(b) ?? []), a]);
  });
  const start = adj.keys().next().value as string;
  const seen = new Set([start]);
  const stack = [start];
  while (stack.length) {
    for (const n of adj.get(stack.pop()!)!) {
      if (!seen.has(n)) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return seen.size === adj.size;
}

/** Solved: one closed loop, and every number counts its sides exactly. */
export function isSolved(grid: Grid, marks: readonly Mark[], clues: string): boolean {
  return (
    isSingleLoop(grid, marks) &&
    [...clues].every((ch, i) => ch === '.' || lineCount(grid, marks, i) === Number(ch))
  );
}

/**
 * The hint: first fix a wrong line (it becomes a cross), otherwise draw the
 * next piece of the loop the player is missing.
 */
export function nextHint(
  marks: readonly Mark[],
  solution: string
): { edge: number; mark: Mark } | null {
  const wrong = marks.findIndex((m, e) => m === LINE && solution[e] === '0');
  if (wrong >= 0) return { edge: wrong, mark: CROSS };
  const missing = marks.findIndex((m, e) => m !== LINE && solution[e] === '1');
  return missing >= 0 ? { edge: missing, mark: LINE } : null;
}

export const emptyMarks = (puzzle: SlitherlinkPuzzle): Mark[] =>
  new Array(makeGrid(puzzle.rows, puzzle.cols).edges).fill(EMPTY);

/** Share line: grid size, then 💡 per hint (or ✨ for none). */
export const slitherGrid = (puzzle: SlitherlinkPuzzle, hints: number) =>
  `➰ ${puzzle.rows}×${puzzle.cols} loop ${hints ? '💡'.repeat(Math.min(hints, 8)) : '✨ no hints'}`;
