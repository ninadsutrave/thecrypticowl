/**
 * Shikaku solver. Each clue's candidates are the rectangles of its area
 * that contain it, fit the grid and hold no other clue; a solution picks
 * one per clue so every cell is covered exactly once (exact cover).
 *
 * Logic first: a clue with one candidate left is placed, and a cell only
 * one clue can still reach must be covered by that clue. Search takes over
 * where logic stops; `nodes` counts its guesses.
 */

export function candidatesFor(size, clues) {
  const clueAt = new Map(clues.map((k, i) => [k.r * size + k.c, i]));
  return clues.map(({ r, c, n }, self) => {
    const out = [];
    for (let h = 1; h <= n; h++) {
      if (n % h) continue;
      const w = n / h;
      if (h > size || w > size) continue;
      for (let top = r - h + 1; top <= r; top++) {
        for (let left = c - w + 1; left <= c; left++) {
          if (top < 0 || left < 0 || top + h > size || left + w > size) continue;
          let clean = true;
          for (let rr = top; rr < top + h && clean; rr++) {
            for (let cc = left; cc < left + w; cc++) {
              const other = clueAt.get(rr * size + cc);
              if (other !== undefined && other !== self) {
                clean = false;
                break;
              }
            }
          }
          if (clean) out.push({ r: top, c: left, h, w });
        }
      }
    }
    return out;
  });
}

export const cellsOf = (size, { r, c, h, w }) => {
  const out = [];
  for (let rr = r; rr < r + h; rr++) for (let cc = c; cc < c + w; cc++) out.push(rr * size + cc);
  return out;
};

export function solve({ size, clues }, { limit = 2, maxNodes = 20_000 } = {}) {
  const cand = candidatesFor(size, clues).map(list =>
    list.map(rect => ({ rect, cells: cellsOf(size, rect) }))
  );
  const forcedAtStart = cand.filter(list => list.length === 1).length;
  const solutions = [];
  let nodes = 0;
  let exhausted = false;

  /** state: per clue, the indices of its still-possible candidates. */
  const propagate = state => {
    let changed = true;
    while (changed) {
      changed = false;
      // Cells already claimed by clues with a single candidate.
      const owner = new Map();
      for (let i = 0; i < state.length; i++) {
        if (state[i].length === 0) return false;
        if (state[i].length === 1) {
          for (const cell of cand[i][state[i][0]].cells) {
            if (owner.has(cell) && owner.get(cell) !== i) return false;
            owner.set(cell, i);
          }
        }
      }
      // Drop candidates that overlap a placed rectangle.
      for (let i = 0; i < state.length; i++) {
        if (state[i].length === 1) continue;
        const kept = state[i].filter(k =>
          cand[i][k].cells.every(cell => !owner.has(cell) || owner.get(cell) === i)
        );
        if (kept.length !== state[i].length) {
          state[i] = kept;
          changed = true;
          if (!kept.length) return false;
        }
      }
      // A cell only one clue can reach must be covered by that clue.
      const reach = new Map();
      for (let i = 0; i < state.length; i++) {
        for (const k of state[i]) {
          for (const cell of cand[i][k].cells) {
            if (!reach.has(cell)) reach.set(cell, new Set());
            reach.get(cell).add(i);
          }
        }
      }
      if (reach.size < size * size) return false;
      for (const [cell, who] of reach) {
        if (who.size !== 1) continue;
        const i = [...who][0];
        const kept = state[i].filter(k => cand[i][k].cells.includes(cell));
        if (kept.length !== state[i].length) {
          state[i] = kept;
          changed = true;
        }
      }
    }
    return true;
  };

  const search = state => {
    if (solutions.length >= limit || exhausted) return;
    if (!propagate(state)) return;
    let pick = -1;
    for (let i = 0; i < state.length; i++) {
      if (state[i].length > 1 && (pick < 0 || state[i].length < state[pick].length)) pick = i;
    }
    if (pick < 0) {
      // All placed: no overlaps (checked above) and every cell covered.
      const covered = new Set();
      for (let i = 0; i < state.length; i++)
        cand[i][state[i][0]].cells.forEach(c => covered.add(c));
      if (covered.size === size * size) solutions.push(state.map((s, i) => cand[i][s[0]].rect));
      return;
    }
    for (const k of state[pick]) {
      if (++nodes > maxNodes) {
        exhausted = true;
        return;
      }
      const next = state.map(s => [...s]);
      next[pick] = [k];
      search(next);
      if (solutions.length >= limit || exhausted) return;
    }
  };
  search(cand.map(list => list.map((_, k) => k)));

  return { count: solutions.length, solutions, nodes, exhausted, forcedAtStart };
}
