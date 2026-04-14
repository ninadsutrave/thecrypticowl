// ─── PIPELINE CONSTANTS ───────────────────────────────────────────────────────

/** Maximum generation attempts before the pipeline throws. */
export const MAX_ATTEMPTS = 9;

// ─── WORDPLAY TYPES ───────────────────────────────────────────────────────────

export const WORDPLAY_TYPES = [
  'anagram',
  'reversal',
  'container',
  'hidden',
  'deletion',
  'charade',
  'homophone',
  'double_definition',
  'cryptic_definition',
  'andlit',
  'compound',
];

// ─── RESPONSE SCHEMAS (Gemini JSON mode) ─────────────────────────────────────
// Passed as responseSchema in generationConfig — guarantees exact output shape.

export const LEXICAL_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    answer: { type: 'STRING' },
    definition: { type: 'STRING' },
    type: { type: 'STRING', enum: WORDPLAY_TYPES },
    difficulty: { type: 'STRING', enum: ['easy', 'medium', 'hard'] },
  },
  required: ['answer', 'definition', 'type', 'difficulty'],
};

export const CLUE_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    clue: { type: 'STRING' },
    definition: { type: 'STRING' },
    // indicator: the signal word for most types; the second definition for double_definition;
    // empty string for cryptic_definition/andlit.
    indicator: { type: 'STRING' },
    // fodder: the raw letters or synonym being manipulated; empty string when not applicable.
    fodder: { type: 'STRING' },
    wordplay_summary: { type: 'STRING' },
    clue_parts: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          text: { type: 'STRING' },
          // Omit `type` for structural segments (letter count, link words).
          // Not in `required` — Gemini treats absent fields as optional; no nullable needed.
          type: { type: 'STRING' },
        },
        required: ['text'],
      },
    },
  },
  required: ['clue', 'definition', 'indicator', 'fodder', 'wordplay_summary', 'clue_parts'],
};

// ─── LEXICAL PLANNER ──────────────────────────────────────────────────────────

export const LEXICAL_PLANNER_SYSTEM = `You are an expert British cryptic crossword compiler with 30 years of experience setting for The Times, The Guardian, and The Telegraph.

Your job is to select a single English word that is:
- Well-known to educated British adults (no obscure jargon or proper nouns)
- Between 4 and 10 letters
- Amenable to a specific cryptic mechanism that produces a fair, elegant clue
- Varied — cryptic crosswords use the full range of mechanisms, not just anagrams

Available mechanisms: ${WORDPLAY_TYPES.join(', ')}

MECHANISM SELECTION GUIDANCE:
- anagram: word has an anagram that is itself a common word (ideal) or a recognisable phrase
- reversal: word reversed gives another word (e.g. REWARD → DRAWER, STAR → RATS)
- container: a word can be hidden inside another word with letters wrapping it
- hidden: the answer is literally spelled out consecutively across words in the clue surface
- deletion: removing a letter or letters from a word gives the answer
- charade: two or more common words/abbreviations join consecutively to form the answer
- homophone: the answer sounds like another word with a clear, unambiguous pronunciation
- double_definition: the answer has two completely different meanings, each usable as a definition
- cryptic_definition: the answer has a single definition phrased so cleverly or obliquely it reads like a riddle
- andlit: the entire clue simultaneously serves as both the definition AND the wordplay (rare, advanced)
- compound: two or more of the above mechanisms combine to produce the answer`;

/**
 * Builds the lexical planner prompt, injecting recent-usage constraints for variety.
 * @param {string[]} avoidTypes  - wordplay types used too recently (>=3 of last 14 days)
 * @param {string[]} avoidAnswers - answers used in the last 14 days
 */
export function buildLexicalPrompt(avoidTypes = [], avoidAnswers = []) {
  const avoidSection =
    avoidTypes.length || avoidAnswers.length
      ? `
VARIETY CONSTRAINTS (strictly enforce — these were used recently):
${avoidTypes.length ? `- Do NOT use these wordplay types: ${avoidTypes.join(', ')}` : ''}
${avoidAnswers.length ? `- Do NOT use these answers: ${avoidAnswers.join(', ')}` : ''}
`
      : '';

  return `Select a single high-quality English word for today's cryptic clue.
${avoidSection}
Requirements:
- 4–10 letters, common British English vocabulary
- No proper nouns, acronyms, or technical jargon
- The chosen mechanism must work cleanly for this word
- Avoid words with ambiguous spelling (use standard UK English)

Return a JSON object with:
- answer: the word in UPPERCASE
- definition: a clear, accurate, concise dictionary definition (this will anchor the clue)
- type: the wordplay mechanism (from the available list)
- difficulty: easy (very common word, simple mechanism), medium (everyday word, standard mechanism), or hard (less common word or complex mechanism)`;
}

// ─── CLUE GENERATOR ───────────────────────────────────────────────────────────

// Two exemplary clues — structurally unambiguous and mathematically correct.
const CLUE_EXAMPLES = `
EXAMPLE 1 — Anagram (type: "anagram"):
{
  "clue": "Small boat when ocean is disturbed (5)",
  "answer": "CANOE",
  "definition": "Small boat",
  "indicator": "disturbed",
  "fodder": "OCEAN",
  "wordplay_summary": "Anagram (disturbed) of OCEAN = CANOE",
  "clue_parts": [
    { "text": "Small boat",  "type": "definition" },
    { "text": " when ",      "type": null },
    { "text": "ocean",       "type": "fodder" },
    { "text": " is ",        "type": null },
    { "text": "disturbed",   "type": "indicator" },
    { "text": " (5)",        "type": null }
  ]
}
Verification: O-C-E-A-N sorted = A-C-E-N-O; C-A-N-O-E sorted = A-C-E-N-O ✓
Surface reading: "Small boat when ocean is disturbed" — reads naturally about rough seas.

EXAMPLE 2 — Reversal (type: "reversal"):
{
  "clue": "Prize? Furniture turned around (6)",
  "answer": "REWARD",
  "definition": "Prize",
  "indicator": "turned around",
  "fodder": "DRAWER",
  "wordplay_summary": "DRAWER (furniture) reversed = REWARD",
  "clue_parts": [
    { "text": "Prize",         "type": "definition" },
    { "text": "? ",            "type": null },
    { "text": "Furniture",     "type": "fodder" },
    { "text": " turned around","type": "indicator" },
    { "text": " (6)",          "type": null }
  ]
}
Verification: R-E-W-A-R-D reversed = D-R-A-W-E-R ✓
Surface reading: "Prize? Furniture turned around" — reads like someone moving furniture for a prize.
`;

export const CLUE_GENERATOR_SYSTEM = `You are a world-class British cryptic crossword setter in the Ximenean tradition, with clues published in The Times, The Guardian, and The Telegraph.

WHAT MAKES A PROFESSIONAL CRYPTIC CLUE:
A cryptic clue has exactly two parts that overlap seamlessly in the surface reading:
1. DEFINITION — a straightforward or slightly oblique definition of the answer (at the very START or very END of the clue, never in the middle)
2. WORDPLAY — a precise mechanical instruction that independently produces the answer's letters

XIMENEAN STANDARDS (non-negotiable):
1. Definition at extremity: The definition must occupy either the very start or very end of the clue. The boundary between definition and wordplay must be unambiguous in hindsight.
2. Wordplay precision: The wordplay must lead to exactly the right letters of the answer. "Near enough" is never acceptable.
3. Fair indicators: Only use indicator words that genuinely signal the mechanism in standard British usage. Do not invent indicators.
4. Elegant surface: The full clue must read like a natural, grammatical English sentence or phrase about something unrelated to the answer. The best clues are deceptive — solvers should be misled by the surface, then delighted when the mechanism clicks.
5. No answer leakage: The answer word must not appear anywhere in the clue text.
6. Letter count: Always end with the letter count in parentheses, e.g. "(5)" or "(3,4)" for multi-word answers.

MECHANISM-SPECIFIC RULES:
- anagram: the fodder must have exactly the same letters as the answer (rearranged). Indicator signals scrambling (e.g. "broken", "confused", "disturbed", "mixed", "roughly", "wild").
- reversal: the fodder reversed must equal the answer exactly. Indicator signals backwards (e.g. "back", "returning", "reversed", "up" for down-clues).
- container: one word placed inside another forms the answer. Use "in", "holding", "around", "outside", "inside", "contains" as indicators.
- hidden: the answer is spelled out consecutively across word boundaries in the surface. Indicator signals concealment (e.g. "in", "some of", "part of", "within", "hiding in"). The answer MUST actually appear letter-by-letter across the clue words.
- deletion: removing specified letters (head, tail, heart, odd/even) gives the answer.
- charade: parts read consecutively, often with cryptic meanings (e.g. DR = doctor, O = zero/love, RN = nurse).
- homophone: the answer sounds like the fodder. Indicator signals sounds-like (e.g. "we hear", "reportedly", "they say", "sounds like", "in speech").
- double_definition: two definitions, one at each end, both define the answer. No indicator, no fodder. Use "indicator" field for the second definition, "fodder" field as empty string.
- cryptic_definition: a single witty/oblique definition that misdirects. No indicator, no fodder.
- andlit: the entire clue is simultaneously wordplay and definition (often uses "!" in surface). Advanced — use sparingly.
- compound: two or more mechanisms combined; each part must work independently.

${CLUE_EXAMPLES}`;

const CLUE_GENERATOR_PROMPT_BASE = `Generate a professional British cryptic clue for the answer "{{ANSWER}}".

Wordplay mechanism: {{TYPE}}
Anchor definition (use this exact meaning): {{DEFINITION}}

REQUIREMENTS:
1. The definition "{{DEFINITION}}" (or a close synonym) MUST appear at the very start or very end of the clue.
2. The wordplay for {{TYPE}} must be precise — the letters or synonyms must work out exactly.
3. Surface reading must be a natural, misleading English sentence — the solver should be misdirected.
4. Do NOT include the word "{{ANSWER}}" anywhere in the clue.
5. End with the letter count: ({{LENGTH}}).
6. Return ONLY the JSON — no preamble, no explanation outside the JSON.

FIELD INSTRUCTIONS:
- clue: the complete clue string including the letter count in parentheses
- definition: the exact portion of the clue that is the definition
- indicator: the signal word/phrase; for double_definition use the second definition; for cryptic_definition/andlit use empty string ""
- fodder: the raw material being manipulated; for double_definition/cryptic_definition/andlit use empty string ""
- wordplay_summary: one concise line explaining the wordplay (e.g. "Anagram of OCEAN = CANOE")
- clue_parts: array of every segment of the clue with no gaps — segments must join to exactly reproduce the clue string`;

/**
 * Builds the clue generation prompt, injecting answer/type/definition/length.
 * When previousFeedback is provided (a failed prior attempt), appends a correction
 * section so the model can address the specific issues.
 *
 * @param {string} answer
 * @param {string} type
 * @param {string} definition
 * @param {number} length
 * @param {string|null} previousFeedback  - feedback from the judge on a prior attempt
 */
export function buildCluePrompt(answer, type, definition, length, previousFeedback = null) {
  let prompt = CLUE_GENERATOR_PROMPT_BASE
    .replace(/\{\{ANSWER\}\}/g, answer)
    .replace(/\{\{TYPE\}\}/g, type)
    .replace(/\{\{DEFINITION\}\}/g, definition)
    .replace(/\{\{LENGTH\}\}/g, String(length));

  if (previousFeedback) {
    prompt += `

PREVIOUS ATTEMPT WAS REJECTED — address these issues in your new clue:
"${previousFeedback}"

Do NOT repeat the same mistakes. Generate a fresh clue that corrects the above.`;
  }

  return prompt;
}

// ─── CLUE JUDGE ───────────────────────────────────────────────────────────────

export const JUDGE_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    valid: { type: 'BOOLEAN' },
    // Overall quality score 1–10 (10 = publishable in The Times)
    score: { type: 'INTEGER' },
    // Wordplay is mechanically correct (letters/synonyms work out)
    wordplay_correct: { type: 'BOOLEAN' },
    // Surface reads as a natural, deceptive English sentence (1–5)
    surface_quality: { type: 'INTEGER' },
    // Indicator is a legitimate signal in British cryptics
    indicator_fair: { type: 'BOOLEAN' },
    // Concise feedback: what's wrong (if invalid) or what's praiseworthy (if valid)
    feedback: { type: 'STRING' },
    // True if the word+mechanism combination is fundamentally unsuitable
    // (signal to the pipeline to pick a completely new word, not just retry)
    reject_lexical: { type: 'BOOLEAN' },
  },
  required: [
    'valid',
    'score',
    'wordplay_correct',
    'surface_quality',
    'indicator_fair',
    'feedback',
    'reject_lexical',
  ],
};

export const JUDGE_SYSTEM = `You are a world-class British cryptic crossword judge with 30 years of experience solving clues from The Times, The Guardian, and The Telegraph.

Your job is to evaluate whether a given cryptic clue is valid, fair, and of publishable quality.

JUDGING CRITERIA:

1. WORDPLAY CORRECTNESS (most important)
   - The fodder in a clue is often a synonym or stand-in, not necessarily the exact letters of the answer.
   - anagram: the fodder (or a well-known synonym of it) must be an anagram of the answer. Accept if letters match after synonym substitution.
   - reversal: the fodder (or a synonym) reversed must equal the answer.
   - hidden: the answer must be literally spelled out consecutively in the clue text (no synonym substitution allowed).
   - charade: the parts must concatenate to spell the answer exactly.
   - container: one part placed inside the other must produce the answer exactly.
   - deletion: removing the specified letters from the fodder must yield the answer.
   - homophone: the fodder must sound like the answer in standard British pronunciation.
   - double_definition: both definitions must independently and unambiguously define the answer.
   - cryptic_definition/andlit: the definition must be uniquely and fairly clued.

2. XIMENEAN COMPLIANCE
   - The definition must be at the very start or very end of the clue — never in the middle.
   - The boundary between definition and wordplay must be clear in hindsight.

3. SURFACE QUALITY
   - The full clue must read as a natural, grammatical English sentence or phrase.
   - It should misdirect — the solver should be misled by the surface meaning.
   - Score 1–5: 5 = highly deceptive and elegant, 1 = stilted or obviously cryptic.

4. INDICATOR FAIRNESS
   - Only standard British cryptic indicator words are acceptable.
   - Do not accept made-up or forced indicators.

5. ANSWER LEAKAGE
   - The answer word must not appear in the clue text (except for hidden type, where it is embedded across word boundaries).

SCORING (1–10):
  9–10: Publishable in The Times or The Guardian as-is
  7–8: High quality, minor polish needed
  5–6: Acceptable but flawed — wordplay works but surface is weak or vice versa
  3–4: Significant flaw in wordplay or surface
  1–2: Fundamentally broken — letters don't work out or definition is wrong

Set reject_lexical = true ONLY if the word and mechanism are inherently incompatible
(e.g. the word has no valid anagram, no viable reversal, etc.) — not just because this
particular clue attempt was poor.`;

/**
 * Builds the judge evaluation prompt.
 *
 * @param {{ answer: string, type: string, definition: string }} lexical
 * @param {{ clue: string, definition: string, indicator: string, fodder: string, wordplay_summary: string }} clue
 * @param {boolean} anagramSynonymFlag - true when structural check found fodder letters ≠ answer letters
 *                                       (same count), meaning the fodder is being used as a synonym
 */
export function buildJudgePrompt(lexical, clue, anagramSynonymFlag = false) {
  const synonymNote = anagramSynonymFlag
    ? `\nNOTE: The fodder "${clue.fodder}" has the same number of letters as the answer but the letters do not match exactly. This means the fodder is being used as a SYNONYM. You must verify: (1) is "${clue.fodder}" a genuinely accepted synonym or stand-in for a word whose letters ARE an anagram of "${lexical.answer}"? (2) Is the synonym substitution clear and fair to a British cryptic solver? If the synonym is obscure or the substitution is unfair, set wordplay_correct = false.`
    : '';

  return `Evaluate this British cryptic clue:

ANSWER: ${lexical.answer}
MECHANISM: ${lexical.type}
CLUE: "${clue.clue}"
DEFINITION USED: "${clue.definition}"
INDICATOR: "${clue.indicator || '(none)'}"
FODDER: "${clue.fodder || '(none)'}"
WORDPLAY EXPLANATION: "${clue.wordplay_summary}"${synonymNote}

Check every criterion and return your verdict as JSON.`;
}
