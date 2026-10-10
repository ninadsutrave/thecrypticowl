import {
  GEMINI_MODELS,
  GEMINI_JUDGE_MODELS,
  GEMINI_BASE_URL,
  GEMINI_GENERATE_ACTION,
  GEMINI_HEADERS,
  GEMINI_CONFIG,
  GEMINI_JUDGE_CONFIG,
  HTTP_METHODS,
} from '../../constants/gemini.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/** Maximum ms to wait on a single retry delay (2 minutes — stays under Lambda timeout). */
const MAX_RETRY_DELAY_MS = 120_000;
/** How many times to retry a single call after a rate-limit (429) response. */
const MAX_RATE_LIMIT_RETRIES = 2;
/** How many times to retry a single call after a transient 5xx response. */
const MAX_SERVER_ERROR_RETRIES = 2;
/** Per-request timeout (ms) — fails fast so a hung connection can't drain the Lambda budget. */
const REQUEST_TIMEOUT_MS = 90_000;
/** HTTP status codes considered transient and worth retrying. */
const TRANSIENT_STATUSES = new Set([500, 502, 503, 504]);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Parse the retryDelay duration string from a Gemini 429 error body.
 * Gemini returns it inside details[] as { "@type": "…RetryInfo", "retryDelay": "49s" }.
 * Returns milliseconds, capped at MAX_RETRY_DELAY_MS, or null if not found.
 *
 * @param {object} errBody  - parsed JSON error response from Gemini
 * @returns {number|null}
 */
function parseRetryDelayMs(errBody) {
  try {
    const details = errBody?.error?.details ?? [];
    const retryInfo = details.find(d => d['@type']?.endsWith('RetryInfo') && d.retryDelay);
    if (!retryInfo) return null;
    // retryDelay is a proto Duration string: "49s" or "49.213782892s"
    const seconds = parseFloat(retryInfo.retryDelay);
    if (!Number.isFinite(seconds) || seconds <= 0) return null;
    return Math.min(Math.ceil(seconds * 1000), MAX_RETRY_DELAY_MS);
  } catch {
    return null;
  }
}

/**
 * Detect quota-exhaustion signals that make retrying pointless within this run.
 * Two strong signals:
 *   1. The error message contains `limit: 0` — the project has no quota at all
 *      for this model (free-tier cap reached, or billing not enabled).
 *   2. A QuotaFailure violation references a per-day / per-project quota.
 * When either fires, the lambda must abort immediately rather than burn its
 * whole attempt budget on a quota that won't reset within the run.
 *
 * @param {object} errBody
 * @returns {{ exhausted: boolean, reason?: string }}
 */
function detectQuotaExhaustion(errBody) {
  const msg = String(errBody?.error?.message ?? '');
  if (/\blimit:\s*0\b/i.test(msg)) {
    return {
      exhausted: true,
      reason: 'Gemini reports limit: 0 — no quota available for this model.',
    };
  }
  const details = errBody?.error?.details ?? [];
  const quotaFailure = details.find(d => d['@type']?.endsWith('QuotaFailure'));
  const violations = quotaFailure?.violations ?? [];
  const daily = violations.find(v => /PerDay/i.test(v.quotaId ?? ''));
  if (daily) {
    return {
      exhausted: true,
      reason: `Daily Gemini quota exhausted (quotaId=${daily.quotaId}). Retries will not recover.`,
    };
  }
  return { exhausted: false };
}

/**
 * Error subtype the pipeline can recognise and short-circuit on. Extending
 * Error and tagging a flag is enough — no need for instanceof checks across
 * module boundaries.
 */
class GeminiQuotaExhaustedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GeminiQuotaExhaustedError';
    this.quotaExhausted = true;
  }
}

/**
 * Calls a Gemini model with optional responseSchema enforcement.
 * Automatically retries on 429 (RESOURCE_EXHAUSTED), honouring the retryDelay
 * from the API response when present (capped at MAX_RETRY_DELAY_MS).
 *
 * When responseSchema is provided:
 *   - Gemini's JSON mode is fully enforced — the response is guaranteed to match
 *     the schema shape, so we parse it directly without any regex extraction.
 *
 * When responseSchema is omitted:
 *   - Falls back to regex extraction in case the model adds preamble text.
 *
 * @param {string}      prompt
 * @param {string}      systemInstruction
 * @param {object|null} responseSchema   - Gemini OpenAPI-style schema object
 * @param {string|string[]} models        - model ID, or IDs in order of preference
 * @param {object}      baseConfig       - Generation config (defaults to GEMINI_CONFIG)
 * @param {number}      _retryCount      - internal: current retry depth (do not pass)
 */
/** The model that answered last time, per list: skip retired IDs after the first call. */
const working = new Map();

/**
 * Errors where another model may still work: the ID is retired (404), or
 * this key has no quota at all for it ("limit: 0", e.g. a Pro preview on the
 * free tier). A daily cap running out is not one of these: it stops the run.
 */
const isRetired = err =>
  /Gemini API error \([^)]*\): 404\b/.test(String(err?.message)) ||
  /limit: 0/.test(String(err?.message));

/**
 * Calls the first available model in `models` (a list, or one ID). A 404 for
 * a retired model moves on to the next; any other error is thrown as is.
 */
export async function callGemini(
  prompt,
  systemInstruction = '',
  responseSchema = null,
  models = GEMINI_MODELS,
  baseConfig = GEMINI_CONFIG
) {
  const list = Array.isArray(models) ? models : [models];
  const key = list.join('|');
  const start = Math.max(0, list.indexOf(working.get(key)));
  let lastErr;
  for (const model of list.slice(start)) {
    try {
      const out = await callGeminiModel(
        prompt,
        systemInstruction,
        responseSchema,
        model,
        baseConfig
      );
      working.set(key, model);
      return out;
    } catch (err) {
      if (!isRetired(err)) throw err;
      console.warn(`[gemini] ${model} is unavailable to this key; trying the next model`);
      lastErr = err;
    }
  }
  throw lastErr;
}

async function callGeminiModel(
  prompt,
  systemInstruction,
  responseSchema,
  model,
  baseConfig,
  _retryCount = 0
) {
  const generationConfig = { ...baseConfig };
  if (responseSchema) {
    generationConfig.responseSchema = responseSchema;
  }

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig,
  };

  if (systemInstruction) {
    body.system_instruction = { parts: [{ text: systemInstruction }] };
  }

  console.log(
    `[gemini] calling model: ${model} (temperature: ${baseConfig.temperature}${_retryCount ? `, retry #${_retryCount}` : ''})`
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res;
  try {
    // The key travels in a header, not the query string. A URL-embedded key
    // leaks into access logs, proxy logs and error traces — several of which
    // this code path prints verbatim into alerts.
    res = await fetch(`${GEMINI_BASE_URL}${model}${GEMINI_GENERATE_ACTION}`, {
      method: HTTP_METHODS.POST,
      headers: { ...GEMINI_HEADERS, 'x-goog-api-key': GEMINI_API_KEY },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    // Retry network failures (aborts, DNS, connection resets) as transient.
    if (_retryCount < MAX_SERVER_ERROR_RETRIES) {
      const delayMs = Math.min(5_000 * (1 + _retryCount), MAX_RETRY_DELAY_MS);
      const reason =
        err.name === 'AbortError' ? `timeout after ${REQUEST_TIMEOUT_MS}ms` : err.message;
      console.warn(
        `[gemini] network error on ${model} (${reason}). Waiting ${(delayMs / 1000).toFixed(1)}s before retry #${_retryCount + 1}…`
      );
      await sleep(delayMs);
      return callGeminiModel(
        prompt,
        systemInstruction,
        responseSchema,
        model,
        baseConfig,
        _retryCount + 1
      );
    }
    throw new Error(`Gemini network error (${model}): ${err.message}`);
  }
  clearTimeout(timeoutId);

  // ── Rate-limit handling ─────────────────────────────────────────────────────
  // Read the body ONCE, as text, and keep it. A Response body is a
  // single-use stream: the previous version called res.json() here and then
  // res.text() again in the !res.ok branch below, so a 429 with its retries
  // exhausted threw "Body is unusable" and that opaque message — not the
  // rate-limit detail — is what landed in the Telegram alert.
  let errRaw = null;
  if (!res.ok) {
    errRaw = await res.text().catch(() => '');
  }

  if (res.status === 429) {
    let errBody = null;
    try {
      errBody = JSON.parse(errRaw);
    } catch {
      /* non-JSON error body */
    }

    // If the quota is fundamentally exhausted (daily cap, limit:0 — e.g. free
    // tier with no remaining calls), retrying within this invocation can't
    // recover. Throw a distinct error so the pipeline stops immediately
    // instead of burning its retry budget.
    const quota = detectQuotaExhaustion(errBody);
    if (quota.exhausted) {
      console.error(`[gemini] ${model}: ${quota.reason}`);
      throw new GeminiQuotaExhaustedError(`Gemini quota exhausted (${model}): ${quota.reason}`);
    }

    if (_retryCount < MAX_RATE_LIMIT_RETRIES) {
      const delayMs =
        parseRetryDelayMs(errBody) ?? Math.min(30_000 * (1 + _retryCount), MAX_RETRY_DELAY_MS);
      console.warn(
        `[gemini] 429 rate-limited on ${model}. Waiting ${(delayMs / 1000).toFixed(1)}s before retry #${_retryCount + 1}…`
      );
      await sleep(delayMs);

      return callGeminiModel(
        prompt,
        systemInstruction,
        responseSchema,
        model,
        baseConfig,
        _retryCount + 1
      );
    }
  }

  // ── Transient 5xx handling — exponential backoff ────────────────────────────
  if (TRANSIENT_STATUSES.has(res.status) && _retryCount < MAX_SERVER_ERROR_RETRIES) {
    const delayMs = Math.min(5_000 * Math.pow(2, _retryCount), MAX_RETRY_DELAY_MS);
    console.warn(
      `[gemini] ${res.status} on ${model}. Waiting ${(delayMs / 1000).toFixed(1)}s before retry #${_retryCount + 1}…`
    );
    await sleep(delayMs);
    return callGeminiModel(
      prompt,
      systemInstruction,
      responseSchema,
      model,
      baseConfig,
      _retryCount + 1
    );
  }

  if (!res.ok) {
    throw new Error(`Gemini API error (${model}): ${res.status} - ${errRaw ?? ''}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) throw new Error(`Empty Gemini response from ${model}`);

  // Schema-enforced: response is guaranteed valid JSON — parse directly.
  if (responseSchema) {
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Schema-mode JSON parse failed (${model}): ${text.substring(0, 200)}`);
    }
  }

  // Fallback: strip markdown fences then extract the last valid JSON object.
  try {
    const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
    const jsonMatches = [
      ...cleanText.matchAll(/\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{[^{}]*\}))*\}))*\}/g),
    ];
    if (jsonMatches.length > 0) {
      return JSON.parse(jsonMatches[jsonMatches.length - 1][0]);
    }
    return JSON.parse(cleanText);
  } catch {
    throw new Error(`JSON parse failed (${model}): ${text.substring(0, 200)}`);
  }
}

/**
 * Judge variant: Gemini Flash at temperature 0.1.
 *
 * Different model from the generator (Pro) → different blind spots.
 * Near-zero temperature → deterministic, consistent scoring across runs.
 */
export function callGeminiFlash(prompt, systemInstruction, responseSchema) {
  return callGemini(
    prompt,
    systemInstruction,
    responseSchema,
    GEMINI_JUDGE_MODELS,
    GEMINI_JUDGE_CONFIG
  );
}
