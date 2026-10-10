import { cellCounts, fromBits, isSingleLoop, makeGrid, zeroThreePairs } from './model.js';

/**
 * Deterministic review: the stored answer is one closed loop, and every
 * clue is the true count of its cell's sides on that loop.
 */
export function reviewSlitherlink(p) {
  const errors = [];
  const { rows, cols } = p ?? {};
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 4 || cols < 4) {
    return { ok: false, errors: ['bad grid size'] };
  }
  const grid = makeGrid(rows, cols);
  const clues = String(p.clues ?? '');
  const sol = String(p.solution ?? '');
  if (clues.length !== rows * cols || !/^[.0-3]+$/.test(clues)) errors.push('clues malformed');
  if (sol.length !== grid.edges || !/^[01]+$/.test(sol)) {
    return { ok: false, errors: [...errors, 'solution malformed'] };
  }
  const on = fromBits(sol);
  if (!isSingleLoop(grid, on)) errors.push('solution is not one closed loop');
  const counts = cellCounts(grid, on);
  [...clues].forEach((ch, i) => {
    if (ch !== '.' && Number(ch) !== counts[i])
      errors.push(`cell ${i} says ${ch}, loop gives ${counts[i]}`);
  });
  if (!clues.includes('0')) errors.push('no 0 clue: every puzzle needs a place to start');
  else if (!zeroThreePairs(clues, rows, cols).length) {
    errors.push('no 0 beside a 3: every puzzle opens there');
  }
  const clued = [...clues].filter(ch => ch !== '.').length;
  if (clued < rows * cols * 0.25) errors.push(`only ${clued} clues`);
  return { ok: errors.length === 0, errors, checks: { clues: clued } };
}
