import { selectLexical } from './generator/lexicalPlanner.js';
import { generateClue } from './generator/clueGenerator.js';
import { judgeClue } from './validator/judge.js';
import { getRecentUsage } from './services/dbService.js';
import { MAX_ATTEMPTS } from './constants/prompts.js';

/** Maximum clue attempts against one word before moving to a different word. */
const MAX_CLUE_ATTEMPTS_PER_LEXICAL = 3;

/**
 * If the judge is unreachable this many times in a row it is down, not
 * flaky — abort loudly rather than draining the whole budget on calls that
 * will all fail the same way.
 */
const MAX_CONSECUTIVE_JUDGE_FAILURES = 3;

/**
 * Errors that must escape the inner attempt loop rather than being caught and
 * retried. The inner `catch` deliberately swallows ordinary per-attempt
 * failures so one bad generation doesn't end the run — but a dead judge and an
 * exhausted quota are not per-attempt problems, and retrying them just burns
 * the budget for no chance of success.
 *
 * This guard previously threw from inside that same `try`, so the catch
 * swallowed it and the "abort after N outages" fail-fast never fired: a run
 * with a dead judge quietly drained all 9 attempts and reported a generic
 * failure instead of naming the outage.
 */
const isFatal = e => e?.quotaExhausted === true || e?.abortRun === true;

function abortRun(message) {
  const err = new Error(message);
  err.abortRun = true;
  return err;
}

/**
 * Orchestrates the pipeline to produce one validated, high-quality clue.
 *
 * Budget: MAX_ATTEMPTS total AI generations. Each lexical selection costs 1,
 * each clue generation costs 1. A `rejectLexical` verdict abandons the word
 * immediately rather than spending the remaining inner retries on it.
 *
 * Example with MAX_ATTEMPTS=15, MAX_CLUE_ATTEMPTS_PER_LEXICAL=3:
 *   Word 1: [lexical] [clue1] [clue2] [clue3]  — 4 attempts
 *   Word 2: [lexical] [clue1]                  — 2 attempts (accepted)
 *   Total: 6 / 15 used
 *
 * Words rejected during the run are remembered and fed back into the lexical
 * planner, so it does not keep proposing the same unclueable word.
 *
 * @param {Function} callAI     - generator client
 * @param {Function} callJudge  - judge client (separate model; see aiClient.js)
 * @param {string}   dbProvider
 * @returns {Promise<{ lexical: object, clue: object, verdict: object, stats: object }>}
 */
/** Stop starting new attempts with less than this left, so the run ends (and alerts) cleanly. */
const MIN_TIME_LEFT_MS = 90_000;

export async function generateValidClue(
  callAI,
  callJudge,
  dbProvider,
  { timeLeft = () => Infinity } = {}
) {
  const outOfTime = () => timeLeft() < MIN_TIME_LEFT_MS;
  // Variety constraints are a nice-to-have — a DB hiccup must not stop the
  // day's puzzle being generated.
  let constraints = { avoidTypes: [], avoidAnswers: [], knownAnswers: new Set() };
  try {
    constraints = await getRecentUsage(dbProvider);
    console.log(
      `Variety constraints — avoid types: [${constraints.avoidTypes.join(', ')}], ` +
        `avoid answers: [${constraints.avoidAnswers.join(', ')}]`
    );
  } catch (e) {
    console.warn('Could not fetch recent usage (variety enforcement disabled):', e.message);
  }

  let attempts = 0;
  let consecutiveJudgeUnavailable = 0;

  // Words this run has already tried and abandoned. Fed back to the planner
  // so attempt 5 does not propose the word attempt 2 already rejected.
  const exhaustedAnswers = [];
  const stats = {
    lexicalSelections: 0,
    clueGenerations: 0,
    mechanicalRejections: 0,
    judgeRejections: 0,
    duplicateAnswers: 0,
    rejectedAnswers: exhaustedAnswers,
  };

  while (attempts < MAX_ATTEMPTS && !outOfTime()) {
    attempts++;
    stats.lexicalSelections++;

    let lexical;
    try {
      lexical = await selectLexical(callAI, {
        avoidTypes: constraints.avoidTypes,
        avoidAnswers: [...constraints.avoidAnswers, ...exhaustedAnswers],
      });
      console.log(
        `[attempt ${attempts}/${MAX_ATTEMPTS}] Lexical: ${lexical.answer} ` +
          `(${lexical.type}) — "${lexical.definition}"`
      );
    } catch (e) {
      // Quota exhaustion is not transient — surface it immediately rather
      // than burning attempts on calls that will all 429.
      if (isFatal(e)) throw e;
      console.error(`[attempt ${attempts}] Lexical selection failed:`, e.message);
      continue;
    }

    // ── Difficulty screen (free): the target is medium, so an easy pick (very
    // common word, simple mechanism) is swapped for another word at once.
    if (lexical.difficulty === 'easy') {
      console.log(`  "${lexical.answer}" was rated easy — selecting a medium word.`);
      exhaustedAnswers.push(lexical.answer);
      continue;
    }

    // ── Answer-uniqueness screen (free — no AI call) ───────────────────────
    // `clues` has a UNIQUE index on (answer, answer_pattern), so a repeat
    // answer is not merely repetitive: it is an insert that fails at the very
    // end of the run, after every AI call has already been paid for. Catch it
    // here and immediately pick a different word.
    const proposed = String(lexical.answer ?? '').toUpperCase();
    if (constraints.knownAnswers?.has(proposed)) {
      console.log(`  "${proposed}" has already been published — selecting a new word.`);
      exhaustedAnswers.push(lexical.answer);
      stats.duplicateAnswers++;
      continue;
    }

    let feedback = null;
    let abandonedWord = false;

    for (
      let clueAttempt = 1;
      clueAttempt <= MAX_CLUE_ATTEMPTS_PER_LEXICAL && attempts < MAX_ATTEMPTS && !outOfTime();
      clueAttempt++
    ) {
      attempts++;
      stats.clueGenerations++;

      try {
        const clue = await generateClue(lexical, callAI, feedback);
        console.log(`  [clue ${clueAttempt}/${MAX_CLUE_ATTEMPTS_PER_LEXICAL}] "${clue.clue}"`);

        const verdict = await judgeClue(clue, lexical, callJudge);
        console.log(
          `  Judge: valid=${verdict.valid} score=${verdict.score ?? '—'} ` +
            `wordplay=${verdict.wordplayCorrect} surface=${verdict.surfaceQuality} ` +
            `mechanical=${verdict.mechanicalStatus ?? 'n/a'} rejectLexical=${verdict.rejectLexical}`
        );

        if (verdict.judgeUnavailable) {
          consecutiveJudgeUnavailable++;
          if (consecutiveJudgeUnavailable >= MAX_CONSECUTIVE_JUDGE_FAILURES) {
            throw abortRun(
              `Judge model unavailable for ${MAX_CONSECUTIVE_JUDGE_FAILURES} consecutive ` +
                `attempts — aborting. Last feedback: ${verdict.feedback}`
            );
          }
          console.warn(
            `  Judge unavailable (${consecutiveJudgeUnavailable}/${MAX_CONSECUTIVE_JUDGE_FAILURES}) ` +
              `— continuing to next attempt.`
          );
          feedback = null;
          continue;
        }
        consecutiveJudgeUnavailable = 0;

        if (verdict.valid) {
          console.log(`  Accepted (score ${verdict.score}/10): "${clue.clue}"`);
          return { lexical, clue, verdict, stats };
        }

        if (verdict.stage === 'mechanical' || verdict.stage === 'structural') {
          stats.mechanicalRejections++;
        } else {
          stats.judgeRejections++;
        }

        console.log(`  Rejected: ${verdict.feedback}`);

        if (verdict.rejectLexical) {
          console.log('  Lexical rejected — selecting a new word.');
          abandonedWord = true;
          break;
        }

        feedback = verdict.feedback;
      } catch (e) {
        if (isFatal(e)) throw e;
        console.error(`  Clue attempt ${clueAttempt} threw:`, e.message);
        feedback = null;
      }
    }

    // Remember this word either way: a hard rejection means it is unclueable,
    // and exhausting the inner retries means we could not clue it today.
    if (lexical?.answer) {
      exhaustedAnswers.push(lexical.answer);
      if (abandonedWord) {
        console.log(`  "${lexical.answer}" added to this run's avoid list.`);
      }
    }
  }

  const err = new Error(
    `Failed to generate a valid clue after ${attempts} attempts. ` +
      `Tried: ${exhaustedAnswers.join(', ') || '(none)'}. ` +
      `${stats.mechanicalRejections} rejected on wordplay arithmetic, ` +
      `${stats.judgeRejections} on judge review.`
  );
  err.stats = stats;
  throw err;
}
