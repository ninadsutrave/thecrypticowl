import { isInt, isObj, isSource, isStr, isStrArray } from '../parsers';
import type { TriviaQuestion } from './sample';

/** Generated payloads are `{ questions: [...] }`. */
export function parseTrivia(raw: unknown): TriviaQuestion[] | null {
  if (!isObj(raw) || !Array.isArray(raw.questions) || raw.questions.length === 0) return null;
  const ok = raw.questions.every(
    q =>
      isObj(q) &&
      isStr(q.category) &&
      isStr(q.question) &&
      isStrArray(q.options, 4) &&
      isInt(q.answer) &&
      q.answer >= 0 &&
      q.answer < 4 &&
      isStr(q.fact) &&
      (q.source === undefined || isSource(q.source))
  );
  return ok ? (raw.questions as TriviaQuestion[]) : null;
}
