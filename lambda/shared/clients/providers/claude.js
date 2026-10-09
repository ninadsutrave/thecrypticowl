import {
  CLAUDE_MODEL,
  CLAUDE_JUDGE_MODEL,
  CLAUDE_BASE_URL,
  CLAUDE_API_VERSION,
  CLAUDE_MAX_TOKENS,
  CLAUDE_CONFIG,
  CLAUDE_JUDGE_CONFIG,
} from '../../constants/claude.js';
import { toJsonSchema } from './_schemaUtils.js';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const MAX_RETRY_DELAY_MS = 120_000;
const MAX_RATE_LIMIT_RETRIES = 2;
const MAX_SERVER_ERROR_RETRIES = 2;
const REQUEST_TIMEOUT_MS = 90_000;
const TRANSIENT_STATUSES = new Set([500, 502, 503, 504, 529]);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calls Anthropic Claude with structured-output enforcement via tool use.
 *
 * Anthropic doesn't expose a dedicated "json_schema" response format, so the
 * standard pattern is to define a single tool whose `input_schema` matches
 * the desired shape and force the model to call it (`tool_choice`). The
 * tool's `input` becomes our parsed object — no string-extraction needed.
 *
 * Same call signature as `callGemini` so getAIClient can swap providers.
 */
export async function callClaude(
  prompt,
  systemInstruction = '',
  responseSchema = null,
  model = CLAUDE_MODEL,
  baseConfig = CLAUDE_CONFIG,
  _retryCount = 0
) {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');

  const body = {
    model,
    max_tokens: CLAUDE_MAX_TOKENS,
    temperature: baseConfig.temperature,
    messages: [{ role: 'user', content: prompt }],
  };
  if (systemInstruction) body.system = systemInstruction;

  if (responseSchema) {
    body.tools = [
      {
        name: 'emit_response',
        description: 'Emit the structured response payload',
        input_schema: toJsonSchema(responseSchema),
      },
    ];
    body.tool_choice = { type: 'tool', name: 'emit_response' };
  }

  console.log(
    `[claude] calling ${model} (temperature: ${baseConfig.temperature}${_retryCount ? `, retry #${_retryCount}` : ''})`
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(CLAUDE_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': CLAUDE_API_VERSION,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (_retryCount < MAX_SERVER_ERROR_RETRIES) {
      const delayMs = Math.min(5_000 * (1 + _retryCount), MAX_RETRY_DELAY_MS);
      console.warn(`[claude] network error (${err.message}). Retrying in ${delayMs}ms…`);
      await sleep(delayMs);
      return callClaude(
        prompt,
        systemInstruction,
        responseSchema,
        model,
        baseConfig,
        _retryCount + 1
      );
    }
    throw new Error(`Claude network error (${model}): ${err.message}`);
  }
  clearTimeout(timeoutId);

  if (res.status === 429 && _retryCount < MAX_RATE_LIMIT_RETRIES) {
    const retryAfterSec = parseInt(res.headers.get('retry-after') ?? '', 10);
    const delayMs = Number.isFinite(retryAfterSec)
      ? Math.min(retryAfterSec * 1000, MAX_RETRY_DELAY_MS)
      : Math.min(30_000 * (1 + _retryCount), MAX_RETRY_DELAY_MS);
    console.warn(`[claude] 429 on ${model}. Retrying in ${(delayMs / 1000).toFixed(1)}s…`);
    await sleep(delayMs);
    return callClaude(
      prompt,
      systemInstruction,
      responseSchema,
      model,
      baseConfig,
      _retryCount + 1
    );
  }

  if (TRANSIENT_STATUSES.has(res.status) && _retryCount < MAX_SERVER_ERROR_RETRIES) {
    const delayMs = Math.min(5_000 * Math.pow(2, _retryCount), MAX_RETRY_DELAY_MS);
    console.warn(`[claude] ${res.status} on ${model}. Retrying in ${delayMs}ms…`);
    await sleep(delayMs);
    return callClaude(
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
    throw new Error(`Claude API error (${model}): ${res.status} - ${errText}`);
  }

  const data = await res.json();

  // Tool-use response: the model's parsed output is the `input` of the tool block.
  if (responseSchema) {
    const toolBlock = (data.content ?? []).find(b => b.type === 'tool_use');
    if (!toolBlock || typeof toolBlock.input !== 'object') {
      throw new Error(`Claude returned no tool_use block (${model})`);
    }
    return toolBlock.input;
  }

  // Plain text fallback.
  const text = (data.content ?? []).find(b => b.type === 'text')?.text;
  if (!text) throw new Error(`Empty Claude response from ${model}`);
  try {
    return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
  } catch {
    throw new Error(`JSON parse failed (${model}): ${text.substring(0, 200)}`);
  }
}

/** Judge variant — Haiku at low temperature. */
export function callClaudeJudge(prompt, systemInstruction, responseSchema) {
  return callClaude(
    prompt,
    systemInstruction,
    responseSchema,
    CLAUDE_JUDGE_MODEL,
    CLAUDE_JUDGE_CONFIG
  );
}
