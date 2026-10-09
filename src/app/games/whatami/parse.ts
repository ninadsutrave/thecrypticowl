import { isObj, isSource, isStr, isStrArray } from '../parsers';
import type { WhatAmIPuzzle } from './sample';

export function parseWhatAmI(raw: unknown): WhatAmIPuzzle | null {
  if (!isObj(raw)) return null;
  const { category, answer, accepted, clues, source } = raw;
  if (!isStr(category) || !isStr(answer) || !isSource(source)) return null;
  if (!isStrArray(accepted) || accepted.length === 0 || !isStrArray(clues, 5)) return null;
  return raw as unknown as WhatAmIPuzzle;
}
