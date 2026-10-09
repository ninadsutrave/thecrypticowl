import { isObj, isStr } from '../parsers';
import type { SlitherlinkPuzzle } from './sample';

/** `{ rows, cols, clues: "..1.2…", solution: "0110…" }`, every length consistent. */
export function parseSlitherlink(raw: unknown): SlitherlinkPuzzle | null {
  if (!isObj(raw)) return null;
  const { rows, cols, clues, solution } = raw;
  if (!Number.isInteger(rows) || !Number.isInteger(cols)) return null;
  const r = rows as number;
  const c = cols as number;
  if (r < 2 || c < 2 || r > 15 || c > 15) return null;
  if (!isStr(clues) || clues.length !== r * c || !/^[.0-3]+$/.test(clues)) return null;
  const edges = (r + 1) * c + r * (c + 1);
  if (!isStr(solution) || solution.length !== edges || !/^[01]+$/.test(solution)) return null;
  return raw as unknown as SlitherlinkPuzzle;
}
