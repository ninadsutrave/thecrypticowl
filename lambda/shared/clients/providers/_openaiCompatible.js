import { toJsonSchema } from './_schemaUtils.js';

const MAX_RETRY_DELAY_MS = 120_000;
const MAX_RATE_LIMIT_RETRIES = 2;
const MAX_SERVER_ERROR_RETRIES = 2;
const REQUEST_TIMEOUT_MS = 90_000;
const TRANSIENT_STATUSES = new Set([500, 502, 503, 504]);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generic OpenAI-compatible chat-completions caller, parameterised by
 * provider-specific config. Used by DeepSeek, Grok, and Mistral — all of
 * which speak the OpenAI v1 chat-completions wire format with minor
 * differences in JSON-mode support.
 *
 * @param {object} cfg
 *   - providerLabel:   string (used in log lines + error messages)
 *   - baseUrl:         full chat-completions URL
 *   - apiKey:          bearer token
 *   - model:           model id
 *   - schemaMode:      'json_schema' | 'json_object' | 'none'
 *                      json_schema → strict outputs (OpenAI/Mistral support)
 *                      json_object → loose JSON mode (DeepSeek, Grok V1)
 *                      none        → fall back to prompt-driven JSON parsing
 * @param {string} prompt
 * @param {string} systemInstruction
 * @param {object|null} responseSchema
 * @param {object} baseConfig  - { temperature }
 * @param {number} _retryCount
 */
export async function callOpenAICompatible(
  cfg,
  prompt,
  systemInstruction,
  responseSchema,
  baseConfig,
  _retryCount = 0
) {
  const { providerLabel, baseUrl, apiKey, model, schemaMode } = cfg;
  if (!apiKey) throw new Error(`${providerLabel}: API key is not set`);

  const messages = [];
  if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
  messages.push({ role: 'user', content: prompt });

  const body = {
    model,
    messages,
    temperature: baseConfig.temperature,
  };

  if (responseSchema) {
    if (schemaMode === 'json_schema') {
      body.response_format = {
        type: 'json_schema',
        json_schema: {
          name: 'response',
          schema: toJsonSchema(responseSchema, { strict: true }),
          strict: true,
        },
      };
    } else if (schemaMode === 'json_object') {
      body.response_format = { type: 'json_object' };
    }
    // schemaMode === 'none' → leave body alone, rely on prompt JSON enforcement.
  }

  console.log(
    `[${providerLabel}] calling ${model} (temperature: ${baseConfig.temperature}${_retryCount ? `, retry #${_retryCount}` : ''})`
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (_retryCount < MAX_SERVER_ERROR_RETRIES) {
      const delayMs = Math.min(5_000 * (1 + _retryCount), MAX_RETRY_DELAY_MS);
      console.warn(`[${providerLabel}] network error (${err.message}). Retrying in ${delayMs}ms…`);
      await sleep(delayMs);
      return callOpenAICompatible(
        cfg,
        prompt,
        systemInstruction,
        responseSchema,
        baseConfig,
        _retryCount + 1
      );
    }
    throw new Error(`${providerLabel} network error (${model}): ${err.message}`);
  }
  clearTimeout(timeoutId);

  if (res.status === 429 && _retryCount < MAX_RATE_LIMIT_RETRIES) {
    const retryAfterSec = parseInt(res.headers.get('retry-after') ?? '', 10);
    const delayMs = Number.isFinite(retryAfterSec)
      ? Math.min(retryAfterSec * 1000, MAX_RETRY_DELAY_MS)
      : Math.min(30_000 * (1 + _retryCount), MAX_RETRY_DELAY_MS);
    console.warn(
      `[${providerLabel}] 429 on ${model}. Retrying in ${(delayMs / 1000).toFixed(1)}s…`
    );
    await sleep(delayMs);
    return callOpenAICompatible(
      cfg,
      prompt,
      systemInstruction,
      responseSchema,
      baseConfig,
      _retryCount + 1
    );
  }

  if (TRANSIENT_STATUSES.has(res.status) && _retryCount < MAX_SERVER_ERROR_RETRIES) {
    const delayMs = Math.min(5_000 * Math.pow(2, _retryCount), MAX_RETRY_DELAY_MS);
    console.warn(`[${providerLabel}] ${res.status} on ${model}. Retrying in ${delayMs}ms…`);
    await sleep(delayMs);
    return callOpenAICompatible(
      cfg,
      prompt,
      systemInstruction,
      responseSchema,
      baseConfig,
      _retryCount + 1
    );
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`${providerLabel} API error (${model}): ${res.status} - ${errText}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error(`Empty ${providerLabel} response from ${model}`);

  // Strip code fences before parsing — many JSON-mode-only providers still wrap.
  try {
    return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
  } catch {
    throw new Error(`${providerLabel} JSON parse failed (${model}): ${text.substring(0, 200)}`);
  }
}
