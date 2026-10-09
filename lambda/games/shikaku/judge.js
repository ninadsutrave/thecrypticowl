import { MEDIUM } from './generator.js';
import { solve } from './solver.js';

const same = (a, b) => a.r === b.r && a.c === b.c && a.h === b.h && a.w === b.w;

/**
 * Independent verdict: re-solve from the clues alone. Accept only one way
 * to cut the grid, the stored one, within the medium budget, and without
 * too many clues giving themselves away at the start.
 */
export function judgeShikaku(p) {
  const r = solve(p, { limit: 2, maxNodes: MEDIUM.maxNodes * 20 });
  if (r.exhausted) return { ok: false, feedback: 'solver budget exhausted: too hard for medium' };
  if (r.count === 0) return { ok: false, feedback: 'no solution' };
  if (r.count > 1) return { ok: false, feedback: 'more than one solution' };
  if (!r.solutions[0].every((rect, i) => same(rect, p.solution[i]))) {
    return { ok: false, feedback: 'unique solution differs from the stored one' };
  }
  if (r.nodes > MEDIUM.maxNodes) {
    return { ok: false, feedback: `needs ${r.nodes} guesses: harder than medium` };
  }
  const forced = r.forcedAtStart / p.clues.length;
  if (forced > MEDIUM.maxForcedShare) {
    return {
      ok: false,
      feedback: `${Math.round(forced * 100)}% of clues are given away: too easy`,
    };
  }
  return { ok: true, feedback: `unique; ${r.nodes} guesses`, score: r.nodes };
}
