import { LEXICAL_SYSTEM } from "../constants/prompts.js";

export function getLexicalPrompt() {
  return `Select a single high-quality English word between 4 and 10 letters suitable for a professional cryptic crossword.
Avoid:
- Obscure proper nouns
- Technical jargon
- Acronyms
- Words with multiple spelling variants (unless common in UK English)

Return ONLY valid JSON in this format:
{
  "answer": "UPPERCASEWORD",
  "definition": "A clear, accurate dictionary definition",
  "type": "anagram|charade|hidden|reversal|container|homophone|double_definition",
  "difficulty": "easy|medium|hard"
}`;
}

export async function selectLexical(callAI) {
  return await callAI(getLexicalPrompt(), LEXICAL_SYSTEM);
}
