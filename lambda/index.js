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

function constructHints(lexical, clue) {
  const isDoubleDef = lexical.type === "double_definition";

  if (isDoubleDef) {
    return [
      {
        id: 1,
        title: "First Definition",
        text: `The first part of the clue is a definition for the answer.`,
        highlight: clue.definition,
        mascot_comment: "Double definitions are sneaky! One definition is at the start...",
      },
      {
        id: 2,
        title: "Second Definition",
        text: `The other end of the clue is also a definition for the same answer.`,
        highlight: clue.indicator,
        mascot_comment: "...and the other is at the end! No wordplay here. 🦉",
      },
      {
        id: 3,
        title: "First Context",
        text: `Think of a word that fits the first definition: "${clue.definition}".`,
        mascot_comment: "Focus on one side first...",
      },
      {
        id: 4,
        title: "Second Context",
        text: `That same word must also fit the second definition: "${clue.indicator}".`,
        mascot_comment: "Does it fit both? Then you've found it! 🎯",
      },
    ];
  }

  // Standard Wordplay Hints
  const mechanismDesc = {
    anagram: "the letters are being rearranged (scrambled).",
    reversal: "the letters are written backwards.",
    container: "one set of letters is placed inside another.",
    hidden: "the answer is hidden across the words of the clue.",
    deletion: "one or more letters are removed from a word.",
    charade: "two or more parts are joined together side-by-side.",
    homophone: "the answer sounds like another word.",
    cryptic_definition: "the whole clue is a punny or metaphorical definition.",
    andlit: "the whole clue is both the definition and the wordplay!",
    compound: "multiple mechanisms are combined together.",
  };

  return [
    {
      id: 1,
      title: "Definition Location",
      text: `The definition is at the ${
        clue.clue.toLowerCase().startsWith(clue.definition.toLowerCase()) ? "start" : "end"
      } of the clue.`,
      highlight: clue.definition,
      mascot_comment: "Found the definition! It's always at one of the ends. 👀",
    },
    {
      id: 2,
      title: "The Indicator",
      text: clue.indicator
        ? `The indicator word is "${clue.indicator}", which signals how the wordplay works.`
        : `Look for a hidden signal word that tells you what to do with the letters.`,
      highlight: clue.indicator || null,
      mascot_comment: "Indicators are like road signs—they tell you which way to go!",
    },
    {
      id: 3,
      title: "The Fodder",
      text: clue.fodder
        ? `The raw letters or synonym to work with is "${clue.fodder}".`
        : "Look closely at the letters in the clue...",
      highlight: clue.fodder || null,
      mascot_comment: "We've got the ingredients, now let's cook! 🍳",
    },
    {
      id: 4,
      title: "Wordplay Type",
      text: `This is a ${lexical.type.replace("_", " ")} clue. In this type, ${
        mechanismDesc[lexical.type] || "parts are combined to form the answer."
      }`,
      mascot_comment: "The final piece of the puzzle! Can you see it now? 🦉",
    },
  ];
}

async function writeToSupabase(lexical, clue) {
  // Map provider to author UUID
  const AUTHOR_MAP = {
    gemini: "7211516e-e61b-410a-b31c-6a1651515151",
    openai: "0921516e-e61b-410a-b31c-6a1651515151",
    claude: "1211516e-e61b-410a-b31c-6a1651515151",
    huggingface: "5211516e-e61b-410a-b31c-6a1651515151",
  };

  const authorId = AUTHOR_MAP[AI_PROVIDER.toLowerCase()] || AUTHOR_MAP.gemini;

  const hints = constructHints(lexical, clue).map((h) => ({
    ...h,
    color: h.color || "#7C3AED",
    bg: h.bg || "#F5F3FF",
    bg_dark: h.bg_dark || "#1A0F35",
    border: h.border || "#C4B5FD",
  }));

  // 1. Insert clue
  const { data: clueData, error: clueError } = await supabase
    .from("clues")
    .insert({
      clue_text: clue.clue,
      answer: lexical.answer,
      answer_pattern: String(lexical.answer.length),
      primary_type: lexical.type,
      definition_text: clue.definition,
      wordplay_summary: clue.explanation || clue.wordplay_summary, // Store the full explanation as the post-solve summary
      clue_parts: clue.clue_parts,
      hints: hints,
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
