import {
  DEEPSEEK_MODEL,
  DEEPSEEK_JUDGE_MODEL,
  DEEPSEEK_BASE_URL,
  DEEPSEEK_CONFIG,
  DEEPSEEK_JUDGE_CONFIG,
} from '../../constants/deepseek.js';
import { callOpenAICompatible } from './_openaiCompatible.js';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

/**
 * DeepSeek (V3 / R1) — speaks OpenAI's chat-completions wire format.
 * Supports `response_format: { type: 'json_object' }` for loose JSON mode.
 * Strict json_schema is not yet available, so we rely on prompt-driven shape
 * enforcement plus the lambda's downstream judge for validation.
 */
export function callDeepSeek(
  prompt,
  systemInstruction = '',
  responseSchema = null,
  model = DEEPSEEK_MODEL,
  baseConfig = DEEPSEEK_CONFIG
) {
  return callOpenAICompatible(
    {
      providerLabel: 'deepseek',
      baseUrl: DEEPSEEK_BASE_URL,
      apiKey: DEEPSEEK_API_KEY,
      model,
      schemaMode: 'json_object',
    },
    prompt,
    systemInstruction,
    responseSchema,
    baseConfig
  );
}

export function callDeepSeekJudge(prompt, systemInstruction, responseSchema) {
  return callDeepSeek(
    prompt,
    systemInstruction,
    responseSchema,
    DEEPSEEK_JUDGE_MODEL,
    DEEPSEEK_JUDGE_CONFIG
  );
}
