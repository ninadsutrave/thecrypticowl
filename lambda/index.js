import { getAIClient } from "./clients/aiClient.js";
import { notify } from "./core/alerts.js";
import { generateValidClue } from "./core/pipeline.js";
import { writeToDB } from "./services/dbService.js";

/**
 * AWS Lambda Entry Point
 * Triggers the daily cryptic clue generation pipeline.
 */
export const handler = async (event) => {
  const AI_PROVIDER = process.env.AI_PROVIDER || "gemini";
  const DB_PROVIDER = process.env.DB_PROVIDER || "supabase";
  const callAI = getAIClient(AI_PROVIDER);

  try {
    // 1. Generate Clue
    const { lexical, clue } = await generateValidClue(callAI, AI_PROVIDER);

    // 2. Save to DB
    const result = await writeToDB(lexical, clue, AI_PROVIDER, DB_PROVIDER);

    // 3. Notify
    if (result.skipped) {
      const skipMsg = `Puzzle already exists for ${result.date}. Generation skipped.`;
      console.log(skipMsg);
      await notify(skipMsg, true);
      return { statusCode: 200, body: JSON.stringify({ success: true, message: skipMsg }) };
    }

    const successMessage = `Generated clue for *${lexical.answer}* (${lexical.type})\n\n"${clue.clue}"`;
    await notify(successMessage, true);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        date: result.date,
        answer: lexical.answer,
        clue: clue.clue,
        provider: AI_PROVIDER,
      }),
    };
  } catch (err) {
    console.error("Lambda error:", err);
    await notify(`Failed to generate/insert clue:\n\`${err.message}\``, false);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: err.message,
      }),
    };
  }
};
