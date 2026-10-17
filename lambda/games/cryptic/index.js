import { getAIClient, getJudgeClient } from '../../shared/clients/aiClient.js';
import { notify } from '../../shared/runtime/alerts.js';
import { generateValidClue } from './pipeline.js';
import { nextFreeDate, writeToDB } from './services/dbService.js';
import { addDays, dateKey } from '../../shared/runtime/dates.js';
import { hasAlertChannel, resolveRunConfig } from '../../shared/runtime/preflight.js';

export { resolveRunConfig };

/**
 * A clue can take several minutes (up to 15 AI calls). After the first, the
 * next day is started only while this much time is left, so a run never
 * dies halfway through one.
 */
const MIN_TIME_FOR_ANOTHER_MS = 6 * 60_000;

function clampInt(raw, fallback, min, max) {
  const n = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

/**
 * AWS Lambda entry point. Generates and publishes cryptic clues until every
 * day up to PUZZLE_DAYS_AHEAD is stocked, earliest gap first, so a run that
 * failed yesterday is caught up today instead of leaving the buffer short.
 *
 * `{ "dryRun": true }` runs preflight and returns without any AI call or
 * database write. The deploy workflow invokes it that way as a smoke test, so
 * a missing secret surfaces the moment it is deployed rather than at 03:15 the
 * next morning.
 */
export function createCrypticHandler(deps = {}) {
  const generate = deps.generateValidClue ?? generateValidClue;
  const write = deps.writeToDB ?? writeToDB;
  const nextFree = deps.nextFreeDate ?? nextFreeDate;
  const alert = deps.notify ?? notify;

  return async (event = {}, context = {}) => {
    const env = deps.env ?? process.env;
    const { aiProvider, judgeProvider, dbProvider, missing, warnings } = resolveRunConfig(env);
    const dryRun = event?.dryRun === true;

    for (const w of warnings) console.warn(`[preflight] ${w}`);

    if (missing.length > 0) {
      const msg =
        `Lambda aborted before pipeline start — required environment variables missing: ` +
        `${missing.join(', ')}. ` +
        `AI_PROVIDER=${aiProvider}, JUDGE_PROVIDER=${judgeProvider}, DB_PROVIDER=${dbProvider}. ` +
        `Configure these secrets and re-deploy before the next run.`;
      console.error('Preflight check failed:', msg);

      if (hasAlertChannel()) {
        // notify() is defensive (Promise.allSettled internally), but a throw
        // here would mask the preflight failure we are trying to report.
        try {
          await alert(msg, false);
        } catch (notifyErr) {
          console.error('notify() itself threw during preflight alert:', notifyErr);
        }
      } else {
        console.error(
          'No alert channel configured either (SNS_TOPIC_ARN and TELEGRAM_* both missing). ' +
            'This failure is visible only in CloudWatch logs.'
        );
      }

      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: 'Missing required environment variables',
          missing,
        }),
      };
    }

    console.log(
      `[preflight] ok — generator=${aiProvider}, judge=${judgeProvider}, db=${dbProvider}`
    );

    if (dryRun) {
      // Resolve the clients too: an unregistered provider throws here, which is
      // exactly the kind of misconfiguration a smoke test should catch.
      (deps.getAIClient ?? getAIClient)(aiProvider);
      (deps.getJudgeClient ?? getJudgeClient)(judgeProvider);
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          dryRun: true,
          message: 'Preflight passed. No clue generated.',
          aiProvider,
          judgeProvider,
          dbProvider,
        }),
      };
    }

    const callAI = (deps.getAIClient ?? getAIClient)(aiProvider);
    const callJudge = (deps.getJudgeClient ?? getJudgeClient)(judgeProvider);
    const timeLeft = () => context.getRemainingTimeInMillis?.() ?? Infinity;
    const today = deps.today ?? dateKey();
    const lastDay = addDays(today, clampInt(env.PUZZLE_DAYS_AHEAD, 7, 0, 14));

    const made = [];
    let failure = null;
    let stoppedForTime = false;

    for (;;) {
      const date = await nextFree(dbProvider, today);
      if (date > lastDay) break;
      if (made.length > 0 && timeLeft() < MIN_TIME_FOR_ANOTHER_MS) {
        stoppedForTime = true;
        break;
      }
      try {
        const { lexical, clue, verdict, stats } = await generate(callAI, callJudge, dbProvider, {
          timeLeft,
        });
        const result = await write(lexical, clue, verdict, aiProvider, dbProvider);
        if (result.skipped) break; // a racing run filled it; nothing more to do here
        made.push({ result, lexical, clue, verdict, stats });
      } catch (err) {
        console.error('Lambda error:', err);
        failure = err;
        break; // the next date would fail the same way and burn the same quota
      }
    }

    const lines = made.map(
      ({ result, lexical, clue, verdict, stats }) =>
        `✓ ${result.date} — Puzzle #${result.puzzleNumber}: *${lexical.answer}* (${lexical.type})\n` +
        `"${clue.clue}"\n` +
        `Score: ${verdict.score}/10 | Surface: ${verdict.surfaceQuality}/5 | ` +
        `Wordplay: ${verdict.wordplayCorrect ? '✓' : '✗'}` +
        (verdict.mechanicallyVerified ? ' (arithmetic verified in code)' : '') +
        ` | ${stats.clueGenerations} clue(s) across ${stats.lexicalSelections} word(s)`
    );
    const stockedTo = await nextFree(dbProvider, today)
      .then(d => addDays(d, -1))
      .catch(() => null);

    if (failure) {
      const isQuotaExhausted = failure?.quotaExhausted === true;
      lines.push(
        isQuotaExhausted
          ? `✗ Aborted — ${aiProvider} quota exhausted:\n\`${failure.message}\`\n` +
              `Retrying this run won't help; wait for the daily quota to reset.`
          : `✗ Failed to generate/insert clue:\n\`${failure.message}\``
      );
    }
    if (stoppedForTime) lines.push('… out of time for another clue; the next run continues.');
    if (stockedTo) lines.push(`Stocked through ${stockedTo} (target ${lastDay}).`);
    lines.push(`By: ${aiProvider} · judged by ${judgeProvider}`);

    if (made.length === 0 && !failure) {
      const msg = `Already stocked through ${stockedTo ?? lastDay}. Nothing to generate.`;
      console.log(msg);
      return { statusCode: 200, body: JSON.stringify({ success: true, message: msg }) };
    }

    await alert(lines.join('\n\n'), !failure);
    return {
      statusCode: failure ? (failure.quotaExhausted ? 429 : 500) : 200,
      body: JSON.stringify({
        success: !failure,
        created: made.map(m => ({
          date: m.result.date,
          puzzleNumber: m.result.puzzleNumber,
          answer: m.lexical.answer,
          clue: m.clue.clue,
        })),
        stockedTo,
        ...(failure
          ? { error: failure.message, quotaExhausted: failure.quotaExhausted === true }
          : {}),
        provider: aiProvider,
        judgeProvider,
      }),
    };
  };
}

export const handler = createCrypticHandler();
