import { isGrounded, normaliseText } from '../../shared/sources/wikipedia.js';

export const QUESTIONS_PER_DAY = 10;

/** Checks for one question. `sourceText` is omitted for fallback questions. */
export function reviewQuestion(q, sourceText = null, evidence = null) {
  const errors = [];
  const options = Array.isArray(q?.options) ? q.options.map(o => String(o).trim()) : [];
  if (options.length !== 4) errors.push('needs exactly 4 options');
  if (new Set(options.map(normaliseText)).size !== options.length) errors.push('duplicate options');
  if (!Number.isInteger(q?.answer) || q.answer < 0 || q.answer > 3)
    errors.push('answer index out of range');

  const question = String(q?.question ?? '').trim();
  const words = question.split(/\s+/).filter(Boolean).length;
  if (words < 5 || words > 32) errors.push(`question has ${words} words`);
  if (/\bnot\b.*\?$|all of the above|none of the above/i.test(question)) {
    errors.push('negative or catch-all question');
  }
  const correct = options[q?.answer] ?? '';
  const nCorrect = normaliseText(correct);
  if (nCorrect.length >= 4 && ` ${normaliseText(question)} `.includes(` ${nCorrect} `)) {
    errors.push('question contains its own answer');
  }
  const fact = String(q?.fact ?? '').trim();
  if (fact.length < 10 || fact.length > 320) errors.push('fact missing or too long');

  if (sourceText !== null) {
    if (!isGrounded(evidence ?? '', sourceText))
      errors.push('evidence is not a sentence from the source');
    const keyWords = nCorrect.split(' ').filter(w => w.length >= 4 || /\d/.test(w));
    const nEvidence = ` ${normaliseText(evidence ?? '')} `;
    if (keyWords.length && !keyWords.every(w => nEvidence.includes(` ${w}`))) {
      errors.push('evidence does not mention the correct answer');
    }
  }
  return errors;
}

/** Review a day's quiz: exactly the right number, every question sound. */
export function reviewTrivia(candidate) {
  const questions = candidate.payload?.questions ?? [];
  const errors = [];
  if (questions.length < QUESTIONS_PER_DAY) {
    errors.push(`only ${questions.length} usable questions (need ${QUESTIONS_PER_DAY})`);
  }
  questions.forEach((q, i) => {
    const errs = reviewQuestion(q);
    if (errs.length) errors.push(`Q${i + 1}: ${errs.join(', ')}`);
  });
  return { ok: errors.length === 0, errors, checks: { questions: questions.length } };
}
