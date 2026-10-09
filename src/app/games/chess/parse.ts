import { isInt, isObj, isStr } from '../parsers';
import type { ChessPuzzle } from './sample';

const UCI = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

export function parseChess(raw: unknown): ChessPuzzle | null {
  if (!isObj(raw) || !isStr(raw.fen) || !isInt(raw.mateIn)) return null;
  if (!Array.isArray(raw.moves) || raw.moves.length < 2) return null;
  if (!raw.moves.every(m => typeof m === 'string' && UCI.test(m))) return null;
  const s = raw.source;
  if (!isObj(s) || !isStr(s.id) || !isInt(s.rating) || !isStr(s.url)) return null;
  return raw as unknown as ChessPuzzle;
}
