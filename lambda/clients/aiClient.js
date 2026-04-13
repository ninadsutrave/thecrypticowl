import { callGemini } from "./providers/gemini.js";

/**
 * AI Client Factory
 * Returns a specific AI provider (defaults to Gemini).
 */
export function getAIClient(provider) {
  switch (provider.toLowerCase()) {
    case "gemini":
      return callGemini;
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}
