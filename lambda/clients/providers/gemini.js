import {
  GEMINI_MODEL,
  GEMINI_JUDGE_MODEL,
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
    const retryInfo = details.find((d) =>
      d['@type']?.endsWith('RetryInfo') && d.retryDelay
    );
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
 * @param {string}      model            - Gemini model ID (defaults to GEMINI_MODEL)
 * @param {object}      baseConfig       - Generation config (defaults to GEMINI_CONFIG)
 * @param {number}      _retryCount      - internal: current retry depth (do not pass)
 */
export async function callGemini(
  prompt,
  systemInstruction = '',
  responseSchema = null,
  model = GEMINI_MODEL,
  baseConfig = GEMINI_CONFIG,
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

  console.log(`[gemini] calling model: ${model} (temperature: ${baseConfig.temperature}${_retryCount ? `, retry #${_retryCount}` : ''})`);

  const res = await fetch(
    `${GEMINI_BASE_URL}${model}${GEMINI_GENERATE_ACTION}?key=${GEMINI_API_KEY}`,
    {
      method: HTTP_METHODS.POST,
      headers: GEMINI_HEADERS,
      body: JSON.stringify(body),
    }
  );

  // ── Rate-limit handling ─────────────────────────────────────────────────────
  if (res.status === 429 && _retryCount < MAX_RATE_LIMIT_RETRIES) {
    let errBody = null;
    try { errBody = await res.json(); } catch { /* ignore */ }

    const delayMs = parseRetryDelayMs(errBody) ?? Math.min(30_000 * (1 + _retryCount), MAX_RETRY_DELAY_MS);
    console.warn(`[gemini] 429 rate-limited on ${model}. Waiting ${(delayMs / 1000).toFixed(1)}s before retry #${_retryCount + 1}…`);
    await sleep(delayMs);

    return callGemini(prompt, systemInstruction, responseSchema, model, baseConfig, _retryCount + 1);
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${model}): ${res.status} - ${errText}`);
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
 * Judge variant: Gemini 3 Flash at temperature 0.1.
 *
 * Different model family from the generator (2.5 Pro) → different blind spots.
 * Near-zero temperature → deterministic, consistent scoring across runs.
 */
export function callGeminiFlash(prompt, systemInstruction, responseSchema) {
  return callGemini(prompt, systemInstruction, responseSchema, GEMINI_JUDGE_MODEL, GEMINI_JUDGE_CONFIG);
}
