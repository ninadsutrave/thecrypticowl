import { BOX_COLS, BOX_ROWS, SIZE, VARIANT_CONFIG } from './variants.js';
import { solve } from './solver.js';
import { regionsFor } from './model.js';

/**
 * Build one medium variant Sudoku.
 *
 *   1. A random filled grid that obeys the variant's structural rules
 *      (diagonals, irregular regions).
 *   2. Variant clues *read off* that grid — cages, dots, thermometers,
 *      arrows, sandwich sums — so they are true by construction.
 *   3. Givens stripped one at a time while the solution stays unique.
 *   4. `extraGivens` added back to soften the minimal puzzle to medium.
 *
 * Throws when a step can't succeed for this seed; the handler retries with
 * the next attempt's seed.
 */
export function generateSudoku(variant, rng, { maxNodes = 50_000 } = {}) {
  const config = VARIANT_CONFIG[variant];
  if (!config) throw new Error(`Unknown variant: ${variant}`);

  const base = { variant, size: SIZE, boxRows: BOX_ROWS, boxCols: BOX_COLS, givens: {} };
  if (variant === 'diagonal') base.diagonal = true;
  if (variant === 'jigsaw') base.regions = randomRegions(SIZE, rng);

  const filled = solve(base, { limit: 1, rng, maxNodes });
  if (filled.count !== 1) throw new Error('could not fill a grid for these regions');
  const solution = filled.solutions[0];

  const puzzle = { ...base, ...cluesFor(variant, solution, rng) };
  const unique = p => {
    const r = solve(p, { limit: 2, maxNodes });
    return !r.exhausted && r.count === 1;
  };

  // Start from a full grid of givens, so uniqueness holds from the outset.
  let givens = Object.fromEntries(solution.map((v, i) => [i, v]));
  for (const cell of rng.shuffle(Object.keys(givens))) {
    const next = { ...givens };
    delete next[cell];
    if (unique({ ...puzzle, givens: next })) givens = next;
  }

  // Dots and sandwich sums are all kept: stripping them to the minimum the
  // logic needs pushed Kropki and Sandwich well past medium in calibration.

  // Soften from minimal (hard) to medium.
  const empty = rng.shuffle(solution.map((_, i) => i).filter(i => givens[i] === undefined));
  for (const cell of empty.slice(0, config.extraGivens)) givens[cell] = solution[cell];

  return { ...puzzle, givens, solution: solution.join('') };
}

// ─── Variant clues, read off the solved grid ──────────────────────────────────

function cluesFor(variant, solution, rng) {
  switch (variant) {
    case 'killer':
      return { cages: killerCages(solution, rng) };
    case 'kropki':
      return { kropki: kropkiDots(solution, rng) };
    case 'thermo':
      return { thermos: thermometers(solution, rng) };
    case 'arrow':
      return { arrows: arrows(solution, rng) };
    case 'sandwich':
      return { sandwich: sandwichSums(solution) };
    default:
      return {};
  }
}

const orth = (i, n) => {
  const r = Math.floor(i / n);
  const c = i % n;
  return [
    [r - 1, c],
    [r + 1, c],
    [r, c - 1],
    [r, c + 1],
  ]
    .filter(([y, x]) => y >= 0 && x >= 0 && y < n && x < n)
    .map(([y, x]) => y * n + x);
};

const king = (i, n) => {
  const r = Math.floor(i / n);
  const c = i % n;
  const out = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (!dy && !dx) continue;
      const y = r + dy;
      const x = c + dx;
      if (y >= 0 && x >= 0 && y < SIZE && x < SIZE) out.push(y * SIZE + x);
    }
  return out;
};

/** Partition the grid into connected cages of 2–4 cells with no repeated digit. */
export function killerCages(solution, rng) {
  const n = SIZE;
  const owner = Array(n * n).fill(-1);
  const cages = [];
  for (const start of rng.shuffle(solution.map((_, i) => i))) {
    if (owner[start] !== -1) continue;
    const target = rng.pick([2, 2, 3, 3, 3, 4]);
    const cells = [start];
    owner[start] = cages.length;
    while (cells.length < target) {
      const frontier = cells
        .flatMap(c => orth(c, n))
        .filter(x => owner[x] === -1 && !cells.some(c => solution[c] === solution[x]));
      if (!frontier.length) break;
      const next = rng.pick(frontier);
      cells.push(next);
      owner[next] = cages.length;
    }
    cages.push(cells);
  }
  // Fold singletons into a neighbouring cage where the digit doesn't repeat.
  for (let k = 0; k < cages.length; k++) {
    if (cages[k].length !== 1) continue;
    const cell = cages[k][0];
    const host = orth(cell, n)
      .map(x => owner[x])
      .find(
        o =>
          o !== k &&
          cages[o].length > 0 &&
          cages[o].length < 5 &&
          !cages[o].some(c => solution[c] === solution[cell])
      );
    if (host !== undefined) {
      cages[host].push(cell);
      owner[cell] = host;
      cages[k] = [];
    }
  }
  return cages
    .filter(c => c.length)
    .map(cells => ({
      cells: [...cells].sort((a, b) => a - b),
      sum: cells.reduce((s, c) => s + solution[c], 0),
    }));
}

/** Dots on every orthogonal pair that qualifies (1–2 pairs get either colour). */
export function kropkiDots(solution, rng) {
  const n = SIZE;
  const dots = [];
  for (let i = 0; i < n * n; i++) {
    for (const j of orth(i, n)) {
      if (j <= i) continue;
      const a = solution[i];
      const b = solution[j];
      const white = Math.abs(a - b) === 1;
      const black = a === 2 * b || b === 2 * a;
      if (white && black) dots.push({ a: i, b: j, color: rng.chance(0.5) ? 'white' : 'black' });
      else if (white) dots.push({ a: i, b: j, color: 'white' });
      else if (black) dots.push({ a: i, b: j, color: 'black' });
    }
  }
  return dots;
}

/** 3–4 non-overlapping thermometers of 3–5 cells, digits rising from the bulb. */
export function thermometers(solution, rng) {
  const n = SIZE;
  const used = new Set();
  const thermos = [];
  const starts = rng.shuffle(solution.map((_, i) => i)).sort((a, b) => solution[a] - solution[b]);
  for (const start of starts) {
    if (thermos.length >= 4) break;
    if (used.has(start)) continue;
    const path = [start];
    while (path.length < 5) {
      const tail = path[path.length - 1];
      const next = king(tail, n).filter(
        x => !used.has(x) && !path.includes(x) && solution[x] > solution[tail]
      );
      if (!next.length) break;
      // Small steps keep long thermometers possible.
      next.sort((a, b) => solution[a] - solution[b]);
      path.push(rng.chance(0.7) ? next[0] : rng.pick(next));
    }
    if (path.length >= 3) {
      thermos.push(path);
      path.forEach(c => used.add(c));
    }
  }
  return thermos;
}

/** 3–4 arrows: a circled digit equal to the sum of a 2–3 cell path leaving it. */
export function arrows(solution, rng) {
  const n = SIZE;
  const used = new Set();
  const out = [];
  for (const circle of rng.shuffle(solution.map((_, i) => i))) {
    if (out.length >= 4) break;
    if (used.has(circle) || solution[circle] < 3) continue;
    const target = solution[circle];
    const paths = [];
    const walk = (path, sum) => {
      if (sum === target && path.length >= 2) paths.push([...path]);
      if (path.length >= 3 || sum >= target) return;
      const tail = path.length ? path[path.length - 1] : circle;
      for (const x of king(tail, n)) {
        if (x === circle || used.has(x) || path.includes(x)) continue;
        walk([...path, x], sum + solution[x]);
      }
    };
    walk([], 0);
    if (!paths.length) continue;
    const path = rng.pick(paths);
    out.push({ circle, path });
    [circle, ...path].forEach(c => used.add(c));
  }
  return out;
}

/** Sum between the 1 and the 6 in every row and column. */
export function sandwichSums(solution) {
  const n = SIZE;
  const between = cells => {
    const vals = cells.map(i => solution[i]);
    const a = vals.indexOf(1);
    const b = vals.indexOf(n);
    const [lo, hi] = a < b ? [a, b] : [b, a];
    return vals.slice(lo + 1, hi).reduce((s, v) => s + v, 0);
  };
  const rows = [];
  const cols = [];
  for (let k = 0; k < n; k++) {
    rows.push(between(Array.from({ length: n }, (_, x) => k * n + x)));
    cols.push(between(Array.from({ length: n }, (_, y) => y * n + k)));
  }
  return { rows, cols };
}

/**
 * Six connected irregular regions of six cells, grown from random seeds.
 * Not every region set admits a valid grid; the caller's fill step rejects
 * those and the handler retries with a new seed.
 */
export function randomRegions(n, rng, tries = 200) {
  for (let t = 0; t < tries; t++) {
    const region = Array(n * n).fill(-1);
    const seeds = rng.shuffle([...Array(n * n).keys()]).slice(0, n);
    seeds.forEach((s, r) => (region[s] = r));
    const sizes = Array(n).fill(1);
    let stuck = false;
    while (region.includes(-1) && !stuck) {
      stuck = true;
      for (const r of rng.shuffle([...Array(n).keys()])) {
        if (sizes[r] >= n) continue;
        const frontier = region
          .map((owner, i) => (owner === r ? i : -1))
          .filter(i => i >= 0)
          .flatMap(i => orth(i, n))
          .filter(i => region[i] === -1);
        if (!frontier.length) continue;
        region[rng.pick(frontier)] = r;
        sizes[r]++;
        stuck = false;
      }
    }
    if (!region.includes(-1) && sizes.every(s => s === n)) {
      // Reject sets that happen to equal the ordinary boxes: not a jigsaw.
      const boxes = regionsFor({ size: n, boxRows: BOX_ROWS, boxCols: BOX_COLS });
      const sameAsBoxes = region.every((r, i) =>
        region.every((r2, j) => (r === r2) === (boxes[i] === boxes[j]))
      );
      if (!sameAsBoxes) return region;
    }
  }
  throw new Error('could not grow irregular regions');
}
