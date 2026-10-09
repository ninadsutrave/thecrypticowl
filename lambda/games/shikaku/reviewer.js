/**
 * Deterministic review, independent of the generator: the stored rectangles
 * cut the grid exactly, and each holds exactly one clue, its own, whose
 * number is its area.
 */
export function reviewShikaku(p) {
  const errors = [];
  const size = p?.size;
  const clues = p?.clues ?? [];
  const rects = p?.solution ?? [];
  if (!Number.isInteger(size) || size < 5 || size > 15) return { ok: false, errors: ['bad size'] };
  if (!clues.length || clues.length !== rects.length) {
    return { ok: false, errors: [`${clues.length} clues for ${rects.length} rectangles`] };
  }

  const owner = new Array(size * size).fill(-1);
  rects.forEach((rect, i) => {
    const { r, c, h, w } = rect;
    if (![r, c, h, w].every(Number.isInteger) || h < 1 || w < 1) {
      errors.push(`rectangle ${i} is malformed`);
      return;
    }
    if (r < 0 || c < 0 || r + h > size || c + w > size) {
      errors.push(`rectangle ${i} leaves the grid`);
      return;
    }
    for (let rr = r; rr < r + h; rr++) {
      for (let cc = c; cc < c + w; cc++) {
        const cell = rr * size + cc;
        if (owner[cell] !== -1) errors.push(`rectangles ${owner[cell]} and ${i} overlap`);
        owner[cell] = i;
      }
    }
  });
  if (owner.includes(-1)) errors.push('some cells are not covered');

  const seen = new Set();
  clues.forEach((k, i) => {
    const key = k.r * size + k.c;
    if (seen.has(key)) errors.push(`two clues share cell ${k.r},${k.c}`);
    seen.add(key);
    if (owner[key] !== i) errors.push(`clue ${i} is not inside rectangle ${i}`);
    const rect = rects[i];
    if (rect && rect.h * rect.w !== k.n)
      errors.push(`clue ${i} says ${k.n}, rectangle has ${rect.h * rect.w}`);
    if (k.n < 2) errors.push(`clue ${i} is a single cell`);
  });

  return { ok: errors.length === 0, errors, checks: { clues: clues.length } };
}
