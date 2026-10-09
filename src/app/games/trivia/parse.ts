import { isObj, isSource, isStr, isStrArray } from '../parsers';
import type { TriviaPuzzle } from './sample';

/** One story question with a free-text answer. */
export function parseTrivia(raw: unknown): TriviaPuzzle | null {
  if (!isObj(raw)) return null;
  const { category, question, answer, accepted, fact, source } = raw;
  if (!isStr(category) || !isStr(question) || !isStr(answer) || !isStr(fact)) return null;
  if (!isStrArray(accepted) || accepted.length === 0 || !isSource(source)) return null;
  return raw as unknown as TriviaPuzzle;
}
