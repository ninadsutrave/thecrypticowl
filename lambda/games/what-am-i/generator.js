import { excerpt, fetchAliases, fetchArticle } from '../../shared/sources/wikipedia.js';
import { CATEGORIES, categoryFor, INDIAN } from './candidates.js';
import { poolForDay } from '../../shared/runtime/india.js';
import { pickFresh } from '../../shared/runtime/pool.js';
import { buildWriterPrompt, CLUES_SCHEMA, WRITER_SYSTEM } from './prompts.js';

/** "Queen (band)" → "Queen": the disambiguator is Wikipedia's, not the answer's. */
export function displayName(title) {
  return title.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

/**
 * Names a player might reasonably type. Wikidata aliases include codes and
 * oddities ("IS" for Iceland), so very short or all-caps codes are dropped:
 * they would only let a lucky two-letter guess through.
 */
export function acceptedNames(answer, aliases) {
  const names = [answer, answer.replace(/,?\s+(Inc\.|Ltd\.?|plc|Corporation)$/i, ''), ...aliases];
  return [
    ...new Set(
      names
        .map(n => n.trim())
        .filter(n => n.length >= 3 && n.length <= 60)
        .filter(n => !/^[A-Z0-9]{2,4}$/.test(n))
    ),
  ];
}

export function dayIndex(date) {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
}

/**
 * Pick today's subject (no AI), fetch its Wikipedia article and aliases,
 * and have the generator model write five grounded clues.
 */
export async function generateWhatAmI(ctx, deps = {}) {
  const getArticle = deps.fetchArticle ?? fetchArticle;
  const getAliases = deps.fetchAliases ?? fetchAliases;

  const category = categoryFor(dayIndex(ctx.date));
  // Each answer once; if a category runs dry, the least recently used comes
  // back with fresh clues from a different stretch of its article.
  // Five days in eight, an Indian answer from the day's category.
  const key = t => `wiki:${t}`;
  const pool = poolForDay(CATEGORIES[category], t => INDIAN.has(t), key, ctx);
  const { item: title } = await pickFresh(pool, key, ctx);

  const article = await getArticle(title);
  const aliases = await getAliases(article.wikidataId).catch(() => []);
  const answer = displayName(article.title);
  const sourceText = excerpt(article.text, ctx.rng, 6000);

  const out = await ctx.callAI(
    buildWriterPrompt({
      category,
      answer,
      excerpt: sourceText,
      feedback: ctx.feedback,
      india: INDIAN.has(title),
    }),
    WRITER_SYSTEM,
    CLUES_SCHEMA
  );
  const clues = (out?.clues ?? []).map(c => ({
    text: String(c?.text ?? '').trim(),
    evidence: String(c?.evidence ?? '').trim(),
  }));

  return {
    payload: {
      category,
      answer,
      accepted: acceptedNames(answer, aliases),
      clues: clues.map(c => c.text),
      source: { label: `${article.title} on Wikipedia`, url: article.url },
    },
    sourceKeys: [`wiki:${title}`],
    // Not stored: Indian answers are judged against medium-hard.
    india: INDIAN.has(title),
    summary: `${answer} (${category})`,
    // Not stored: what the reviewer needs to check grounding.
    evidence: clues.map(c => c.evidence),
    sourceText,
  };
}
