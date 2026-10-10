import { cellCounts, isSingleLoop, makeGrid, toBits, zeroThreePairs } from './model.js';
import { solve } from './solver.js';

/**
 * Slitherlink, 6×6: big cells, so a drawn line follows the finger easily on
 * the smallest phone, with clues thinned until it's a medium puzzle. Built in code:
 *
 *   1. Loop: grow a random blob of cells with no holes and no corner-only
 *      touches; its outline is one simple closed loop.
 *   2. Clues: every cell's count of loop sides, then remove clues in random
 *      order, keeping each removal only if the solver still finds exactly
 *      one loop.
 *   3. Keep it if logic plus at most a few guesses solves it (medium), and
 *      enough clues are left to start from.
 */
export const SIZE = 6;
export const MEDIUM = {
  /** Share of cells inside the loop: enough for a long, winding outline. */
  fill: [0.42, 0.6],
  maxNodes: 12,
  /** Clued cells: fewer is harder. */
  minClues: 11,
};

/** Cell (r, c) inside the blob? Outside the grid counts as outside. */
const at = (inside, r, c) => r >= 0 && c >= 0 && r < SIZE && c < SIZE && inside[r * SIZE + c];

/** No two inside cells may touch only at a corner, nor two outside cells. */
function pinchFree(inside) {
  for (let r = 0; r <= SIZE; r++) {
    for (let c = 0; c <= SIZE; c++) {
      const a = at(inside, r - 1, c - 1);
      const b = at(inside, r - 1, c);
      const d = at(inside, r, c - 1);
      const e = at(inside, r, c);
      if (a === e && b === d && a !== b) return false;
    }
  }
  return true;
}

/** Every outside cell reaches the border: the blob has no holes. */
function noHoles(inside) {
  const seen = new Uint8Array(SIZE * SIZE);
  const stack = [];
  for (let i = 0; i < SIZE; i++) {
    for (const [r, c] of [
      [0, i],
      [SIZE - 1, i],
      [i, 0],
      [i, SIZE - 1],
    ]) {
      const k = r * SIZE + c;
      if (!inside[k] && !seen[k]) {
        seen[k] = 1;
        stack.push(k);
      }
    }
  }
  while (stack.length) {
    const k = stack.pop();
    const r = Math.floor(k / SIZE);
    const c = k % SIZE;
    for (const [rr, cc] of [
      [r + 1, c],
      [r - 1, c],
      [r, c + 1],
      [r, c - 1],
    ]) {
      if (rr < 0 || cc < 0 || rr >= SIZE || cc >= SIZE) continue;
      const kk = rr * SIZE + cc;
      if (!inside[kk] && !seen[kk]) {
        seen[kk] = 1;
        stack.push(kk);
      }
    }
  }
  return inside.every((x, k) => x || seen[k]);
}

export function makeLoop(grid, rng) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const inside = new Array(SIZE * SIZE).fill(false);
    inside[rng.int(0, SIZE * SIZE - 1)] = true;
    const target = Math.round(
      SIZE * SIZE * (MEDIUM.fill[0] + rng.next() * (MEDIUM.fill[1] - MEDIUM.fill[0]))
    );
    let size = 1;
    for (let tries = 0; size < target && tries < 4000; tries++) {
      const frontier = [];
      for (let k = 0; k < inside.length; k++) {
        if (inside[k]) continue;
        const r = Math.floor(k / SIZE);
        const c = k % SIZE;
        if (
          at(inside, r + 1, c) ||
          at(inside, r - 1, c) ||
          at(inside, r, c + 1) ||
          at(inside, r, c - 1)
        ) {
          frontier.push(k);
        }
      }
      const k = rng.pick(frontier);
      inside[k] = true;
      if (pinchFree(inside) && noHoles(inside)) size++;
      else inside[k] = false;
    }
    if (size < target) continue;
    // The loop is every edge between an inside cell and an outside one.
    const on = new Array(grid.edges).fill(0);
    for (let r = 0; r <= SIZE; r++) {
      for (let c = 0; c < SIZE; c++)
        if (at(inside, r - 1, c) !== at(inside, r, c)) on[grid.h(r, c)] = 1;
    }
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c <= SIZE; c++)
        if (at(inside, r, c - 1) !== at(inside, r, c)) on[grid.v(r, c)] = 1;
    }
    if (isSingleLoop(grid, on)) return on;
  }
  throw new Error('could not draw a loop');
}

export function generateSlitherlink(rng) {
  const grid = makeGrid(SIZE, SIZE);
  for (let attempt = 0; attempt < 30; attempt++) {
    const on = makeLoop(grid, rng);
    const clues = cellCounts(grid, on);
    // Zeros are the most generous clues, so they go first: a medium puzzle
    // keeps only the ones it needs, plus one 0 beside a 3, so every puzzle
    // has an obvious place to start.
    const order = rng
      .shuffle(clues.map((_, k) => k))
      .sort((x, y) => (clues[x] === 0 ? 0 : 1) - (clues[y] === 0 ? 0 : 1));
    // Every puzzle opens on a 0 beside a 3: no such pair, try another loop.
    const pairs = zeroThreePairs(clues, SIZE, SIZE);
    if (!pairs.length) continue;
    const opening = new Set(rng.pick(pairs));
    for (const i of order) {
      const keep = clues[i];
      if (opening.has(i)) continue;
      clues[i] = null;
      const r = solve(grid, clues, { limit: 2, maxNodes: MEDIUM.maxNodes * 10 });
      if (r.exhausted || r.count !== 1 || r.nodes > MEDIUM.maxNodes) clues[i] = keep;
      if (clues.filter(k => k !== null).length <= MEDIUM.minClues) break;
    }
    const final = solve(grid, clues, { limit: 2 });
    if (final.count === 1 && final.nodes <= MEDIUM.maxNodes) {
      return {
        rows: SIZE,
        cols: SIZE,
        clues: clues.map(k => (k === null ? '.' : String(k))).join(''),
        solution: toBits(on),
      };
    }
  }
  throw new Error('no unique medium slitherlink found');
}
