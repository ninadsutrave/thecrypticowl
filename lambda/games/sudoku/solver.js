import { compile, satisfiable } from './model.js';

/**
 * Backtracking solver over the full rule model, choosing the most
 * constrained empty cell first.
 *
 * Used three ways: to count solutions (uniqueness), to build a random
 * filled grid (pass an rng), and to grade difficulty — `nodes` is the
 * number of cells it had to try, so a puzzle that needs much guessing
 * has a high count.
 */
export function solve(puzzle, { limit = 2, maxNodes = 200_000, rng = null, start = null } = {}) {
  const m = compile(puzzle);
  const grid = start
    ? [...start]
    : Array.from({ length: m.total }, (_, i) => puzzle.givens?.[i] ?? 0);
  const solutions = [];
  let nodes = 0;
  let exhausted = false;

  const candidates = i => {
    const out = [];
    outer: for (let v = 1; v <= m.n; v++) {
      for (const p of m.peers[i]) if (grid[p] === v) continue outer;
      grid[i] = v;
      const ok = m.byCell[i].every(c => satisfiable(c, grid, m.n));
      grid[i] = 0;
      if (ok) out.push(v);
    }
    return out;
  };

  // A given that breaks a rule makes the puzzle unsolvable before search.
  for (let i = 0; i < m.total; i++) {
    if (!grid[i]) continue;
    const v = grid[i];
    if (m.peers[i].some(p => grid[p] === v)) return { count: 0, solutions, nodes, exhausted };
  }
  if (!m.constraints.every(c => satisfiable(c, grid, m.n))) {
    return { count: 0, solutions, nodes, exhausted };
  }

  const search = () => {
    if (solutions.length >= limit || exhausted) return;
    if (++nodes > maxNodes) {
      exhausted = true;
      return;
    }
    let best = -1;
    let bestCands = null;
    for (let i = 0; i < m.total; i++) {
      if (grid[i]) continue;
      const c = candidates(i);
      if (c.length === 0) return;
      if (!bestCands || c.length < bestCands.length) {
        best = i;
        bestCands = c;
        if (c.length === 1) break;
      }
    }
    if (best < 0) {
      solutions.push([...grid]);
      return;
    }
    const order = rng ? rng.shuffle(bestCands) : bestCands;
    for (const v of order) {
      grid[best] = v;
      search();
      grid[best] = 0;
      if (solutions.length >= limit || exhausted) return;
    }
  };

  search();
  return { count: solutions.length, solutions, nodes, exhausted };
}

/** True when the puzzle has exactly one solution within the node budget. */
export function isUnique(puzzle, maxNodes) {
  const r = solve(puzzle, { limit: 2, maxNodes });
  return !r.exhausted && r.count === 1;
}
