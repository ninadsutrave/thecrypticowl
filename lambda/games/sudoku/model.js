/**
 * The rule model shared by the solver, generator and reviewer: which cells
 * see each other, and every variant constraint as a predicate over a partial
 * grid (0 = empty).
 *
 * The puzzle object is exactly the payload the frontend renders
 * (src/app/games/sudoku/sample.ts):
 *   size, boxRows, boxCols, variant, givens, solution,
 *   regions?  (region id per cell — jigsaw),  diagonal?,
 *   cages?, kropki?, thermos?, arrows?, sandwich?
 */

export function regionsFor(p) {
  if (Array.isArray(p.regions)) return p.regions;
  const n = p.size;
  return Array.from({ length: n * n }, (_, i) => {
    const r = Math.floor(i / n);
    const c = i % n;
    return Math.floor(r / p.boxRows) * (n / p.boxCols) + Math.floor(c / p.boxCols);
  });
}

export function housesFor(p) {
  const n = p.size;
  const houses = [];
  for (let i = 0; i < n; i++) {
    houses.push(Array.from({ length: n }, (_, k) => i * n + k));
    houses.push(Array.from({ length: n }, (_, k) => k * n + i));
  }
  const regions = regionsFor(p);
  const byRegion = new Map();
  regions.forEach((reg, cell) => byRegion.set(reg, [...(byRegion.get(reg) ?? []), cell]));
  houses.push(...byRegion.values());
  if (p.diagonal) {
    houses.push(Array.from({ length: n }, (_, k) => k * n + k));
    houses.push(Array.from({ length: n }, (_, k) => k * n + (n - 1 - k)));
  }
  return houses;
}

/** Variant constraints as plain objects, each listing the cells it reads. */
export function constraintsFor(p) {
  const n = p.size;
  const out = [];
  for (const cage of p.cages ?? []) out.push({ type: 'cage', cells: cage.cells, sum: cage.sum });
  for (const d of p.kropki ?? []) out.push({ type: 'kropki', cells: [d.a, d.b], color: d.color });
  for (const t of p.thermos ?? []) out.push({ type: 'thermo', cells: t });
  for (const a of p.arrows ?? [])
    out.push({ type: 'arrow', cells: [a.circle, ...a.path], circle: a.circle, path: a.path });
  if (p.sandwich) {
    p.sandwich.rows.forEach((sum, r) => {
      if (sum != null) out.push({ type: 'sandwich', cells: line(n, r, true), sum });
    });
    p.sandwich.cols.forEach((sum, c) => {
      if (sum != null) out.push({ type: 'sandwich', cells: line(n, c, false), sum });
    });
  }
  return out;
}

function line(n, index, isRow) {
  return Array.from({ length: n }, (_, k) => (isRow ? index * n + k : k * n + index));
}

/**
 * Whether a partial grid can still satisfy constraint `c`. Exact once every
 * cell it reads is filled; a cheap necessary condition before then.
 */
export function satisfiable(c, grid, n) {
  switch (c.type) {
    case 'cage': {
      const vals = c.cells.map(i => grid[i]).filter(Boolean);
      if (new Set(vals).size !== vals.length) return false;
      const left = c.cells.length - vals.length;
      const rem = c.sum - vals.reduce((a, b) => a + b, 0);
      if (left === 0) return rem === 0;
      const avail = [];
      for (let d = 1; d <= n; d++) if (!vals.includes(d)) avail.push(d);
      if (avail.length < left) return false;
      const lo = avail.slice(0, left).reduce((a, b) => a + b, 0);
      const hi = avail.slice(-left).reduce((a, b) => a + b, 0);
      return rem >= lo && rem <= hi;
    }
    case 'kropki': {
      const [a, b] = c.cells.map(i => grid[i]);
      if (!a || !b) return true;
      return c.color === 'white' ? Math.abs(a - b) === 1 : a === 2 * b || b === 2 * a;
    }
    case 'thermo': {
      const len = c.cells.length;
      let prevK = -1;
      let prevV = 0;
      for (let k = 0; k < len; k++) {
        const v = grid[c.cells[k]];
        if (!v) continue;
        // Position k needs at least k smaller digits below it, and room above.
        if (v < k + 1 || v > n - (len - 1 - k)) return false;
        if (prevK >= 0 && v - prevV < k - prevK) return false;
        prevK = k;
        prevV = v;
      }
      return true;
    }
    case 'arrow': {
      const circle = grid[c.circle];
      let sum = 0;
      let open = 0;
      for (const i of c.path) {
        if (grid[i]) sum += grid[i];
        else open++;
      }
      const lo = sum + open;
      const hi = sum + open * n;
      if (circle) return lo <= circle && circle <= hi;
      return lo <= n;
    }
    case 'sandwich': {
      const vals = c.cells.map(i => grid[i]);
      const a = vals.indexOf(1);
      const b = vals.indexOf(n);
      if (a < 0 || b < 0) return true;
      const [lo, hi] = a < b ? [a, b] : [b, a];
      let sum = 0;
      let open = 0;
      for (let k = lo + 1; k < hi; k++) {
        if (vals[k]) sum += vals[k];
        else open++;
      }
      if (open === 0) return sum === c.sum;
      return sum + open * 2 <= c.sum && sum + open * (n - 1) >= c.sum;
    }
    default:
      throw new Error(`Unknown constraint ${c.type}`);
  }
}

/** Compile a puzzle into the arrays the solver walks. */
export function compile(p) {
  const n = p.size;
  const total = n * n;
  const houses = housesFor(p);
  const peers = Array.from({ length: total }, () => new Set());
  for (const h of houses) for (const a of h) for (const b of h) if (a !== b) peers[a].add(b);
  const constraints = constraintsFor(p);
  const byCell = Array.from({ length: total }, () => []);
  for (const c of constraints) for (const i of c.cells) byCell[i].push(c);
  return {
    n,
    total,
    houses,
    peers: peers.map(s => [...s]),
    constraints,
    byCell,
  };
}
