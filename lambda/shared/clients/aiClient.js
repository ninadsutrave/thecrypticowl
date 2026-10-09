import { callGemini, callGeminiFlash } from './providers/gemini.js';
import { callOpenAI, callOpenAIJudge } from './providers/openai.js';
import { callClaude, callClaudeJudge } from './providers/claude.js';
import { callDeepSeek, callDeepSeekJudge } from './providers/deepseek.js';
import { callGrok, callGrokJudge } from './providers/grok.js';
import { callMistral, callMistralJudge } from './providers/mistral.js';
import { resolveProviderId } from '../constants/providers.js';

/**
 * AI client factory.
 *
 * Every generator client shares one signature:
 *   (prompt, systemInstruction, responseSchema?, model?, baseConfig?) => object
 *
 * Every judge client shares a narrower one:
 *   (prompt, systemInstruction, responseSchema) => object
 *
 * The judge deliberately runs on a *different, cheaper* model than the
 * generator — lower temperature for consistent scoring, and a separate model
 * so generator and judge do not share the same blind spot on a given clue.
 */

const GENERATORS = {
  gemini: callGemini,
  openai: callOpenAI,
  claude: callClaude,
  deepseek: callDeepSeek,
  grok: callGrok,
  mistral: callMistral,
};

const JUDGES = {
  gemini: callGeminiFlash,
  openai: callOpenAIJudge,
  claude: callClaudeJudge,
  deepseek: callDeepSeekJudge,
  grok: callGrokJudge,
  mistral: callMistralJudge,
};

/** @returns {Function} generator client for the provider */
export function getAIClient(provider) {
  const id = resolveProviderId(provider);
  if (!id || !GENERATORS[id]) {
    throw new Error(`Unsupported AI provider: ${provider}`);
  }
  return GENERATORS[id];
}

/**
 * Judge client for the provider.
 *
 * Previously the judge was hardwired to Gemini Flash regardless of
 * AI_PROVIDER, which meant every non-Gemini run still needed a Gemini key
 * that preflight did not ask for — the run passed preflight and then died
 * three judge failures later. The judge now follows the configured provider,
 * and JUDGE_PROVIDER can override it independently when you want a
 * cross-family reviewer.
 */
export function getJudgeClient(provider) {
  const id = resolveProviderId(provider);
  if (!id || !JUDGES[id]) {
    throw new Error(`Unsupported judge provider: ${provider}`);
  }
  return JUDGES[id];
}
