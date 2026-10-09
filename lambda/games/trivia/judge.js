import { QUESTIONS_PER_DAY } from './reviewer.js';
import { ANSWER_SCHEMA, buildSolverPrompt, SOLVER_SYSTEM } from './prompts.js';

/** No category may supply more than this many of the day's questions. */
const MAX_PER_CATEGORY = 2;

/**
 * Blind-answer judge on a different model: it answers every question from
 * its own knowledge, without the source. A question survives only if the
 * judge picks the marked answer and flags no ambiguity or problem. The best
 * ten survivors (spread across categories) become the day's quiz.
 */
export async function judgeTrivia(candidate, ctx) {
  const questions = candidate.payload.questions;
  const out = await ctx.callJudge(buildSolverPrompt(questions), SOLVER_SYSTEM, ANSWER_SCHEMA);
  const answers = out?.answers ?? [];

  const failures = [];
  const survivors = questions.filter((q, i) => {
    const a = answers[i];
    const ok = a && a.choice === q.answer && !a.ambiguous && !a.problem;
    if (!ok) {
      failures.push(
        `"${q.question}" — ${!a ? 'unanswered' : a.problem ? 'flagged as a problem' : a.ambiguous ? 'ambiguous' : `judge chose "${q.options[a.choice] ?? a.choice}"`}`
      );
    }
    return ok;
  });

  const perCategory = new Map();
  const chosen = [];
  for (const q of survivors) {
    const n = perCategory.get(q.category) ?? 0;
    if (n >= MAX_PER_CATEGORY || chosen.length >= QUESTIONS_PER_DAY) continue;
    perCategory.set(q.category, n + 1);
    chosen.push(q);
  }

  if (chosen.length < QUESTIONS_PER_DAY) {
    return {
      ok: false,
      feedback: `Only ${chosen.length} questions passed a blind check. Problems:\n${failures.join('\n')}`,
    };
  }
  // The topic was only needed for bookkeeping; the frontend doesn't show it.
  const clean = chosen.map(({ topic: _topic, ...q }) => q);
  return {
    ok: true,
    feedback: `${survivors.length}/${questions.length} passed a blind check`,
    score: survivors.length,
    payload: { questions: clean },
  };
}
