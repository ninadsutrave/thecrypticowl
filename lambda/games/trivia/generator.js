import { excerpt, fetchArticle } from '../../shared/sources/wikipedia.js';
import { buildWriterPrompt, QUESTIONS_SCHEMA, WRITER_SYSTEM } from './prompts.js';
import { reviewQuestion } from './reviewer.js';
import { CATEGORY_NAMES, TOPICS } from './topics.js';

/** Written per day; the judge keeps the best ten. */
export const CANDIDATE_QUESTIONS = 12;
const BATCH = 6;
const EXCERPT_CHARS = 2500;

/** Topics spread across categories: one per category before any repeats. */
export function pickTopics(rng, used, count) {
  const order = rng.shuffle(CATEGORY_NAMES);
  const picks = [];
  for (let round = 0; picks.length < count && round < 6; round++) {
    for (const category of order) {
      if (picks.length >= count) break;
      const pool = TOPICS[category].filter(
        t => !used.has(`wiki:${t}`) && !picks.some(p => p.topic === t)
      );
      if (pool.length) picks.push({ category, topic: rng.pick(pool) });
    }
  }
  return picks;
}

/**
 * Write the day's candidate questions: topics chosen in code, a random
 * stretch of each Wikipedia article as the only source, the generator model
 * writing one grounded question per source. Questions failing review are
 * dropped here, so the judge only sees sound ones.
 */
export async function generateTrivia(ctx, deps = {}) {
  const getArticle = deps.fetchArticle ?? fetchArticle;
  const picks = pickTopics(ctx.rng, ctx.used, CANDIDATE_QUESTIONS);

  const fetched = await Promise.allSettled(picks.map(p => getArticle(p.topic)));
  const sources = picks
    .map((p, i) =>
      fetched[i].status === 'fulfilled'
        ? {
            ...p,
            url: fetched[i].value.url,
            text: excerpt(fetched[i].value.text, ctx.rng, EXCERPT_CHARS),
          }
        : null
    )
    .filter(Boolean);
  if (sources.length < 10) throw new Error(`only ${sources.length} Wikipedia sources loaded`);

  const kept = [];
  const rejected = [];
  for (let i = 0; i < sources.length; i += BATCH) {
    const batch = sources.slice(i, i + BATCH);
    const out = await ctx.callAI(
      buildWriterPrompt(batch, ctx.feedback),
      WRITER_SYSTEM,
      QUESTIONS_SCHEMA
    );
    (out?.questions ?? []).forEach((q, k) => {
      const src = batch.find(s => s.topic === q?.topic) ?? batch[k];
      if (!src) return;
      const errs = reviewQuestion(q, src.text, q?.evidence);
      if (errs.length) {
        rejected.push(`${src.topic}: ${errs.join(', ')}`);
        return;
      }
      kept.push({
        category: src.category,
        question: String(q.question).trim(),
        options: q.options.map(o => String(o).trim()),
        answer: q.answer,
        fact: String(q.fact).trim(),
        source: { label: `${src.topic} on Wikipedia`, url: src.url },
        topic: src.topic,
      });
    });
  }

  return {
    payload: { questions: kept },
    sourceKeys: kept.map(q => `wiki:${q.topic}`),
    summary: `${kept.length} candidates written`,
    rejected,
  };
}
