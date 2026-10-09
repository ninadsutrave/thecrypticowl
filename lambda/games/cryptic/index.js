import { getAIClient, getJudgeClient } from '../../shared/clients/aiClient.js';
import { notify } from '../../shared/runtime/alerts.js';
import { generateValidClue } from './pipeline.js';
import { writeToDB } from './services/dbService.js';
import { hasAlertChannel, resolveRunConfig } from '../../shared/runtime/preflight.js';

export { resolveRunConfig };

/**
 * AWS Lambda entry point. Generates and publishes the daily cryptic clue.
 *
 * `{ "dryRun": true }` runs preflight and returns without any AI call or
 * database write. The deploy workflow invokes it that way as a smoke test, so
 * a missing secret surfaces the moment it is deployed rather than at 03:15 the
 * next morning.
 */
export const handler = async (event = {}) => {
  const { aiProvider, judgeProvider, dbProvider, missing, warnings } = resolveRunConfig();
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
        await notify(msg, false);
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

  console.log(`[preflight] ok — generator=${aiProvider}, judge=${judgeProvider}, db=${dbProvider}`);

  if (dryRun) {
    // Resolve the clients too: an unregistered provider throws here, which is
    // exactly the kind of misconfiguration a smoke test should catch.
    getAIClient(aiProvider);
    getJudgeClient(judgeProvider);
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

  const callAI = getAIClient(aiProvider);
  const callJudge = getJudgeClient(judgeProvider);

  try {
    const { lexical, clue, verdict, stats } = await generateValidClue(
      callAI,
      callJudge,
      dbProvider
    );

    const result = await writeToDB(lexical, clue, verdict, aiProvider, dbProvider);

    if (result.skipped) {
      const skipMsg = `Puzzle already exists for ${result.date}. Generation skipped.`;
      console.log(skipMsg);
      await notify(skipMsg, true);
      return { statusCode: 200, body: JSON.stringify({ success: true, message: skipMsg }) };
    }

    const successMessage =
      `Generated Puzzle #${result.puzzleNumber} for *${lexical.answer}* (${lexical.type})\n\n` +
      `"${clue.clue}"\n\n` +
      `Score: ${verdict.score}/10 | Surface: ${verdict.surfaceQuality}/5 | ` +
      `Wordplay: ${verdict.wordplayCorrect ? '✓' : '✗'}` +
      (verdict.mechanicallyVerified ? ' (arithmetic verified in code)' : '') +
      `\nAttempts: ${stats.clueGenerations} clue(s) across ${stats.lexicalSelections} word(s)` +
      `\nBy: ${aiProvider} · judged by ${judgeProvider}`;
    await notify(successMessage, true);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        date: result.date,
        puzzleNumber: result.puzzleNumber,
        answer: lexical.answer,
        clue: clue.clue,
        provider: aiProvider,
        judgeProvider,
        mechanicallyVerified: Boolean(verdict.mechanicallyVerified),
      }),
    };
  } catch (err) {
    console.error('Lambda error:', err);

    // Quota exhaustion is a billing/limits problem, not a code problem.
    // Naming it separately means the alert says what to actually do about it.
    const isQuotaExhausted = err?.quotaExhausted === true;
    const alertMessage = isQuotaExhausted
      ? `Lambda aborted — ${aiProvider} quota exhausted:\n\`${err.message}\`\n\n` +
        `Retrying this run won't help; enable paid tier or wait for the daily quota to reset.`
      : `Failed to generate/insert clue:\n\`${err.message}\``;
    await notify(alertMessage, false);

    return {
      statusCode: isQuotaExhausted ? 429 : 500,
      body: JSON.stringify({
        success: false,
        error: err.message,
        quotaExhausted: isQuotaExhausted,
      }),
    };
  }
};
