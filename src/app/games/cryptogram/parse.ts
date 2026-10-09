import { isObj, isSource, isStr, isStrArray } from '../parsers';
import { isValidKey } from './logic';
import type { CryptogramPuzzle } from './sample';

export function parseCryptogram(raw: unknown): CryptogramPuzzle | null {
  if (!isObj(raw) || !isStr(raw.text) || !isStr(raw.author) || !isSource(raw.source)) return null;
  if (typeof raw.key !== 'string' || !isValidKey(raw.key)) return null;
  if (!isStrArray(raw.given) || !raw.given.every(g => /^[A-Z]$/.test(g))) return null;
  return raw as unknown as CryptogramPuzzle;
}
