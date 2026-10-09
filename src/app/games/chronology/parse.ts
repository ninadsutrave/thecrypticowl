import { isInt, isObj, isStr } from '../parsers';
import type { ChronologyPuzzle } from './sample';

export function parseChronology(raw: unknown): ChronologyPuzzle | null {
  if (!isObj(raw) || !isStr(raw.day) || !Array.isArray(raw.events)) return null;
  if (raw.events.length < 3) return null;
  const ok = raw.events.every(
    e => isObj(e) && isStr(e.id) && isStr(e.text) && isInt(e.year) && isStr(e.url)
  );
  const years = raw.events.map(e => (e as { year: number }).year);
  return ok && new Set(years).size === years.length ? (raw as unknown as ChronologyPuzzle) : null;
}
