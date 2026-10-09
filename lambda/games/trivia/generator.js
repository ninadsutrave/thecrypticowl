import {
  excerpt,
  fetchAliases,
  fetchArticle,
  normaliseText,
} from '../../shared/sources/wikipedia.js';
import { pickFresh } from '../../shared/runtime/pool.js';
import { buildWriterPrompt, QUESTION_SCHEMA, WRITER_SYSTEM } from './prompts.js';
import { ALL_TOPICS } from './topics.js';

const EXCERPT_CHARS = 7000;

/** "Imagine (song)" → "Imagine": the disambiguator is Wikipedia's, not the answer's. */
export function displayName(title) {
  return title.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

/**
 * Names a player might reasonably type: the subject, its Wikidata aliases,
 * and the writer's shorter forms. Very short or all-caps codes are dropped,
 * and a shorter form only counts if it is part of a real name ("Diesel" for
 * Diesel engine) — the writer can't widen the answer to something else.
 */
export function acceptedNames(answer, aliases = [], alsoAccept = []) {
  const names = [answer, ...aliases]
    .map(n => String(n).trim())
    .filter(n => n.length >= 3 && n.length <= 60)
    .filter(n => !/^[A-Z0-9]{2,4}$/.test(n));
  const known = names.map(normaliseText);
  const shorter = alsoAccept
    .map(n => String(n).trim())
    .filter(n => normaliseText(n).length >= 4)
    .filter(n => known.some(k => ` ${k} `.includes(` ${normaliseText(n)} `)));
  return [...new Set([...names, ...shorter])];
}

/**
 * Pick today's subject (no AI), fetch its Wikipedia article and aliases, and
 * have the generator model write one story question grounded in it.
 */
export async function generateTrivia(ctx, deps = {}) {
  const getArticle = deps.fetchArticle ?? fetchArticle;
  const getAliases = deps.fetchAliases ?? fetchAliases;

  // Each subject once; when the list runs dry, the least recently used
  // returns, written from a different stretch of its article.
  const { item: pick } = await pickFresh(ALL_TOPICS, t => `wiki:${t.title}`, ctx);
  const article = await getArticle(pick.title);
  const aliases = await getAliases(article.wikidataId).catch(() => []);
  const answer = displayName(article.title);
  const sourceText = excerpt(article.text, ctx.rng, EXCERPT_CHARS);

  const out = await ctx.callAI(
    buildWriterPrompt({
      category: pick.category,
      answer,
      excerpt: sourceText,
      feedback: ctx.feedback,
    }),
    WRITER_SYSTEM,
    QUESTION_SCHEMA
  );

  return {
    payload: {
      category: pick.category,
      question: String(out?.question ?? '').trim(),
      answer,
      accepted: acceptedNames(answer, aliases, out?.alsoAccept ?? []),
      fact: String(out?.fact ?? '').trim(),
      source: { label: `${article.title} on Wikipedia`, url: article.url },
    },
    sourceKeys: [`wiki:${pick.title}`],
    summary: `${answer} (${pick.category})`,
    // Not stored: what the reviewer needs to check grounding.
    evidence: (out?.evidence ?? []).map(e => String(e).trim()),
    factEvidence: String(out?.factEvidence ?? '').trim(),
    sourceText,
  };
}
