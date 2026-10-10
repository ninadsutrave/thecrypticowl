import { isObj, isStr } from '../parsers';
import type { HigherLowerPuzzle } from './sample';

const FORMATS = ['count', 'area', 'metres', 'kilometres', 'usd', 'inr', 'years'];

/** A theme's wording and format, plus eleven items with positive values. */
export function parseHigherLower(raw: unknown): HigherLowerPuzzle | null {
  if (!isObj(raw)) return null;
  const { title, noun, higher, lower, format, items } = raw;
  if (![title, noun, higher, lower].every(isStr)) return null;
  if (!isStr(format) || !FORMATS.includes(format)) return null;
  if (!Array.isArray(items) || items.length < 3) return null;
  const ok = items.every(
    x =>
      isObj(x) &&
      isStr(x.name) &&
      typeof x.description === 'string' &&
      typeof x.value === 'number' &&
      Number.isFinite(x.value) &&
      x.value > 0 &&
      isStr(x.url)
  );
  return ok ? (raw as unknown as HigherLowerPuzzle) : null;
}
