import { solve } from './solver.js';

/**
 * Shikaku on a 10×10 grid, about 5–6 minutes at medium. Built in code:
 *
 *   1. Partition the grid into rectangles of 2–12 cells, scanning for the
 *      first uncovered cell and growing a random rectangle from it.
 *   2. Put each rectangle's area in one of its cells, chosen at random.
 *   3. Keep it only if the solver finds exactly one way to cut the grid, by
 *      logic plus a little search, and not too many clues are given away
 *      at the start (a clue with only one possible rectangle).
 * A partition whose clue placements never give one solution is discarded.
 */
export const SIZE = 10;
export const MEDIUM = {
  maxArea: 12,
  maxSide: 6,
  /** Guesses the solver may need; beyond this it's harder than medium. */
  maxNodes: 30,
  /** At most this share of clues may have a single possible rectangle. */
  maxForcedShare: 0.45,
};
const PLACEMENTS_PER_PARTITION = 25;

/** Rectangle sizes for growth, weighted towards the middle (3–8 cells). */
const AREA_WEIGHT = a => (a <= 1 ? 0 : a === 2 ? 1 : a <= 8 ? 3 : 1.5);

export function partition(rng) {
  for (let attempt = 0; attempt < 500; attempt++) {
    const owner = new Array(SIZE * SIZE).fill(-1);
    const rects = [];
    let failed = false;
    for (let start = owner.indexOf(-1); start >= 0; start = owner.indexOf(-1)) {
      const r = Math.floor(start / SIZE);
      const c = start % SIZE;
      // Every rectangle with (r, c) as its top-left corner that fits.
      const options = [];
      for (let h = 1; h <= MEDIUM.maxSide && r + h <= SIZE; h++) {
        for (let w = 1; w <= MEDIUM.maxSide && c + w <= SIZE; w++) {
          let free = true;
          for (let rr = r; rr < r + h && free; rr++) {
            for (let cc = c; cc < c + w; cc++) if (owner[rr * SIZE + cc] !== -1) free = false;
          }
          if (!free) break; // wider won't be free either
          if (h * w <= MEDIUM.maxArea && AREA_WEIGHT(h * w) > 0) options.push({ r, c, h, w });
        }
      }
      if (!options.length) {
        failed = true; // only a 1×1 fits here
        break;
      }
      const total = options.reduce((s, o) => s + AREA_WEIGHT(o.h * o.w), 0);
      let x = rng.next() * total;
      const rect = options.find(o => (x -= AREA_WEIGHT(o.h * o.w)) < 0) ?? options.at(-1);
      for (let rr = rect.r; rr < rect.r + rect.h; rr++) {
        for (let cc = rect.c; cc < rect.c + rect.w; cc++) owner[rr * SIZE + cc] = rects.length;
      }
      rects.push(rect);
    }
    if (!failed) return rects;
  }
  throw new Error('could not partition the grid');
}

export function placeClues(rects, rng) {
  return rects.map(({ r, c, h, w }) => ({
    r: r + rng.int(0, h - 1),
    c: c + rng.int(0, w - 1),
    n: h * w,
  }));
}

export function generateShikaku(rng) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const rects = partition(rng);
    for (let p = 0; p < PLACEMENTS_PER_PARTITION; p++) {
      const clues = placeClues(rects, rng);
      const r = solve({ size: SIZE, clues }, { limit: 2, maxNodes: MEDIUM.maxNodes * 20 });
      if (r.exhausted || r.count !== 1) continue;
      if (r.nodes > MEDIUM.maxNodes) continue;
      if (r.forcedAtStart / clues.length > MEDIUM.maxForcedShare) continue;
      // Store the solution in clue order: rectangle i holds clue i.
      return { size: SIZE, clues, solution: r.solutions[0] };
    }
  }
  throw new Error('no unique medium shikaku found');
}
