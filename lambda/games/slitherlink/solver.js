import { isSingleLoop } from './model.js';

const UNKNOWN = -1;

/**
 * Slitherlink solver. Edges are on (1), off (0) or unknown (−1). Logic
 * first, the standard deductions a person uses:
 *
 *   - a clue already met turns its other sides off; a clue that needs all
 *     its remaining sides turns them on;
 *   - every dot has 0 or 2 lines: a dot with one line and one possible
 *     continuation must continue there; a dot with two lines, or with only
 *     one possible line left, closes off the rest;
 *   - a line may not close a small loop while other lines exist elsewhere.
 *
 * Search takes over where logic stops; `nodes` counts its guesses. Counts
 * solutions up to `limit`.
 */
export function solve(grid, clues, { limit = 2, maxNodes = 20_000 } = {}) {
  const solutions = [];
  let nodes = 0;
  let exhausted = false;
  const clued = clues.map((k, i) => [i, k]).filter(([, k]) => k !== null);

  const propagate = s => {
    let changed = true;
    const set = (e, x) => {
      if (s[e] === x) return true;
      if (s[e] !== UNKNOWN) return false;
      s[e] = x;
      changed = true;
      return true;
    };
    while (changed) {
      changed = false;
      for (const [i, k] of clued) {
        const es = grid.cellEdges[i];
        let on = 0;
        let unk = 0;
        for (const e of es) s[e] === 1 ? on++ : s[e] === UNKNOWN && unk++;
        if (on > k || on + unk < k) return false;
        if (unk && on === k) for (const e of es) if (s[e] === UNKNOWN && !set(e, 0)) return false;
        if (unk && on + unk === k)
          for (const e of es) if (s[e] === UNKNOWN && !set(e, 1)) return false;
      }
      for (const es of grid.vertexEdges) {
        let on = 0;
        let unk = 0;
        let last = -1;
        for (const e of es) {
          if (s[e] === 1) on++;
          else if (s[e] === UNKNOWN) {
            unk++;
            last = e;
          }
        }
        if (on > 2 || (on === 1 && unk === 0)) return false;
        if (!unk) continue;
        if (on === 2) for (const e of es) if (s[e] === UNKNOWN && !set(e, 0)) return false;
        if (on === 1 && unk === 1 && !set(last, 1)) return false;
        if (on === 0 && unk === 1 && !set(last, 0)) return false;
      }
      if (!changed && !loopRule(s, set)) return false;
    }
    return true;
  };

  /**
   * Union the lines into paths. A closed loop must be the whole answer; an
   * unknown edge joining two ends of one path would close a loop early, so
   * it's off while other lines exist.
   */
  const loopRule = (s, set) => {
    const parent = grid.vertexEdges.map((_, i) => i);
    const find = x => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    const degree = new Array(parent.length).fill(0);
    let onCount = 0;
    for (let e = 0; e < grid.edges; e++) {
      if (s[e] !== 1) continue;
      onCount++;
      const [a, b] = grid.ends[e];
      degree[a]++;
      degree[b]++;
      parent[find(a)] = find(b);
    }
    if (!onCount) return true;
    const size = new Map();
    const open = new Set();
    for (let e = 0; e < grid.edges; e++) {
      if (s[e] !== 1) continue;
      const root = find(grid.ends[e][0]);
      size.set(root, (size.get(root) ?? 0) + 1);
    }
    for (let x = 0; x < degree.length; x++) if (degree[x] === 1) open.add(find(x));
    const closed = [...size.keys()].filter(root => !open.has(root));
    if (closed.length) {
      if (size.size > 1) return false; // a loop plus other lines
      // One closed loop: everything else is off, and every clue must agree.
      for (let e = 0; e < grid.edges; e++) if (s[e] === UNKNOWN && !set(e, 0)) return false;
      return true;
    }
    if (size.size > 1) {
      for (let e = 0; e < grid.edges; e++) {
        if (s[e] !== UNKNOWN) continue;
        const [a, b] = grid.ends[e];
        if (degree[a] === 1 && degree[b] === 1 && find(a) === find(b) && !set(e, 0)) return false;
      }
    }
    return true;
  };

  const pickEdge = s => {
    // Extend a path where possible: the most constrained choice.
    for (let x = 0; x < grid.vertexEdges.length; x++) {
      const es = grid.vertexEdges[x];
      if (es.filter(e => s[e] === 1).length !== 1) continue;
      const e = es.find(e2 => s[e2] === UNKNOWN);
      if (e !== undefined) return e;
    }
    return s.indexOf(UNKNOWN);
  };

  const search = s => {
    if (solutions.length >= limit || exhausted) return;
    if (!propagate(s)) return;
    const e = pickEdge(s);
    if (e < 0) {
      const on = Array.from(s, x => x === 1);
      const ok =
        isSingleLoop(grid, on) &&
        clued.every(([i, k]) => grid.cellEdges[i].filter(x => on[x]).length === k);
      if (ok) solutions.push(on.map(Number));
      return;
    }
    for (const x of [1, 0]) {
      if (++nodes > maxNodes) {
        exhausted = true;
        return;
      }
      const next = Int8Array.from(s);
      next[e] = x;
      search(next);
      if (solutions.length >= limit || exhausted) return;
    }
  };
  search(new Int8Array(grid.edges).fill(UNKNOWN));
  return { count: solutions.length, solutions, nodes, exhausted };
}
