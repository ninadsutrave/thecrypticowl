import { getAIClient, getJudgeClient } from '../clients/aiClient.js';
import { notify } from './alerts.js';
import { notifySNS } from '../clients/providers/sns.js';
import { addDays, dateKey, dateWindow, isDateKey } from './dates.js';
import { hasAlertChannel, resolveRunConfig } from './preflight.js';
import { createRng } from './random.js';
import * as defaultStore from './store.js';

/**
 * The lifecycle every daily game Lambda shares. A game supplies three steps
 * and this module runs them, writes the result, and reports:
 *
 *   generate(ctx)        → candidate { payload, sourceKeys, meta? }
 *   review(candidate)    → { ok, errors[], checks? }   deterministic, free
 *   judge(candidate)     → { ok, feedback, score?, payload? }
 *                                                      independent verdict;
 *                                                      an AI model for the
 *                                                      AI-written games. A
 *                                                      judge may return a
 *                                                      trimmed `payload`
 *                                                      (Trivia drops single
 *                                                      bad questions).
 *   fallback(ctx)?       → candidate from a non-AI source, tried once after
 *                          every attempt failed; reviewed, not judged.
 *
 * A candidate ships only when the reviewer *and* the judge accept it. A
 * rejection's reasons are fed into the next attempt (`ctx.feedback`), so an
 * AI generator can correct itself rather than retrying blind.
 *
 * Each run fills a window of dates — yesterday to `aheadDays` ahead — so
 * every time zone's "today" exists and a few days of buffer ride out an
 * outage. Dates already in the table are skipped, so re-running is safe.
 *
 * Context a generator receives: date, attempt, a seeded `rng`, `used` (source
 * keys already taken), `usedSince(days)` (keys taken in the last N days, for
 * pools that may run dry), `feedback`, and the AI clients where configured.
 *
 * Events:
 *   {}                           normal scheduled run
 *   { dryRun: true }             preflight only — the deploy smoke test
 *   { preview: true, date? }     generate + review + judge one puzzle and
 *                                return it, without touching the database
 *   { date: 'YYYY-MM-DD' }       fill only that date
 */

/** Errors that must end the whole run, not just one attempt. */
const isFatal = e => e?.quotaExhausted === true || e?.abortRun === true;

/** Stop starting new dates when less than this much Lambda time remains. */
const DEFAULT_MIN_TIME_LEFT_MS = 90_000;

export function createGameHandler(spec, deps = {}) {
  const {
    game,
    label,
    needsAI = false,
    maxAttempts = 6,
    generator = needsAI ? null : 'algorithm',
  } = spec;
  const store = deps.store ?? defaultStore;
  const alert = deps.notify ?? notify;
  const stockAlert = deps.notifyStock ?? notifySNS;
  const source = `${label} Lambda`;

  return async function handler(event = {}, context = {}) {
    const env = deps.env ?? process.env;
    const config = resolveRunConfig(env, { needsAI });
    const aheadDays = clampInt(env.PUZZLE_DAYS_AHEAD, 3, 0, 14);
    for (const w of config.warnings) console.warn(`[preflight] ${w}`);

    // Preview never touches the database, so it does not need its secrets.
    const missing = event.preview
      ? config.missing.filter(k => !k.startsWith('SUPABASE_'))
      : config.missing;
    if (missing.length > 0) {
      const msg =
        `${label}: aborted before generation — missing environment variables: ` +
        `${missing.join(', ')}. Configure them and re-deploy.`;
      console.error('Preflight check failed:', msg);
      if (hasAlertChannel(env)) await safeAlert(alert, msg, false, source);
      return respond(500, {
        success: false,
        error: 'Missing required environment variables',
        missing,
      });
    }

    // Optional-AI games use a model when its keys are present and run
    // without one when they're not; preflight never requires them.
    const aiConfig = spec.optionalAI ? resolveRunConfig(env, { needsAI: true }) : null;
    const aiReady =
      needsAI || Boolean(aiConfig && aiConfig.missing.every(k => k.startsWith('SUPABASE_')));
    const aiProviders = needsAI ? config : (aiConfig ?? config);
    const ai = aiReady
      ? {
          callAI: (deps.getAIClient ?? getAIClient)(aiProviders.aiProvider),
          callJudge: (deps.getJudgeClient ?? getJudgeClient)(aiProviders.judgeProvider),
          aiProvider: aiProviders.aiProvider,
          judgeProvider: aiProviders.judgeProvider,
        }
      : {};

    if (event.dryRun === true) {
      return respond(200, {
        success: true,
        dryRun: true,
        game,
        message: 'Preflight passed. Nothing generated.',
        ...(needsAI ? { aiProvider: ai.aiProvider, judgeProvider: ai.judgeProvider } : {}),
      });
    }

    const today = deps.today ?? dateKey();
    if (event.date !== undefined && !isDateKey(event.date)) {
      return respond(400, { success: false, error: `Invalid date: ${event.date}` });
    }

    if (event.preview === true) {
      const date = event.date ?? today;
      try {
        const result = await produce({
          date,
          used: new Set(),
          usedSince: async () => new Set(),
          ai,
          env,
        });
        return respond(result.ok ? 200 : 422, { success: result.ok, game, date, ...result });
      } catch (err) {
        return respond(500, { success: false, game, date, error: err.message });
      }
    }

    const targets = event.date ? [event.date] : dateWindow(today, -1, aheadDays);
    const timeLeft = () =>
      typeof context.getRemainingTimeInMillis === 'function'
        ? context.getRemainingTimeInMillis()
        : Infinity;

    const created = [];
    const failed = [];
    const skippedForTime = [];
    let fatal = null;

    try {
      const existing = await store.existingDates(game, targets, config.dbProvider);
      const missingDates = targets.filter(d => !existing.has(d));
      const sinceDate = spec.repeatWindowDays ? addDays(today, -spec.repeatWindowDays) : null;
      const used = missingDates.length
        ? await store.usedSourceKeys(game, sinceDate, config.dbProvider)
        : new Set();
      // For generators whose pool can run dry: keys used in the last N days,
      // so they can fall back to reusing the least recent instead of failing.
      const recent = new Map();
      const usedSince = days => {
        if (!recent.has(days)) {
          recent.set(days, store.usedSourceKeys(game, addDays(today, -days), config.dbProvider));
        }
        return recent.get(days);
      };

      for (const date of missingDates) {
        if (timeLeft() < (spec.minTimeLeftMs ?? DEFAULT_MIN_TIME_LEFT_MS)) {
          skippedForTime.push(date);
          continue;
        }
        try {
          const result = await produce({ date, used, usedSince, ai, env });
          if (!result.ok) {
            failed.push({ date, reason: result.lastRejection });
            continue;
          }
          const { inserted } = await store.insertPuzzle(
            {
              game,
              puzzle_date: date,
              payload: result.payload,
              source_keys: result.sourceKeys,
              difficulty: 'medium',
              generator: needsAI
                ? `${ai.aiProvider} / judged by ${ai.judgeProvider}`
                : aiReady
                  ? `${generator} / screened by ${ai.judgeProvider}`
                  : generator,
              review: { attempts: result.attempts, checks: result.checks, judge: result.verdict },
            },
            config.dbProvider
          );
          // Later dates in this run must not reuse what this one just took.
          result.sourceKeys.forEach(k => used.add(k));
          created.push({ date, inserted, summary: result.summary, attempts: result.attempts });
        } catch (err) {
          if (isFatal(err)) {
            fatal = err;
            break;
          }
          console.error(`[${game}] ${date} failed:`, err);
          failed.push({ date, reason: err.message });
        }
      }
    } catch (err) {
      fatal = err;
    }

    const health = spec.healthCheck
      ? await safeHealth(spec.healthCheck, { env, store, dbProvider: config.dbProvider, today })
      : [];
    const ok = !fatal && failed.length === 0;
    const lines = [
      ...created.map(
        c => `✓ ${c.date}${c.summary ? ` — ${c.summary}` : ''} (attempt ${c.attempts})`
      ),
      ...failed.map(f => `✗ ${f.date} — ${f.reason}`),
      ...skippedForTime.map(d => `… ${d} — skipped, Lambda time running out (next run fills it)`),
      ...(fatal
        ? [
            fatal.quotaExhausted
              ? `Run aborted — ${ai.aiProvider} quota exhausted: ${fatal.message}`
              : `Run aborted: ${fatal.message}`,
          ]
        : []),
      ...health.map(h => `⚠️ ${h}`),
    ];

    // Low stock also goes out tagged "stock", which the owner's email
    // subscription filters for: weekly (Mondays) so it nudges without
    // nagging; every threshold gives at least three weeks' notice.
    if (health.length > 0 && isMonday(today)) {
      await stockAlert(
        [`${source}: puzzle stock is running low.`, '', ...health.map(h => `• ${h}`)].join('\n'),
        { subject: `Cryptic Owl: ${label} puzzles are running low`, kind: 'stock' }
      ).catch(err => console.error('Stock alert failed:', err.message));
    }

    // Quiet success: nothing to create and nothing wrong is not worth an alert.
    if (lines.length > 0) {
      await safeAlert(
        alert,
        lines.join('\n') || 'Nothing to do.',
        ok && health.length === 0,
        source
      );
    }

    return respond(fatal ? (fatal.quotaExhausted ? 429 : 500) : failed.length ? 500 : 200, {
      success: ok,
      game,
      window: targets,
      created: created.map(c => c.date),
      failed,
      skippedForTime,
      warnings: health,
    });
  };

  /**
   * Generate → review → judge, up to `maxAttempts`, for one date. Returns the
   * accepted candidate, or the last rejection when every attempt failed.
   */
  async function produce({ date, used, usedSince, ai, env }) {
    let feedback = null;
    let lastRejection = 'no attempt made';

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const ctx = {
        date,
        attempt,
        rng: createRng(`${game}:${date}:${attempt}`),
        used,
        usedSince,
        feedback,
        env,
        ...ai,
      };
      let candidate;
      try {
        candidate = await spec.generate(ctx);
      } catch (err) {
        if (isFatal(err)) throw err;
        lastRejection = `generator: ${err.message}`;
        console.warn(`[${game}] ${date} attempt ${attempt} generator failed: ${err.message}`);
        feedback = null;
        continue;
      }

      const review = spec.review(candidate, ctx);
      if (!review.ok) {
        lastRejection = `review: ${review.errors.join('; ')}`;
        console.log(`[${game}] ${date} attempt ${attempt} rejected — ${lastRejection}`);
        feedback = review.errors.join('\n');
        continue;
      }

      let verdict = { ok: true };
      if (spec.judge) {
        try {
          verdict = await spec.judge(candidate, ctx);
        } catch (err) {
          if (isFatal(err)) throw err;
          // An unreachable judge rejects fail-safe: nothing ships unjudged.
          verdict = { ok: false, feedback: `judge unavailable (${err.message})` };
        }
        if (!verdict.ok) {
          lastRejection = `judge: ${verdict.feedback}`;
          console.log(`[${game}] ${date} attempt ${attempt} rejected — ${lastRejection}`);
          feedback = verdict.feedback;
          continue;
        }
      }

      return {
        ok: true,
        attempts: attempt,
        payload: verdict.payload ?? candidate.payload,
        sourceKeys: candidate.sourceKeys ?? [],
        summary: candidate.summary,
        checks: review.checks ?? {},
        verdict: spec.judge ? verdict : null,
      };
    }
    if (spec.fallback) {
      try {
        const ctx = {
          date,
          attempt: maxAttempts + 1,
          rng: createRng(`${game}:${date}:fallback`),
          used,
          feedback: null,
          env,
          ...ai,
        };
        const candidate = await spec.fallback(ctx);
        const review = spec.review(candidate, ctx);
        if (review.ok) {
          return {
            ok: true,
            attempts: maxAttempts + 1,
            payload: candidate.payload,
            sourceKeys: candidate.sourceKeys ?? [],
            summary: `${candidate.summary ?? ''} (fallback source)`.trim(),
            checks: review.checks ?? {},
            verdict: { ok: true, feedback: 'fallback source, not judged' },
          };
        }
        lastRejection += `; fallback rejected: ${review.errors.join('; ')}`;
      } catch (err) {
        if (isFatal(err)) throw err;
        lastRejection += `; fallback failed: ${err.message}`;
      }
    }
    return { ok: false, attempts: maxAttempts, lastRejection };
  }
}

function respond(statusCode, body) {
  return { statusCode, body: JSON.stringify(body) };
}

function clampInt(value, fallback, min, max) {
  const n = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

async function safeAlert(alert, message, ok, source) {
  try {
    await alert(message, ok, source);
  } catch (err) {
    console.error('Alert failed:', err?.message ?? err);
  }
}

async function safeHealth(check, args) {
  try {
    return (await check(args)) ?? [];
  } catch (err) {
    return [`health check failed: ${err.message}`];
  }
}

/** Monday, for a date key (YYYY-MM-DD). */
function isMonday(key) {
  return new Date(`${key}T00:00:00Z`).getUTCDay() === 1;
}
