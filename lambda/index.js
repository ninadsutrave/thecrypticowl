import { createClient } from "@supabase/supabase-js";
import { selectLexical } from "./lib/lexicalPlanner.js";
import { generateClue } from "./lib/clueGenerator.js";
import { judgeClue } from "./lib/judge.js";
import { getAIClient } from "./lib/aiClient.js";
import { MAX_ATTEMPTS } from "./constants/prompts.js";

// =========================
// CONFIG
// =========================

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Default to Gemini, can be configured via ENV
const AI_PROVIDER = process.env.AI_PROVIDER || "gemini";
const callAI = getAIClient(AI_PROVIDER);

// =========================
// PIPELINE
// =========================

async function generateValidClue() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`Attempt ${attempt} using ${AI_PROVIDER}`);

    try {
      const lexical = await selectLexical(callAI);
      console.log(`Lexical chosen: ${lexical.answer} (${lexical.type})`);

      const clue = await generateClue(lexical, callAI);
      console.log(`Clue generated: ${clue.clue}`);

      const verdict = judgeClue(clue, lexical);

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
  // Map provider to author UUID
  const AUTHOR_MAP = {
    gemini: "7211516e-e61b-410a-b31c-6a1651515151",
    openai: "0921516e-e61b-410a-b31c-6a1651515151",
    claude: "1211516e-e61b-410a-b31c-6a1651515151",
    huggingface: "5211516e-e61b-410a-b31c-6a1651515151",
  };

  const authorId = AUTHOR_MAP[AI_PROVIDER.toLowerCase()] || AUTHOR_MAP.gemini;

  // 1. Insert clue
  const { data: clueData, error: clueError } = await supabase
    .from("clues")
    .insert({
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
      author_id: authorId,
    })
    .select()
    .single();

  if (clueError) throw clueError;

  // 2. Insert daily_puzzle (scheduled for today)
  const today = new Date().toISOString().split("T")[0];
  const { error: dpError } = await supabase.from("daily_puzzles").insert({
    date: today,
    clue_id: clueData.id,
    published: true,
  });

  if (dpError && dpError.code !== "23505") {
    // Ignore unique constraint error if already published for today
    throw dpError;
  }

  // 3. Insert clue_components (pedagogical breakdown)
  const components = [];
  clue.clue_parts.forEach((part, index) => {
    if (part.type) {
      components.push({
        clue_id: clueData.id,
        step_order: index + 1,
        role: part.type === "definition" ? "definition" : 
              part.type === "indicator" ? "indicator" :
              part.type === "fodder" ? "fodder" : "link_word",
        clue_text: part.text,
      });
    }
  });

  if (components.length > 0) {
    const { error: ccError } = await supabase.from("clue_components").insert(components);
    if (ccError) throw ccError;
  }
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
        provider: AI_PROVIDER,
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
