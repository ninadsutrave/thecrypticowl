import { getDBClient } from "../clients/dbClient.js";
import { AUTHOR_MAP } from "../constants/clue.js";
import { constructHints } from "../core/builder/hintBuilder.js";

/**
 * Saves the generated clue and its metadata to the database.
 */
export async function writeToDB(lexical, clue, aiProvider, dbProvider = "supabase") {
  const db = getDBClient(dbProvider);
  const authorId = AUTHOR_MAP[aiProvider.toLowerCase()] || AUTHOR_MAP.gemini;
  const hints = constructHints(lexical, clue);

  // 1. Determine target date (Next day, since we run at 23:50 UTC)
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 1);
  const targetDate = date.toISOString().split("T")[0];

  // 2. Check if a puzzle already exists for this date (Idempotency)
  const { data: existingPuzzle } = await db
    .from("daily_puzzles")
    .select("id")
    .eq("date", targetDate)
    .maybeSingle();

  if (existingPuzzle) {
    console.log(`Puzzle already exists for ${targetDate}. Skipping generation.`);
    return { skipped: true, date: targetDate };
  }

  // 3. Insert clue
  const { data: clueData, error: clueError } = await db
    .from("clues")
    .insert({
      clue_text: clue.clue,
      answer: lexical.answer,
      answer_pattern: String(lexical.answer.length),
      primary_type: lexical.type,
      definition_text: clue.definition,
      wordplay_summary: clue.explanation || clue.wordplay_summary,
      clue_parts: clue.clue_parts,
      hints: hints,
      difficulty: lexical.difficulty || "medium",
      author_id: authorId,
    })
    .select()
    .single();

  if (clueError) throw clueError;

  // 4. Insert daily_puzzle
  const { error: dpError } = await db.from("daily_puzzles").insert({
    date: targetDate,
    clue_id: clueData.id,
    published: true,
  });

  if (dpError && dpError.code !== "23505") {
    throw dpError;
  }

  // 5. Insert clue_components (pedagogical breakdown)
  const components = clue.clue_parts
    .filter((part) => part.type)
    .map((part, index) => ({
      clue_id: clueData.id,
      step_order: index + 1,
      role: part.type === "definition" ? "definition" : 
            part.type === "indicator" ? "indicator" :
            part.type === "fodder" ? "fodder" : "link_word",
      clue_text: part.text,
    }));

  if (components.length > 0) {
    const { error: ccError } = await db.from("clue_components").insert(components);
    if (ccError) throw ccError;
  }

  return { skipped: false, date: targetDate, clueId: clueData.id };
}
