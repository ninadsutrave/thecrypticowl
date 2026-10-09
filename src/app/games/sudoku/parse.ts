import { isInt, isObj } from '../parsers';
import type { SudokuPuzzle } from './sample';
import { VARIANTS } from './variants';

const isCells = (v: unknown, total: number): v is number[] =>
  Array.isArray(v) && v.every(c => isInt(c) && c >= 0 && c < total);

/** Validate a generated Sudoku payload; null if anything is off. */
export function parseSudoku(raw: unknown): SudokuPuzzle | null {
  if (!isObj(raw)) return null;
  const { variant, size, boxRows, boxCols, givens, solution } = raw;
  if (typeof variant !== 'string' || !(variant in VARIANTS)) return null;
  if ((size !== 6 && size !== 9) || !isInt(boxRows) || !isInt(boxCols)) return null;
  if (boxRows * boxCols !== size) return null;
  const total = size * size;
  if (typeof solution !== 'string' || !new RegExp(`^[1-${size}]{${total}}$`).test(solution)) {
    return null;
  }
  if (!isObj(givens)) return null;
  for (const [cell, v] of Object.entries(givens)) {
    const i = Number(cell);
    if (!isInt(i) || i < 0 || i >= total || String(v) !== solution[i]) return null;
  }
  if (raw.regions !== undefined && !(isCells(raw.regions, size) && raw.regions.length === total)) {
    return null;
  }
  if (raw.cages !== undefined) {
    if (!Array.isArray(raw.cages)) return null;
    if (!raw.cages.every(c => isObj(c) && isInt(c.sum) && isCells(c.cells, total))) return null;
  }
  if (raw.kropki !== undefined) {
    if (!Array.isArray(raw.kropki)) return null;
    const ok = raw.kropki.every(
      d => isObj(d) && isCells([d.a, d.b], total) && (d.color === 'white' || d.color === 'black')
    );
    if (!ok) return null;
  }
  if (raw.thermos !== undefined) {
    if (!Array.isArray(raw.thermos) || !raw.thermos.every(t => isCells(t, total))) return null;
  }
  if (raw.arrows !== undefined) {
    if (!Array.isArray(raw.arrows)) return null;
    if (!raw.arrows.every(a => isObj(a) && isCells([a.circle], total) && isCells(a.path, total))) {
      return null;
    }
  }
  if (raw.sandwich !== undefined) {
    const s = raw.sandwich;
    const line = (v: unknown) =>
      Array.isArray(v) && v.length === size && v.every(x => x === null || isInt(x));
    if (!isObj(s) || !line(s.rows) || !line(s.cols)) return null;
  }
  return raw as unknown as SudokuPuzzle;
}
