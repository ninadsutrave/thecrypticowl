import { createClient } from "@supabase/supabase-js";

// =========================
// CONFIG
// =========================

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const MAX_ATTEMPTS = 3;

// =========================
// GEMINI CLIENT (Node 20 native fetch)
// =========================

async function callGemini(prompt, systemInstruction = "") {
  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.9,
      responseMimeType: "application/json",
    },
  };

  if (systemInstruction) {
    body.system_instruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error: ${res.status} - ${errText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) throw new Error("Empty LLM response");

  try {
    // Basic cleanup in case Gemini wraps JSON in markdown code blocks
    const cleanText = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleanText);
  } catch (e) {
    throw new Error(`Invalid JSON from Gemini: ${text}`);
  }
}

// =========================
// LEXICAL PLANNER PROMPT
// =========================

const LEXICAL_SYSTEM = `You are an expert British cryptic crossword compiler. 
Your goal is to select a high-quality word that is suitable for a daily cryptic clue.
Avoid proper nouns, acronyms, and overly obscure words.
The word should have a clear dictionary definition and be amenable to at least one standard cryptic mechanism (anagram, container, hidden, reversal, charade).`;

function lexicalPrompt() {
  return `Select a single English word between 4 and 10 letters.
Return ONLY valid JSON in this format:
{
  "answer": "UPPERCASEWORD",
  "definition": "A clear, concise dictionary definition",
  "type": "anagram|charade|hidden|reversal|container|homophone",
  "difficulty": "easy|medium|hard"
}`;
}

// =========================
// CLUE GENERATOR PROMPT
// =========================

const CLUE_SYSTEM = `You are a world-class British cryptic crossword setter (Ximenean style).
You write elegant, fair, and clever clues with smooth surface readings.
A cryptic clue consists of two parts: a definition and a wordplay mechanism.
The definition must be at either the very beginning or the very end of the clue.
The wordplay must lead precisely to the letters of the answer.`;

function cluePrompt(lexical) {
  return `Generate a professional cryptic clue for the word "${lexical.answer}".
Mechanism: ${lexical.type}
Definition: ${lexical.definition}

STRICT RULES:
1. The definition must be at the START or END of the clue.
2. Use standard British cryptic crossword indicators (e.g., "broken" for anagram, "back" for reversal).
3. The surface reading must be a natural-sounding English sentence.
4. Do NOT include the answer in the clue text.
5. Provide a clear wordplay breakdown.

OUTPUT FORMAT (JSON):
{
  "clue": "The full clue text",
  "definition": "The exact part of the clue that is the definition",
  "wordplay_summary": "A concise explanation (e.g., 'Anagram (broken) of PEARS')",
  "clue_parts": [
    { "text": "Part of clue", "type": "definition|indicator|fodder|link|null" }
  ],
  "hints": [
    { "id": 1, "title": "Definition Location", "text": "...", "highlight": "...", "mascot_comment": "..." },
    { "id": 2, "title": "Mechanism", "text": "...", "highlight": "...", "mascot_comment": "..." }
  ]
}`;
}

// =========================
// JUDGE
// =========================

function judge(clueObj, lexical) {
  const errors = [];

  if (!clueObj?.clue) errors.push("missing_clue");
  if (!clueObj?.definition) errors.push("missing_definition");
  if (!clueObj?.clue_parts || !Array.isArray(clueObj.clue_parts))
    errors.push("missing_clue_parts");

  // Ensure answer is not in clue
  if (
    clueObj?.clue &&
    clueObj.clue.toUpperCase().includes(lexical.answer.toUpperCase())
  ) {
    errors.push("answer_leak_in_clue");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =========================
// PIPELINE
// =========================

async function generateValidClue() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`Attempt ${attempt}`);

    try {
      const lexical = await callGemini(lexicalPrompt(), LEXICAL_SYSTEM);
      console.log(`Lexical chosen: ${lexical.answer}`);

      const clue = await callGemini(cluePrompt(lexical), CLUE_SYSTEM);
      console.log(`Clue generated: ${clue.clue}`);

      const verdict = judge(clue, lexical);

      if (verdict.valid) {
        return { lexical, clue };
      }

      console.log("Rejected:", verdict.errors);
    } catch (e) {
      console.error(`Attempt ${attempt} failed:`, e.message);
    }
  }

  throw new Error("Failed to generate a valid clue after max attempts");
}

// =========================
// SUPABASE INSERT
// =========================

async function writeToSupabase(lexical, clue) {
  const { error } = await supabase.from("clues").insert({
    clue_text: clue.clue,
    answer: lexical.answer,
    answer_pattern: String(lexical.answer.length),
    primary_type: lexical.type,
    definition_text: lexical.definition,
    wordplay_summary: clue.wordplay_summary,
    clue_parts: clue.clue_parts,
    hints: clue.hints.map((h) => ({
      ...h,
      color: h.color || "#7C3AED",
      bg: h.bg || "#F5F3FF",
      bg_dark: h.bg_dark || "#1A0F35",
      border: h.border || "#C4B5FD",
    })),
    difficulty: lexical.difficulty || "medium",
  });

  if (error) throw error;
}

// =========================
// LAMBDA HANDLER
// =========================

export const handler = async (event) => {
  try {
    const { lexical, clue } = await generateValidClue();

    await writeToSupabase(lexical, clue);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        answer: lexical.answer,
        clue: clue.clue,
      }),
    };
  } catch (err) {
    console.error("Lambda error:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: err.message,
      }),
    };
  }
};