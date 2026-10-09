import { isGrounded } from '../../shared/sources/wikipedia.js';
import { findLeak } from '../../shared/runtime/leaks.js';

const MIN_WORDS = 60;
const MAX_WORDS = 150;
const MIN_FACTS = 3;

/**
 * Free, deterministic checks before any judge call: the story shape, no
 * answer leak, no multiple choice sneaking back in, and every fact backed by
 * a sentence really in the source. Fallback (bank) questions carry no
 * source text, so only the shape and leak checks apply to them.
 */
export function reviewTrivia(candidate) {
  const { payload, evidence = [], factEvidence = '', sourceText = null } = candidate;
  const errors = [];
  const question = String(payload?.question ?? '').trim();
  const accepted = payload?.accepted ?? [];

  const words = question.split(/\s+/).filter(Boolean).length;
  if (words < MIN_WORDS || words > MAX_WORDS) {
    errors.push(`question has ${words} words (want ${MIN_WORDS}–${MAX_WORDS})`);
  }
  const sentences = question.split(/(?<=[.!?])\s+/).filter(s => s.length > 3);
  const last = sentences[sentences.length - 1] ?? '';
  if (!/\?$/.test(last) && !/^(name|identify)\b.*\.$/i.test(last)) {
    errors.push('question must end by asking for the answer');
  }
  if (sentences.length < 3) errors.push(`only ${sentences.length} sentences (want 4–6)`);
  if (/(^|\s)[A-D]\)\s|which of the following|multiple choice/i.test(question)) {
    errors.push('looks like multiple choice — it must be free text');
  }
  if (!accepted.length) errors.push('no accepted answer names');
  const leaked = findLeak(question, accepted);
  if (leaked) errors.push(`question gives away the answer ("${leaked}")`);

  const fact = String(payload?.fact ?? '').trim();
  if (fact.length < 20 || fact.length > 320) errors.push('fact missing or too long');
  if (!payload?.source?.url) errors.push('no source');

  if (sourceText !== null) {
    if (evidence.length < MIN_FACTS) {
      errors.push(`only ${evidence.length} facts cited (want ${MIN_FACTS}–5)`);
    }
    evidence.forEach((e, i) => {
      if (!isGrounded(e, sourceText))
        errors.push(`evidence ${i + 1} is not a sentence from the source`);
    });
    if (!isGrounded(factEvidence, sourceText))
      errors.push("the fact's evidence is not in the source");
  }

  return {
    ok: errors.length === 0,
    errors,
    checks: { words, sentences: sentences.length, facts: evidence.length },
  };
}
