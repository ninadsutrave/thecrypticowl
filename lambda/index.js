import { getAIClient } from './clients/aiClient.js';
import { notify } from './core/alerts.js';
import { generateValidClue } from './core/pipeline.js';
import { writeToDB } from './services/dbService.js';

/**
 * Env vars required for the pipeline to run, keyed by provider.
 * The alert channels (SNS/Telegram) are checked separately — we still want
 * to ship a notification when operational vars are missing.
 */
const REQUIRED_ENV = {
  gemini: ['GEMINI_API_KEY'],
  supabase: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
};

function missingEnv(keys) {
  return keys.filter((k) => !process.env[k] || !String(process.env[k]).trim());
}

/**
 * AWS Lambda Entry Point
 * Triggers the daily cryptic clue generation pipeline.
 */
export const handler = async (event) => {
  const AI_PROVIDER = process.env.AI_PROVIDER || 'gemini';
  const DB_PROVIDER = process.env.DB_PROVIDER || 'supabase';

  // ── Preflight: required env vars ─────────────────────────────────────────────
  // If any operational secret is missing we must NOT run the pipeline (it would
  // burn retries hitting an unauthenticated API or crash writing to a nonexistent
  // DB client). Notify on whatever alert channels are configured and exit early.
  const missing = [
    ...missingEnv(REQUIRED_ENV[AI_PROVIDER] || []),
    ...missingEnv(REQUIRED_ENV[DB_PROVIDER] || []),
  ];
  const alertChannelsConfigured =
    (process.env.SNS_TOPIC_ARN && process.env.SNS_TOPIC_ARN.trim()) ||
    (process.env.TELEGRAM_BOT_TOKEN &&
      process.env.TELEGRAM_BOT_TOKEN.trim() &&
      process.env.TELEGRAM_CHAT_ID &&
      process.env.TELEGRAM_CHAT_ID.trim());

  if (missing.length > 0) {
    const msg =
      `Lambda aborted before pipeline start — required environment variables missing: ` +
      `${missing.join(', ')}. ` +
      `AI_PROVIDER=${AI_PROVIDER}, DB_PROVIDER=${DB_PROVIDER}. ` +
      `Configure these secrets and re-deploy before the next run.`;
    console.error('Preflight check failed:', msg);

    if (alertChannelsConfigured) {
      // notify() is defensive: Promise.allSettled means a missing channel won't
      // throw. Safe to call even if SNS_TOPIC_ARN or Telegram are the only one set.
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

  const callAI = getAIClient(AI_PROVIDER);

  try {
    // 1. Generate Clue
    const { lexical, clue, verdict } = await generateValidClue(callAI, AI_PROVIDER, DB_PROVIDER);

    // 2. Save to DB (verdict carries judge scores for persistence)
    const result = await writeToDB(lexical, clue, verdict, AI_PROVIDER, DB_PROVIDER);

    // 3. Notify
    if (result.skipped) {
      const skipMsg = `Puzzle already exists for ${result.date}. Generation skipped.`;
      console.log(skipMsg);
      await notify(skipMsg, true);
      return { statusCode: 200, body: JSON.stringify({ success: true, message: skipMsg }) };
    }

    const successMessage =
      `Generated Puzzle #${result.puzzleNumber} for *${lexical.answer}* (${lexical.type})\n\n` +
      `"${clue.clue}"\n\n` +
      `Score: ${verdict.score}/10 | Surface: ${verdict.surfaceQuality}/5 | Wordplay: ${verdict.wordplayCorrect ? '✓' : '✗'}`;
    await notify(successMessage, true);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        date: result.date,
        puzzleNumber: result.puzzleNumber,
        answer: lexical.answer,
        clue: clue.clue,
        provider: AI_PROVIDER,
      }),
    };
  } catch (err) {
    console.error('Lambda error:', err);
    await notify(`Failed to generate/insert clue:\n\`${err.message}\``, false);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: err.message,
      }),
    };
  }
};
