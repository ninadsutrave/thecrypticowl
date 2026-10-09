import type { Cage, SudokuPuzzle } from './sample';

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function boxIndex(cell: number, p: Pick<SudokuPuzzle, 'size' | 'boxRows' | 'boxCols'>) {
  const r = Math.floor(cell / p.size);
  const c = cell % p.size;
  return Math.floor(r / p.boxRows) * (p.size / p.boxCols) + Math.floor(c / p.boxCols);
}

/** Region of each cell: a jigsaw's irregular shapes, or the ordinary boxes. */
export function regionOf(p: SudokuPuzzle): number[] {
  return p.regions ?? Array.from({ length: p.size * p.size }, (_, i) => boxIndex(i, p));
}

/** Every group that must hold each digit once: rows, columns, regions, diagonals. */
export function housesOf(p: SudokuPuzzle): number[][] {
  const n = p.size;
  const houses: number[][] = [];
  for (let i = 0; i < n; i++) {
    houses.push(Array.from({ length: n }, (_, k) => i * n + k));
    houses.push(Array.from({ length: n }, (_, k) => k * n + i));
  }
  const byRegion = new Map<number, number[]>();
  regionOf(p).forEach((r, cell) => byRegion.set(r, [...(byRegion.get(r) ?? []), cell]));
  houses.push(...byRegion.values());
  if (p.diagonal) {
    houses.push(Array.from({ length: n }, (_, k) => k * n + k));
    houses.push(Array.from({ length: n }, (_, k) => k * n + (n - 1 - k)));
  }
  return houses;
}

export function sharesHouse(a: number, b: number, p: SudokuPuzzle): boolean {
  return housesOf(p).some(h => h.includes(a) && h.includes(b));
}

/**
 * Cells breaking a rule right now: a repeat in any house or cage, or a cage
 * whose digits already overshoot (or, once full, miss) its sum. Other
 * variant clues (dots, thermometers, arrows, sandwiches) are checked by the
 * solution match at the end, not flagged live: they constrain pairs and
 * sums in ways a half-filled grid can't judge fairly.
 * Empty cells (0) never conflict.
 */
export function findConflicts(values: number[], p: SudokuPuzzle): Set<number> {
  const bad = new Set<number>();

  const checkGroup = (cells: number[]) => {
    const seen = new Map<number, number[]>();
    for (const c of cells) {
      const v = values[c];
      if (!v) continue;
      seen.set(v, [...(seen.get(v) ?? []), c]);
    }
    for (const group of seen.values()) if (group.length > 1) group.forEach(c => bad.add(c));
  };

  housesOf(p).forEach(checkGroup);

  for (const cage of p.cages ?? []) {
    checkGroup(cage.cells);
    const filled = cage.cells.filter(c => values[c]);
    const total = filled.reduce((s, c) => s + values[c], 0);
    const full = filled.length === cage.cells.length;
    if (total > cage.sum || (full && total !== cage.sum)) filled.forEach(c => bad.add(c));
  }
  return bad;
}

export function isFilled(values: number[]): boolean {
  return values.every(v => v > 0);
}

export function matchesSolution(values: number[], solution: string): boolean {
  return values.every((v, i) => String(v) === solution[i]);
}

/**
 * Dashed cage outline, inset from the cell edges, in board units where each
 * cell is `cellSize` wide. Where a cage turns an inside corner the lines are
 * extended by the inset so the two runs meet instead of leaving a gap.
 */
export function cageOutline(cage: Cage, size: number, cellSize: number, inset: number): Segment[] {
  const cells = new Set(cage.cells);
  const has = (r: number, c: number) =>
    r >= 0 && c >= 0 && r < size && c < size && cells.has(r * size + c);
  const S = cellSize;
  const d = inset;
  const segs: Segment[] = [];

  for (const cell of cage.cells) {
    const r = Math.floor(cell / size);
    const c = cell % size;
    const x0 = c * S;
    const y0 = r * S;
    const left = has(r, c - 1);
    const right = has(r, c + 1);
    const up = has(r - 1, c);
    const down = has(r + 1, c);

    if (!up) {
      segs.push({
        x1: left ? (has(r - 1, c - 1) ? x0 - d : x0) : x0 + d,
        x2: right ? (has(r - 1, c + 1) ? x0 + S + d : x0 + S) : x0 + S - d,
        y1: y0 + d,
        y2: y0 + d,
      });
    }
    if (!down) {
      segs.push({
        x1: left ? (has(r + 1, c - 1) ? x0 - d : x0) : x0 + d,
        x2: right ? (has(r + 1, c + 1) ? x0 + S + d : x0 + S) : x0 + S - d,
        y1: y0 + S - d,
        y2: y0 + S - d,
      });
    }
    if (!left) {
      segs.push({
        x1: x0 + d,
        x2: x0 + d,
        y1: up ? (has(r - 1, c - 1) ? y0 - d : y0) : y0 + d,
        y2: down ? (has(r + 1, c - 1) ? y0 + S + d : y0 + S) : y0 + S - d,
      });
    }
    if (!right) {
      segs.push({
        x1: x0 + S - d,
        x2: x0 + S - d,
        y1: up ? (has(r - 1, c + 1) ? y0 - d : y0) : y0 + d,
        y2: down ? (has(r + 1, c + 1) ? y0 + S + d : y0 + S) : y0 + S - d,
      });
    }
  }
  return segs;
}
