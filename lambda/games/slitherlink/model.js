/**
 * Slitherlink geometry. A rows × cols grid of cells has (rows + 1) × cols
 * horizontal edges and rows × (cols + 1) vertical ones, numbered
 * horizontals first. Vertices are (rows + 1) × (cols + 1).
 */
export function makeGrid(rows, cols) {
  const H = (rows + 1) * cols;
  const h = (r, c) => r * cols + c; // top edge of row r, from vertex (r, c) rightwards
  const v = (r, c) => H + r * (cols + 1) + c; // left edge of column c, from (r, c) downwards
  const edges = H + rows * (cols + 1);
  const vertex = (r, c) => r * (cols + 1) + c;

  const cellEdges = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) cellEdges.push([h(r, c), h(r + 1, c), v(r, c), v(r, c + 1)]);
  }
  const vertexEdges = [];
  const ends = new Array(edges); // each edge's two vertices
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const list = [];
      if (c > 0) list.push(h(r, c - 1));
      if (c < cols) list.push(h(r, c));
      if (r > 0) list.push(v(r - 1, c));
      if (r < rows) list.push(v(r, c));
      vertexEdges.push(list);
    }
  }
  for (let r = 0; r <= rows; r++)
    for (let c = 0; c < cols; c++) ends[h(r, c)] = [vertex(r, c), vertex(r, c + 1)];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c <= cols; c++) ends[v(r, c)] = [vertex(r, c), vertex(r + 1, c)];

  return { rows, cols, edges, H, h, v, cellEdges, vertexEdges, ends };
}

/** Whether the "on" edges form exactly one closed loop. */
export function isSingleLoop(grid, on) {
  const degree = new Array(grid.vertexEdges.length).fill(0);
  const adj = new Map();
  let count = 0;
  for (let e = 0; e < grid.edges; e++) {
    if (!on[e]) continue;
    count++;
    const [a, b] = grid.ends[e];
    degree[a]++;
    degree[b]++;
    adj.set(a, [...(adj.get(a) ?? []), b]);
    adj.set(b, [...(adj.get(b) ?? []), a]);
  }
  if (!count || degree.some(d => d !== 0 && d !== 2)) return false;
  const start = adj.keys().next().value;
  const seen = new Set([start]);
  const stack = [start];
  while (stack.length)
    for (const n of adj.get(stack.pop())) if (!seen.has(n)) seen.add(n) && stack.push(n);
  return seen.size === adj.size;
}

/** The number each cell would show: how many of its sides the loop uses. */
export function cellCounts(grid, on) {
  return grid.cellEdges.map(es => es.filter(e => on[e]).length);
}

/** Edge bits as a compact string, "0101…", for storage. */
/**
 * Cells where a 0 sits beside a 3 (sharing a side), as [zero, three] index
 * pairs. The classic opening: the 0's sides are all off, so the side the 3
 * shares with it is off and the 3's other three sides are all on.
 */
export function zeroThreePairs(clues, rows, cols) {
  const v = k => String(clues[k] ?? '.');
  const pairs = [];
  for (let k = 0; k < rows * cols; k++) {
    if (v(k) !== '0') continue;
    const r = Math.floor(k / cols);
    const c = k % cols;
    const near = [
      r > 0 && k - cols,
      r < rows - 1 && k + cols,
      c > 0 && k - 1,
      c < cols - 1 && k + 1,
    ];
    for (const n of near) if (n !== false && v(n) === '3') pairs.push([k, n]);
  }
  return pairs;
}

export const toBits = on => Array.from(on, x => (x ? '1' : '0')).join('');
export const fromBits = s => Array.from(s, ch => (ch === '1' ? 1 : 0));
