import {
  OPENAI_MODEL,
  OPENAI_JUDGE_MODEL,
  OPENAI_BASE_URL,
  OPENAI_CONFIG,
  OPENAI_JUDGE_CONFIG,
} from '../../constants/openai.js';
import { toJsonSchema } from './_schemaUtils.js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const MAX_RETRY_DELAY_MS = 120_000;
const MAX_RATE_LIMIT_RETRIES = 2;
const MAX_SERVER_ERROR_RETRIES = 2;
const REQUEST_TIMEOUT_MS = 90_000;
const TRANSIENT_STATUSES = new Set([500, 502, 503, 504]);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calls an OpenAI chat-completions endpoint with strict structured outputs.
 *
 * Same call signature as `callGemini` so the lambda's `getAIClient` factory
 * can swap providers transparently:
 *   (prompt, systemInstruction, responseSchema?, model?, baseConfig?)
 *
 * Strict structured outputs (`response_format: json_schema, strict: true`)
 * guarantees the model returns JSON matching the schema exactly — same
 * contract as Gemini's `responseSchema`.
 *
 * @param {string}      prompt
 * @param {string}      systemInstruction
 * @param {object|null} responseSchema   - Gemini-flavoured schema (auto-converted)
 * @param {string}      model            - OpenAI model id
 * @param {object}      baseConfig       - { temperature }
 * @param {number}      _retryCount      - internal
 */
export async function callOpenAI(
  prompt,
  systemInstruction = '',
  responseSchema = null,
  model = OPENAI_MODEL,
  baseConfig = OPENAI_CONFIG,
  _retryCount = 0
) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');

  const messages = [];
  if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
  messages.push({ role: 'user', content: prompt });

  const body = {
    model,
    messages,
    temperature: baseConfig.temperature,
  };

  if (responseSchema) {
    body.response_format = {
      type: 'json_schema',
      json_schema: {
        name: 'response',
        schema: toJsonSchema(responseSchema, { strict: true }),
        strict: true,
      },
    };
  }

  console.log(
    `[openai] calling ${model} (temperature: ${baseConfig.temperature}${_retryCount ? `, retry #${_retryCount}` : ''})`
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(OPENAI_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (_retryCount < MAX_SERVER_ERROR_RETRIES) {
      const delayMs = Math.min(5_000 * (1 + _retryCount), MAX_RETRY_DELAY_MS);
      console.warn(`[openai] network error (${err.message}). Retrying in ${delayMs}ms…`);
      await sleep(delayMs);
      return callOpenAI(
        prompt,
        systemInstruction,
        responseSchema,
        model,
        baseConfig,
        _retryCount + 1
      );
    }
    throw new Error(`OpenAI network error (${model}): ${err.message}`);
  }
  clearTimeout(timeoutId);

  // 429 — honour Retry-After when present.
  if (res.status === 429 && _retryCount < MAX_RATE_LIMIT_RETRIES) {
    const retryAfterSec = parseInt(res.headers.get('retry-after') ?? '', 10);
    const delayMs = Number.isFinite(retryAfterSec)
      ? Math.min(retryAfterSec * 1000, MAX_RETRY_DELAY_MS)
      : Math.min(30_000 * (1 + _retryCount), MAX_RETRY_DELAY_MS);
    console.warn(`[openai] 429 on ${model}. Retrying in ${(delayMs / 1000).toFixed(1)}s…`);
    await sleep(delayMs);
    return callOpenAI(
      prompt,
      systemInstruction,
      responseSchema,
      model,
      baseConfig,
      _retryCount + 1
    );
  }

  // Transient 5xx — exponential backoff.
  if (TRANSIENT_STATUSES.has(res.status) && _retryCount < MAX_SERVER_ERROR_RETRIES) {
    const delayMs = Math.min(5_000 * Math.pow(2, _retryCount), MAX_RETRY_DELAY_MS);
    console.warn(`[openai] ${res.status} on ${model}. Retrying in ${delayMs}ms…`);
    await sleep(delayMs);
    return callOpenAI(
      prompt,
      systemInstruction,
      responseSchema,
      model,
      baseConfig,
      _retryCount + 1
    );
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error (${model}): ${res.status} - ${errText}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error(`Empty OpenAI response from ${model}`);

  if (responseSchema) {
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Schema-mode JSON parse failed (${model}): ${text.substring(0, 200)}`);
    }
  }

  // Non-schema fallback — strip code fences then parse.
  try {
    return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
  } catch {
    throw new Error(`JSON parse failed (${model}): ${text.substring(0, 200)}`);
  }
}

/**
 * Judge variant — uses the lighter / cheaper model at low temperature.
 * Mirrors the Gemini flash-judge pattern.
 */
export function callOpenAIJudge(prompt, systemInstruction, responseSchema) {
  return callOpenAI(
    prompt,
    systemInstruction,
    responseSchema,
    OPENAI_JUDGE_MODEL,
    OPENAI_JUDGE_CONFIG
  );
}
