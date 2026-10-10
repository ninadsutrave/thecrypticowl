import {
  GROQ_MODEL,
  GROQ_JUDGE_MODEL,
  GROQ_BASE_URL,
  GROQ_CONFIG,
  GROQ_JUDGE_CONFIG,
} from '../../constants/groq.js';
import { callOpenAICompatible } from './_openaiCompatible.js';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

/** Groq — hosts open models (GPT-OSS) behind OpenAI's chat-completions format. */
export function callGroq(
  prompt,
  systemInstruction = '',
  responseSchema = null,
  model = GROQ_MODEL,
  baseConfig = GROQ_CONFIG
) {
  return callOpenAICompatible(
    {
      providerLabel: 'groq',
      baseUrl: GROQ_BASE_URL,
      apiKey: GROQ_API_KEY,
      model,
      schemaMode: 'json_object',
    },
    prompt,
    systemInstruction,
    responseSchema,
    baseConfig
  );
}

export function callGroqJudge(prompt, systemInstruction, responseSchema) {
  return callGroq(prompt, systemInstruction, responseSchema, GROQ_JUDGE_MODEL, GROQ_JUDGE_CONFIG);
}
