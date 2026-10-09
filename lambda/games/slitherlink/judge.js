import { MEDIUM } from './generator.js';
import { makeGrid, toBits } from './model.js';
import { solve } from './solver.js';

/**
 * Independent verdict: re-solve from the clues alone. Accept only one loop,
 * the stored one, found within the medium budget.
 */
export function judgeSlitherlink(p) {
  const grid = makeGrid(p.rows, p.cols);
  const clues = [...p.clues].map(ch => (ch === '.' ? null : Number(ch)));
  const r = solve(grid, clues, { limit: 2, maxNodes: MEDIUM.maxNodes * 10 });
  if (r.exhausted) return { ok: false, feedback: 'solver budget exhausted: too hard for medium' };
  if (r.count === 0) return { ok: false, feedback: 'no solution' };
  if (r.count > 1) return { ok: false, feedback: 'more than one loop fits' };
  if (toBits(r.solutions[0]) !== p.solution) {
    return { ok: false, feedback: 'unique loop differs from the stored one' };
  }
  if (r.nodes > MEDIUM.maxNodes) {
    return { ok: false, feedback: `needs ${r.nodes} guesses: harder than medium` };
  }
  return { ok: true, feedback: `unique; ${r.nodes} guesses`, score: r.nodes };
}
