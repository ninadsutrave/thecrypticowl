import { getDBClient } from '../../../shared/clients/dbClient.js';
import { authorIdFor } from '../../../shared/constants/providers.js';
import { constructHints } from '../builder/hintBuilder.js';

/** Postgres unique-violation SQLSTATE. */
const PG_UNIQUE_VIOLATION = '23505';

/** How far back the variety window looks. */
const VARIETY_WINDOW_DAYS = 14;

/** A wordplay type used this many times in the window is temporarily banned. */
const TYPE_REPEAT_LIMIT = 3;

// Maps clue_part types → clue_components role values. Anything unmapped is a
// structural link word.
const PART_ROLE_MAP = {
  definition: 'definition',
  indicator: 'indicator',
  fodder: 'fodder',
  container_outer: 'container_outer',
  container_inner: 'container_inner',
  result: 'result',
};

// Fallback from wordplay type → clue_indicator_types.id, used only when the
// model did not report an explicit indicator_type. Charade, double_definition,
// cryptic_definition, andlit and compound have no single classifiable
// indicator, so they are absent here and fall back to null.
const INDICATOR_TYPE_MAP = {
  anagram: 'anagram',
  reversal: 'reversal',
  container: 'container',
  hidden: 'hidden',
  deletion: 'deletion',
  homophone: 'homophone',
  initial_letters: 'initial_letters',
  final_letters: 'final_letters',
  alternating_letters: 'alternating_letters',
  spoonerism: 'spoonerism',
};

const VALID_INDICATOR_TYPES = new Set(Object.values(INDICATOR_TYPE_MAP));

/**
 * Display letter-count pattern for an answer.
 *
 * Answers are stored as uppercase letters with no spaces ("ROSEWATER"), and
 * `answer_pattern` carries the display form the solver sees ("4,5"). When the
 * planner supplies an explicit multi-word breakdown we honour it; otherwise
 * the pattern is the single total.
 *
 * Validated against the same regex as the DB CHECK so a malformed pattern
 * fails here with a clear message rather than as an opaque constraint
 * violation three statements later.
 */
export function deriveAnswerPattern(answer, wordLengths = null) {
  const total = String(answer).replace(/[^A-Za-z]/g, '').length;
  if (!Array.isArray(wordLengths) || wordLengths.length === 0) return String(total);

  const sum = wordLengths.reduce((s, n) => s + n, 0);
  if (sum !== total) {
    throw new Error(
      `answer_pattern word lengths [${wordLengths.join(',')}] sum to ${sum}, ` +
        `but "${answer}" has ${total} letters.`
    );
  }
  const pattern = wordLengths.join(',');
  if (!/^[0-9][0-9,-]*$/.test(pattern)) {
    throw new Error(`Derived answer_pattern "${pattern}" is not a valid pattern.`);
  }
  return pattern;
}

/**
 * Variety and uniqueness constraints for the lexical planner.
 *
 * Two separate things:
 *   avoidAnswers  — used in the last 14 days. Injected into the prompt for
 *                   variety; a short list keeps the prompt small.
 *   knownAnswers  — every answer ever published. `clues` has a UNIQUE index on
 *                   (answer, answer_pattern), so re-using one is not a style
 *                   problem, it is an insert that fails at the very end of the
 *                   run after every AI call has already been paid for. The
 *                   pipeline screens against this set instead.
 */
export async function getRecentUsage(dbProvider) {
  const db = getDBClient(dbProvider);

  const since = new Date();
  since.setDate(since.getDate() - VARIETY_WINDOW_DAYS);
  const sinceIso = since.toISOString().split('T')[0];

  const [recent, all] = await Promise.all([
    db.from('daily_puzzles').select('clues(answer, primary_type)').gte('date', sinceIso),
    db.from('clues').select('answer'),
  ]);

  if (recent.error) throw recent.error;

  const avoidAnswers = [];
  const typeCounts = {};

  for (const row of recent.data ?? []) {
    const clue = row.clues;
    if (!clue) continue;
    if (clue.answer) avoidAnswers.push(clue.answer);
    if (clue.primary_type) {
      typeCounts[clue.primary_type] = (typeCounts[clue.primary_type] ?? 0) + 1;
    }
  }

  const avoidTypes = Object.entries(typeCounts)
    .filter(([, count]) => count >= TYPE_REPEAT_LIMIT)
    .map(([type]) => type);

  // Non-fatal: without the full set we simply fall back to catching the
  // unique violation at insert time.
  const knownAnswers = new Set(
    all.error ? [] : (all.data ?? []).map(r => String(r.answer).toUpperCase())
  );
  if (all.error) {
    console.warn('Could not load full answer history for dedupe:', all.error.message);
  }

  return { avoidTypes, avoidAnswers, knownAnswers };
}

/**
 * Saves the generated clue and its metadata.
 *
 * @param {object} lexical    - { answer, type, definition, difficulty, wordLengths? }
 * @param {object} clue       - generated clue payload
 * @param {object} verdict    - judge scores
 * @param {string} aiProvider
 * @param {string} dbProvider
 */
export async function writeToDB(lexical, clue, verdict = {}, aiProvider, dbProvider = 'supabase') {
  const db = getDBClient(dbProvider);
  const authorId = authorIdFor(aiProvider);
  const hints = constructHints(lexical, clue);

  // ── 1. Target date: max(today, latest + 1) ─────────────────────────────────
  // "today" means a missed run (quota, outage) fills the current day forward
  // rather than leaving a gap. "latest + 1" means a second invocation on the
  // same day schedules tomorrow instead of colliding. Together: always a
  // unique, non-past date adjacent to the archive.
  const todayStr = new Date().toISOString().split('T')[0];

  const { data: latestRows } = await db
    .from('daily_puzzles')
    .select('date')
    .order('date', { ascending: false })
    .limit(1);

  const latestDate = latestRows?.[0]?.date ?? null;
  let targetDate = todayStr;
  if (latestDate) {
    const next = new Date(`${latestDate}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    const nextStr = next.toISOString().split('T')[0];
    if (nextStr > targetDate) targetDate = nextStr;
  }
  console.log(
    `[dbService] Target date: ${targetDate} (today=${todayStr}, latest_in_db=${latestDate ?? 'none'})`
  );

  // ── 2. Idempotency guard ───────────────────────────────────────────────────
  // Defensive: step 1 should already guarantee a free date, but two lambdas
  // racing (manual trigger during the scheduled run) would both get here.
  // limit(1) rather than maybeSingle() so a future multi-clue day — which the
  // schema is explicitly designed to allow — does not throw here.
  const { data: existingRows } = await db
    .from('daily_puzzles')
    .select('id')
    .eq('date', targetDate)
    .limit(1);

  if (existingRows?.length) {
    console.log(`Puzzle already exists for ${targetDate}. Skipping generation.`);
    return { skipped: true, date: targetDate };
  }

  // ── 3. Next puzzle number ──────────────────────────────────────────────────
  const { data: maxRows } = await db
    .from('daily_puzzles')
    .select('puzzle_number')
    .order('puzzle_number', { ascending: false })
    .limit(1);

  const nextPuzzleNumber = (maxRows?.[0]?.puzzle_number ?? 0) + 1;

  // ── 4. Insert the clue ─────────────────────────────────────────────────────
  const { data: clueData, error: clueError } = await db
    .from('clues')
    .insert({
      clue_text: clue.clue,
      answer: lexical.answer,
      answer_pattern: deriveAnswerPattern(lexical.answer, lexical.wordLengths),
      primary_type: lexical.type,
      definition_text: clue.definition,
      wordplay_summary: clue.wordplay_summary,
      clue_parts: clue.clue_parts,
      hints,
      difficulty: lexical.difficulty || 'medium',
      author_id: authorId,
      judge_score: verdict.score ?? null,
      judge_surface_quality: verdict.surfaceQuality ?? null,
      judge_wordplay_correct: verdict.wordplayCorrect ?? null,
      judge_indicator_fair: verdict.indicatorFair ?? null,
      // Whether the wordplay arithmetic was proved in code rather than
      // assessed by a model. Lets us measure how much of the archive rests on
      // deterministic verification vs. model judgement.
      mechanically_verified: verdict.mechanicallyVerified ?? false,
    })
    .select()
    .single();

  if (clueError) {
    if (clueError.code === PG_UNIQUE_VIOLATION) {
      // (answer, answer_pattern) and clue_text are both UNIQUE. Reaching here
      // means the pipeline's dedupe screen missed — name it precisely so the
      // alert says what happened rather than just "23505".
      const dup = new Error(
        `Duplicate clue rejected by the database: answer "${lexical.answer}" or this exact ` +
          `clue text has already been published. The pipeline's answer-dedupe screen did not ` +
          `catch it — check getRecentUsage().knownAnswers is being passed through.`
      );
      dup.duplicate = true;
      throw dup;
    }
    throw clueError;
  }

  // ── 5. Schedule it ─────────────────────────────────────────────────────────
  // Not transactional — a PL/pgSQL RPC would be — but a best-effort delete
  // closes the window where an orphaned clue row survives a failed run.
  const { error: dpError } = await db.from('daily_puzzles').insert({
    date: targetDate,
    clue_id: clueData.id,
    published: true,
    sequence_number: 1,
    puzzle_number: nextPuzzleNumber,
  });

  if (dpError && dpError.code !== PG_UNIQUE_VIOLATION) {
    console.error(
      `daily_puzzles insert failed (${dpError.code}: ${dpError.message}). ` +
        `Rolling back clue ${clueData.id}.`
    );
    const { error: rbError } = await db.from('clues').delete().eq('id', clueData.id);
    if (rbError) {
      console.error('Rollback of clue row failed — manual cleanup required:', rbError.message);
    }
    throw dpError;
  }

  // ── 6. Normalised breakdown ────────────────────────────────────────────────
  // Each indicator's sub-type resolves in order of preference:
  //   1. part.indicator_subtype — per-indicator, and REQUIRED for compound
  //      clues where two indicators have different sub-types.
  //   2. clue.indicator_type — the model's top-level summary.
  //   3. INDICATOR_TYPE_MAP[type] — derivation fallback for legacy payloads.
  const topReportedType = VALID_INDICATOR_TYPES.has(clue.indicator_type)
    ? clue.indicator_type
    : null;
  const fallbackIndicatorType = topReportedType ?? INDICATOR_TYPE_MAP[lexical.type] ?? null;

  const components = (clue.clue_parts ?? [])
    .filter(part => part.type)
    .map((part, index) => {
      const role = PART_ROLE_MAP[part.type] || 'link_word';
      let indicatorType = null;
      if (role === 'indicator') {
        const sub = part.indicator_subtype;
        indicatorType = VALID_INDICATOR_TYPES.has(sub) ? sub : fallbackIndicatorType;
      }
      return {
        clue_id: clueData.id,
        step_order: index + 1,
        role,
        clue_text: part.text.trim(),
        indicator_type: indicatorType,
        // Deliberately null for AI-generated clues: an explanation here would
        // spoil the answer. Human-authored clues populate it via the admin UI.
        explanation: null,
      };
    });

  if (components.length > 0) {
    const { error: ccError } = await db.from('clue_components').insert(components);
    if (ccError) {
      // Supplementary pedagogy, not core data — the clue is still playable.
      console.warn('clue_components insert failed (non-fatal):', ccError.message);
    }
  }

  return { skipped: false, date: targetDate, clueId: clueData.id, puzzleNumber: nextPuzzleNumber };
}
