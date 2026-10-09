import {
  GROK_MODEL,
  GROK_JUDGE_MODEL,
  GROK_BASE_URL,
  GROK_CONFIG,
  GROK_JUDGE_CONFIG,
} from '../../constants/grok.js';
import { callOpenAICompatible } from './_openaiCompatible.js';

const XAI_API_KEY = process.env.XAI_API_KEY;

/**
 * xAI Grok — OpenAI-compatible chat-completions endpoint.
 * Recent models support `response_format: { type: 'json_schema', strict: true }`,
 * but we use json_object for portability across versions.
 */
export function callGrok(
  prompt,
  systemInstruction = '',
  responseSchema = null,
  model = GROK_MODEL,
  baseConfig = GROK_CONFIG
) {
  return callOpenAICompatible(
    {
      providerLabel: 'grok',
      baseUrl: GROK_BASE_URL,
      apiKey: XAI_API_KEY,
      model,
      schemaMode: 'json_object',
    },
    prompt,
    systemInstruction,
    responseSchema,
    baseConfig
  );
}

export function callGrokJudge(prompt, systemInstruction, responseSchema) {
  return callGrok(prompt, systemInstruction, responseSchema, GROK_JUDGE_MODEL, GROK_JUDGE_CONFIG);
}
