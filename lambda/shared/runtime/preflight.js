import { resolveProviderId, envKeysFor, dbEnvKeysFor } from '../constants/providers.js';

/**
 * Preflight: which providers a run will use, and which secrets are missing.
 * Runs before any network call so a misconfigured Lambda fails in a second,
 * with an alert naming the missing variable, instead of mid-pipeline.
 */

/** Env vars that are unset OR set to whitespace both count as missing. */
function missingEnv(keys, env) {
  return keys.filter(k => !env[k] || !String(env[k]).trim());
}

export function hasAlertChannel(env = process.env) {
  const sns = env.SNS_TOPIC_ARN?.trim();
  const tg = env.TELEGRAM_BOT_TOKEN?.trim() && env.TELEGRAM_CHAT_ID?.trim();
  return Boolean(sns || tg);
}

/**
 * Resolve which providers this run will use, falling back where a fallback is
 * actually available.
 *
 * The generator and the judge are resolved independently. JUDGE_PROVIDER lets
 * you run, say, Claude as the setter and Gemini as the reviewer — two model
 * families means they do not share a blind spot on the same clue. Left unset,
 * the judge follows AI_PROVIDER (each provider's judge client already uses a
 * cheaper model at a lower temperature).
 *
 * Shared by every game Lambda. Games that generate without AI (Sudoku, chess,
 * chronology, cryptogram) pass `needsAI: false`, so their preflight asks only
 * for the database secrets — they must not fail for want of a model key they
 * never use.
 *
 * This resolution used to live inline in the cryptic handler and was the
 * source of the bug where a non-Gemini run passed preflight without the
 * Gemini key its hardwired judge needed.
 */
export function resolveRunConfig(env = process.env, { needsAI = true } = {}) {
  const requestedAI = env.AI_PROVIDER || 'gemini';
  const dbProvider = env.DB_PROVIDER || 'supabase';

  const warnings = [];
  const absent = keys => missingEnv(keys, env);
  let aiProvider = resolveProviderId(requestedAI);

  if (!aiProvider) {
    warnings.push(`AI_PROVIDER="${requestedAI}" is not a known provider. Falling back to gemini.`);
    aiProvider = 'gemini';
  } else if (absent(envKeysFor(aiProvider)).length > 0) {
    // Requested provider has no credentials. Fall back to Gemini only if
    // Gemini itself is usable — otherwise keep the requested provider so the
    // preflight error names the secret the operator actually meant to set.
    const geminiUsable = absent(envKeysFor('gemini')).length === 0;
    if (geminiUsable && aiProvider !== 'gemini') {
      warnings.push(
        `AI_PROVIDER=${aiProvider} requested but ${absent(envKeysFor(aiProvider)).join(', ')} ` +
          `is missing. Falling back to gemini.`
      );
      aiProvider = 'gemini';
    }
  }

  const requestedJudge = env.JUDGE_PROVIDER || aiProvider;
  let judgeProvider = resolveProviderId(requestedJudge);
  if (!judgeProvider) {
    warnings.push(
      `JUDGE_PROVIDER="${requestedJudge}" is not a known provider. Using ${aiProvider}.`
    );
    judgeProvider = aiProvider;
  }

  // Both providers' secrets are required. The judge is a hard dependency:
  // without it every clue is rejected fail-safe and the run produces nothing.
  const missing = [
    ...new Set([
      ...(needsAI ? absent(envKeysFor(aiProvider)) : []),
      ...(needsAI ? absent(envKeysFor(judgeProvider)) : []),
      ...absent(dbEnvKeysFor(dbProvider)),
    ]),
  ];

  return { aiProvider, judgeProvider, dbProvider, missing, warnings };
}
