import { compile, regionsFor, satisfiable } from './model.js';
import { MEDIUM, VARIANT_CONFIG } from './variants.js';

/**
 * Deterministic review of a generated puzzle — every check independent of
 * the generator's own bookkeeping, so a generator bug can't vouch for itself.
 */
export function reviewSudoku(p) {
  const errors = [];
  const n = p?.size;
  const total = n * n;

  if (!VARIANT_CONFIG[p?.variant]) errors.push(`unknown variant ${p?.variant}`);
  if (n !== p.boxRows * p.boxCols) errors.push('box shape does not tile the grid');
  if (typeof p.solution !== 'string' || p.solution.length !== total) {
    return { ok: false, errors: [...errors, 'solution missing or wrong length'] };
  }
  const grid = [...p.solution].map(Number);
  if (grid.some(v => !(v >= 1 && v <= n))) errors.push('solution has an out-of-range digit');

  // Every house holds each digit once.
  const m = compile(p);
  for (const h of m.houses) {
    if (new Set(h.map(i => grid[i])).size !== h.length) {
      errors.push('solution repeats a digit in a row, column, box or diagonal');
      break;
    }
  }
  // Every variant clue is true of the solution.
  for (const c of m.constraints) {
    if (!satisfiable(c, grid, n)) {
      errors.push(`solution breaks a ${c.type} clue at cells ${c.cells.join(',')}`);
    }
  }

  const givens = Object.entries(p.givens ?? {});
  for (const [cell, v] of givens) {
    if (grid[Number(cell)] !== v) errors.push(`given at ${cell} disagrees with the solution`);
  }
  if (givens.length < MEDIUM.minGivens || givens.length > MEDIUM.maxGivens) {
    errors.push(`${givens.length} givens is outside the medium band`);
  }

  // The variant actually has its clues.
  const need = {
    killer: () => p.cages?.length,
    kropki: () => p.kropki?.length,
    thermo: () => p.thermos?.length >= 2,
    arrow: () => p.arrows?.length >= 2,
    sandwich: () => [...(p.sandwich?.rows ?? []), ...(p.sandwich?.cols ?? [])].some(s => s != null),
    jigsaw: () => Array.isArray(p.regions),
    diagonal: () => p.diagonal === true,
  }[p.variant];
  if (need && !need()) errors.push(`${p.variant} puzzle has no ${p.variant} clues`);

  if (p.variant === 'killer') {
    const covered = (p.cages ?? []).flatMap(c => c.cells).sort((a, b) => a - b);
    if (covered.length !== total || covered.some((c, i) => c !== i)) {
      errors.push('cages must cover every cell exactly once');
    }
  }
  if (p.variant === 'jigsaw') {
    const counts = new Map();
    regionsFor(p).forEach(r => counts.set(r, (counts.get(r) ?? 0) + 1));
    if (counts.size !== n || [...counts.values()].some(c => c !== n)) {
      errors.push(`jigsaw needs ${n} regions of ${n} cells`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    checks: { givens: givens.length, constraints: m.constraints.length },
  };
}
