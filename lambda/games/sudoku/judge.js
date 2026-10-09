import { solve } from './solver.js';
import { MEDIUM } from './variants.js';

/**
 * Independent verdict: re-solve the puzzle from its payload alone, as a
 * player would see it. Accept only if there is exactly one solution, it is
 * the stored one, and finding it took a medium amount of search.
 */
export function judgeSudoku(p) {
  const r = solve(p, { limit: 2, maxNodes: MEDIUM.maxNodes * 5 });
  if (r.exhausted) return { ok: false, feedback: 'solver budget exhausted: too hard for medium' };
  if (r.count === 0) return { ok: false, feedback: 'no solution' };
  if (r.count > 1) return { ok: false, feedback: 'more than one solution' };
  if (r.solutions[0].join('') !== p.solution) {
    return { ok: false, feedback: 'unique solution differs from the stored one' };
  }
  if (r.nodes > MEDIUM.maxNodes) {
    return { ok: false, feedback: `needs ${r.nodes} search steps: harder than medium` };
  }
  return { ok: true, feedback: 'unique and medium', score: r.nodes };
}
