import {
  MISTRAL_MODEL,
  MISTRAL_JUDGE_MODEL,
  MISTRAL_BASE_URL,
  MISTRAL_CONFIG,
  MISTRAL_JUDGE_CONFIG,
} from '../../constants/mistral.js';
import { callOpenAICompatible } from './_openaiCompatible.js';

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

/**
 * Mistral — OpenAI-compatible chat-completions endpoint with json_object mode.
 * mistral-large-latest also supports strict JSON-schema response_format on
 * recent versions; we use json_object here for stability across model ids.
 */
export function callMistral(
  prompt,
  systemInstruction = '',
  responseSchema = null,
  model = MISTRAL_MODEL,
  baseConfig = MISTRAL_CONFIG
) {
  return callOpenAICompatible(
    {
      providerLabel: 'mistral',
      baseUrl: MISTRAL_BASE_URL,
      apiKey: MISTRAL_API_KEY,
      model,
      schemaMode: 'json_object',
    },
    prompt,
    systemInstruction,
    responseSchema,
    baseConfig
  );
}

export function callMistralJudge(prompt, systemInstruction, responseSchema) {
  return callMistral(
    prompt,
    systemInstruction,
    responseSchema,
    MISTRAL_JUDGE_MODEL,
    MISTRAL_JUDGE_CONFIG
  );
}
