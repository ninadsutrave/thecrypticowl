import { callGemini } from "./providers/gemini.js";

/**
 * AI Client Factory
 * Currently defaults to Gemini, but easily extensible.
 */
export function getAIClient(provider = "gemini") {
  switch (provider.toLowerCase()) {
    case "gemini":
      return callGemini;
    
    // Future providers can be added here:
    // case "openai":
    //   return callOpenAI;
    // case "claude":
    //   return callClaude;
    
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}
