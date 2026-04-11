export const MAX_ATTEMPTS = 3; // Robust but finite retries

export const WORDPLAY_TYPES = [
  "anagram",
  "reversal",
  "container",
  "hidden",
  "deletion",
  "charade",
  "homophone",
  "double_definition",
  "cryptic_definition",
  "andlit",
  "compound",
];

export const LEXICAL_SYSTEM = `You are an expert British cryptic crossword compiler. 
Your goal is to select a high-quality word that is suitable for a daily cryptic clue.
Avoid proper nouns, acronyms, and overly obscure words.
The word should have a clear dictionary definition and be amenable to at least one standard cryptic mechanism: ${WORDPLAY_TYPES.join(", ")}.`;

export const CLUE_EXAMPLES = `
EXAMPLE 1:
{
  "clue": "Outburst as rant oddly reformed around drink (7)",
  "answer": "TANTRUM",
  "definition": "Outburst",
  "indicator": "reformed",
  "fodder": "RANT + RUM",
  "wordplay_summary": "Anagram (reformed) of RANT around RUM (drink)",
  "explanation": "Definition is 'Outburst'. Wordplay: RANT is anagrammed ('reformed') and combined with RUM ('drink') to produce TANTRUM.",
  "clue_parts": [
    { "text": "Outburst", "type": "definition" },
    { "text": " as ", "type": null },
    { "text": "rant", "type": "fodder" },
    { "text": " oddly ", "type": null },
    { "text": "reformed", "type": "indicator" },
    { "text": " around ", "type": null },
    { "text": "drink", "type": "fodder" },
    { "text": " (7)", "type": null }
  ]
}

EXAMPLE 2:
{
  "clue": "Burning love for nothing in wading bird (8)",
  "answer": "FLAMINGO",
  "definition": "wading bird",
  "indicator": "for",
  "fodder": "FLAMING + O",
  "wordplay_summary": "FLAMING (burning) + O (nothing/love)",
  "explanation": "FLAMING (meaning burning) combined with O (representing nothing or love in tennis scoring) produces FLAMINGO.",
  "clue_parts": [
    { "text": "Burning", "type": "fodder" },
    { "text": " love ", "type": null },
    { "text": "for", "type": "indicator" },
    { "text": " nothing ", "type": "fodder" },
    { "text": "in ", "type": null },
    { "text": "wading bird", "type": "definition" },
    { "text": " (8)", "type": null }
  ]
}
`;

export const CLUE_SYSTEM = `You are a world-class British cryptic crossword setter (Ximenean style).
You write elegant, fair, and clever clues with smooth surface readings.
A cryptic clue consists of two parts: a definition and a wordplay mechanism.
The definition must be at either the very beginning or the very end of the clue.
The wordplay must lead precisely to the letters of the answer.

XIMENEAN STANDARDS:
1. Definition: Must be accurate and at one of the ends.
2. Wordplay: Must be precise. No "near enough".
3. Indicators: Must be standard and fair.
4. Surface: Must read like a natural sentence.
5. Answer Leak: The answer MUST NOT appear in the clue.

GOOD CLUE EXAMPLES:
${CLUE_EXAMPLES}
`;
