import { CLUE_SYSTEM } from "../constants/prompts.js";

export function getCluePrompt(lexical) {
  const isDoubleDef = lexical.type === 'double_definition';
  
  return `Generate a professional British-style cryptic clue for the word "${lexical.answer}".
Mechanism: ${lexical.type}
Definition: ${lexical.definition}

STRICT XIMENEAN RULES:
1. The definition must be at the very START or very END of the clue.
2. Use standard British cryptic indicators (e.g., "broken" for anagram, "back" for reversal).
3. The surface reading must be a natural, elegant English sentence.
4. Do NOT include the answer in the clue text.
5. The wordplay must lead precisely to the letters of the answer. No "near enough".
6. Include the letter count in parentheses at the end, e.g., " (5)".
7. Return ONLY the final JSON object. Do not brainstorm out loud.

COMPONENTS (MANDATORY):
- definition: The exact string from the clue that serves as the definition.
- indicator: The signal word(s) if applicable (e.g., "broken"). For Double Definition, this should be the OTHER definition.
- fodder: The raw material being manipulated (e.g., the word to be anagrammed). For Double Definition, this can be null.
- explanation: A concise pedagogical explanation of how the wordplay works (one or two sentences).

OUTPUT FORMAT (JSON):
{
  "clue": "The full clue text including (length)",
  "definition": "...",
  "indicator": "...",
  "fodder": "...",
  "wordplay_summary": "Concise explanation, e.g., 'Anagram (broken) of PEARS'",
  "explanation": "Detailed step-by-step breakdown for the final hint",
  "clue_parts": [
    { "text": "Part of clue", "type": "definition|indicator|fodder|link|null" }
  ]
}`;
}

export async function generateClue(lexical, callAI) {
  return await callAI(getCluePrompt(lexical), CLUE_SYSTEM);
}
