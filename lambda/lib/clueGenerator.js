import { CLUE_SYSTEM } from "../constants/prompts.js";

export function getCluePrompt(lexical) {
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

OUTPUT FORMAT (JSON):
{
  "clue": "The full clue text including (length)",
  "definition": "The exact definition portion",
  "wordplay_summary": "Concise explanation, e.g., 'Anagram (broken) of PEARS'",
  "clue_parts": [
    { "text": "Part of clue", "type": "definition|indicator|fodder|link|null" }
  ],
  "hints": [
    { "id": 1, "title": "Definition Location", "text": "...", "highlight": "...", "mascot_comment": "..." },
    { "id": 2, "title": "Mechanism", "text": "...", "highlight": "...", "mascot_comment": "..." },
    { "id": 3, "title": "Full Breakdown", "text": "...", "highlight": "...", "mascot_comment": "..." }
  ]
}`;
}

export async function generateClue(lexical, callAI) {
  return await callAI(getCluePrompt(lexical), CLUE_SYSTEM);
}
