import { selectLexical } from './generator/lexicalPlanner.js';
import { generateClue } from './generator/clueGenerator.js';
import { judgeClue } from './validator/judge.js';
import { getRecentUsage } from '../services/dbService.js';
import { MAX_ATTEMPTS } from '../constants/prompts.js';

// Maximum clue attempts per lexical word before selecting a new word.
const MAX_CLUE_ATTEMPTS_PER_LEXICAL = 3;

/**
 * Orchestrates the AI pipeline to generate a valid, high-quality clue.
 *
 * Budget: MAX_ATTEMPTS total clue generations across all words.
 * Each lexical selection costs 1 attempt. Each clue generation costs 1 attempt.
 * A rejectLexical verdict immediately moves to the next word without exhausting
 * the inner retries.
 *
 * Example with MAX_ATTEMPTS=9, MAX_CLUE_ATTEMPTS_PER_LEXICAL=3:
 *   Word 1: [lexical] [clue1] [clue2] [clue3]  — 4 attempts
 *   Word 2: [lexical] [clue1]                  — 2 attempts (accepted)
 *   Total: 6 / 9 attempts used
 *
 * @param {Function} callAI     - AI client (prompt, system, schema?) => object
 * @param {string}   aiProvider - e.g. "gemini"
 * @param {string}   dbProvider - e.g. "supabase"
 * @returns {{ lexical, clue, verdict }} — verdict contains score, surfaceQuality, etc.
 */
export async function generateValidClue(callAI, aiProvider, dbProvider) {
  // Fetch variety constraints once — non-fatal if unavailable.
  let constraints = { avoidTypes: [], avoidAnswers: [] };
  try {
    constraints = await getRecentUsage(dbProvider);
    console.log(
      `Variety constraints — avoid types: [${constraints.avoidTypes.join(', ')}], ` +
        `avoid answers: [${constraints.avoidAnswers.join(', ')}]`
    );
  } catch (e) {
    console.warn('Could not fetch recent usage (variety enforcement disabled):', e.message);
  }

  // Flat attempt counter: every AI generation call (lexical OR clue) costs 1.
  let attempts = 0;

  while (attempts < MAX_ATTEMPTS) {
    // ── Select a word + mechanism (costs 1 attempt) ───────────────────────────
    attempts++;
    let lexical;
    try {
      lexical = await selectLexical(callAI, constraints);
      console.log(
        `[attempt ${attempts}/${MAX_ATTEMPTS}] Lexical: ${lexical.answer} ` +
          `(${lexical.type}) — "${lexical.definition}"`
      );
    } catch (e) {
      console.error(`[attempt ${attempts}] Lexical selection failed:`, e.message);
      continue;
    }

    // ── Inner feedback loop: up to N clue generations for this word ───────────
    let feedback = null;

    for (
      let clueAttempt = 1;
      clueAttempt <= MAX_CLUE_ATTEMPTS_PER_LEXICAL && attempts < MAX_ATTEMPTS;
      clueAttempt++
    ) {
      // Each clue generation costs 1 attempt.
      attempts++;

      try {
        const clue = await generateClue(lexical, callAI, feedback);
        console.log(`  [clue ${clueAttempt}/${MAX_CLUE_ATTEMPTS_PER_LEXICAL}] "${clue.clue}"`);

        const verdict = await judgeClue(clue, lexical);
        console.log(
          `  Judge: valid=${verdict.valid} score=${verdict.score ?? '—'} ` +
            `wordplay=${verdict.wordplayCorrect} surface=${verdict.surfaceQuality} ` +
            `rejectLexical=${verdict.rejectLexical}`
        );

        if (verdict.judgeUnavailable) {
          // Flash transiently failed even after its own internal retries. Don't
          // burn the whole run on a single blip — continue to the next attempt.
          // The client already handles 429/5xx/timeout retries; reaching here
          // means sustained failure, not a single hiccup.
          console.warn('  Flash judge unavailable for this attempt — continuing to next.');
          feedback = null;
          continue;
        }

        if (verdict.valid) {
          console.log(`  Accepted (score ${verdict.score}/10): "${clue.clue}"`);
          return { lexical, clue, verdict };
        }

        console.log(`  Rejected: ${verdict.feedback}`);

        // Hard reject: word+type fundamentally unsuitable — pick a new word.
        if (verdict.rejectLexical) {
          console.log('  Lexical rejected — selecting a new word.');
          break;
        }

        // Carry feedback into the next clue attempt.
        feedback = verdict.feedback;
      } catch (e) {
        console.error(`  Clue attempt ${clueAttempt} threw:`, e.message);
        feedback = null;
      }
    }
  }

  throw new Error(`Failed to generate a valid clue after ${attempts} attempts`);
}
