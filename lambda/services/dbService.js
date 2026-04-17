import { getDBClient } from '../clients/dbClient.js';
import { AUTHOR_MAP } from '../constants/clue.js';
import { constructHints } from '../core/builder/hintBuilder.js';

// Maps clue_part types → clue_components role values.
// Roles not in this map fall back to "link_word".
const PART_ROLE_MAP = {
  definition: 'definition',
  indicator: 'indicator',
  fodder: 'fodder',
  container_outer: 'container_outer',
  container_inner: 'container_inner',
  result: 'result',
};

// Fallback map from wordplay type → clue_indicator_types.id values, used only
// when the clue response does not provide an explicit indicator_type. Preferred
// source is clue.indicator_type (model-reported), which covers compound clues
// correctly and avoids guessing for single-mechanism types.
// Charade, double_definition, cryptic_definition, andlit, and compound have no
// single classifiable indicator type, so they are omitted and fall back to null.
const INDICATOR_TYPE_MAP = {
  anagram:             'anagram',
  reversal:            'reversal',
  container:           'container',
  hidden:              'hidden',
  deletion:            'deletion',
  homophone:           'homophone',
  initial_letters:     'initial_letters',
  final_letters:       'final_letters',
  alternating_letters: 'alternating_letters',
  spoonerism:          'spoonerism',
};

// Valid indicator_type IDs (mirrors clue_indicator_types in the DB).
// Anything outside this set is treated as "no classified indicator".
const VALID_INDICATOR_TYPES = new Set([
  'anagram', 'reversal', 'container', 'hidden', 'deletion', 'homophone',
  'initial_letters', 'final_letters', 'alternating_letters', 'spoonerism',
]);

/**
 * Returns variety constraints based on clue usage in the last 14 days.
 * Avoids types used 3+ times and answers used at all.
 *
 * @param {string} dbProvider
 * @returns {{ avoidTypes: string[], avoidAnswers: string[] }}
 */
export async function getRecentUsage(dbProvider) {
  const db = getDBClient(dbProvider);

  const since = new Date();
  since.setDate(since.getDate() - 14);
  const sinceIso = since.toISOString().split('T')[0];

  const { data, error } = await db
    .from('daily_puzzles')
    .select('clues(answer, primary_type)')
    .gte('date', sinceIso);

  if (error) throw error;

  const avoidAnswers = [];
  const typeCounts = {};

  for (const row of data || []) {
    const clue = row.clues;
    if (!clue) continue;
    if (clue.answer) avoidAnswers.push(clue.answer);
    if (clue.primary_type) {
      typeCounts[clue.primary_type] = (typeCounts[clue.primary_type] || 0) + 1;
    }
  }

  // Avoid any type used 3 or more times in the last 14 days.
  const avoidTypes = Object.entries(typeCounts)
    .filter(([, count]) => count >= 3)
    .map(([type]) => type);

  return { avoidTypes, avoidAnswers };
}

/**
 * Saves the generated clue and its metadata to the database.
 *
 * @param {object} lexical    - { answer, type, definition, difficulty }
 * @param {object} clue       - { clue, definition, indicator, fodder, clue_parts, wordplay_summary }
 * @param {object} verdict    - judge scores: { score, surfaceQuality, wordplayCorrect, indicatorFair }
 * @param {string} aiProvider
 * @param {string} dbProvider
 */
export async function writeToDB(lexical, clue, verdict = {}, aiProvider, dbProvider = 'supabase') {
  const db = getDBClient(dbProvider);
  const authorId = AUTHOR_MAP[aiProvider.toLowerCase()] || AUTHOR_MAP.gemini;
  const hints = constructHints(lexical, clue);

  // 1. Determine target date (next day — lambda runs at 23:50 UTC).
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 1);
  const targetDate = date.toISOString().split('T')[0];

  // 2. Idempotency check: skip if a puzzle already exists for this date.
  const { data: existingPuzzle } = await db
    .from('daily_puzzles')
    .select('id')
    .eq('date', targetDate)
    .maybeSingle();

  if (existingPuzzle) {
    console.log(`Puzzle already exists for ${targetDate}. Skipping generation.`);
    return { skipped: true, date: targetDate };
  }

  // 3. Determine next puzzle_number (sequential, never null).
  const { data: maxRow } = await db
    .from('daily_puzzles')
    .select('puzzle_number')
    .order('puzzle_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPuzzleNumber = (maxRow?.puzzle_number ?? 0) + 1;

  // 4. Insert clue (includes judge quality scores for analytics).
  const { data: clueData, error: clueError } = await db
    .from('clues')
    .insert({
      clue_text: clue.clue,
      answer: lexical.answer,
      answer_pattern: String(lexical.answer.length),
      primary_type: lexical.type,
      definition_text: clue.definition,
      wordplay_summary: clue.wordplay_summary,
      clue_parts: clue.clue_parts,
      hints,
      difficulty: lexical.difficulty || 'medium',
      author_id: authorId,
      // Judge quality scores — useful for tracking trends and filtering by quality.
      judge_score: verdict.score ?? null,
      judge_surface_quality: verdict.surfaceQuality ?? null,
      judge_wordplay_correct: verdict.wordplayCorrect ?? null,
      judge_indicator_fair: verdict.indicatorFair ?? null,
    })
    .select()
    .single();

  if (clueError) throw clueError;

  // 5. Insert daily_puzzle row.
  const { error: dpError } = await db.from('daily_puzzles').insert({
    date: targetDate,
    clue_id: clueData.id,
    published: true,
    sequence_number: 1,
    puzzle_number: nextPuzzleNumber,
  });

  if (dpError && dpError.code !== '23505') {
    throw dpError;
  }

  // 6. Insert clue_components (pedagogical breakdown — derived from clue_parts).
  // Each indicator component's indicator_type comes from, in order of preference:
  //   1. part.indicator_subtype (per-indicator — REQUIRED for compound clues
  //      where multiple indicators have DIFFERENT sub-types).
  //   2. clue.indicator_type (primary/summary — model-reported top-level).
  //   3. INDICATOR_TYPE_MAP[lexical.type] (derivation fallback for legacy payloads).
  const topReportedType = clue.indicator_type && VALID_INDICATOR_TYPES.has(clue.indicator_type)
    ? clue.indicator_type
    : null;
  const fallbackIndicatorType = topReportedType ?? INDICATOR_TYPE_MAP[lexical.type] ?? null;

  const components = clue.clue_parts
    .filter((part) => part.type) // skip structural nulls (link words, letter count)
    .map((part, index) => {
      const role = PART_ROLE_MAP[part.type] || 'link_word';
      let perPartIndicatorType = null;
      if (role === 'indicator') {
        const sub = part.indicator_subtype;
        perPartIndicatorType = sub && VALID_INDICATOR_TYPES.has(sub) ? sub : fallbackIndicatorType;
      }
      return {
        clue_id: clueData.id,
        step_order: index + 1,
        role,
        clue_text: part.text.trim(),
        indicator_type: perPartIndicatorType,
        // explanation is intentionally null for AI-generated clues to avoid spoiling the answer.
        // Human-authored clues can populate this via the admin UI for richer Hint 3 text.
        explanation: null,
      };
    });

  if (components.length > 0) {
    const { error: ccError } = await db.from('clue_components').insert(components);
    if (ccError) {
      // Non-fatal: components are supplementary pedagogy, not core data.
      console.warn('clue_components insert failed (non-fatal):', ccError.message);
    }
  }

  return { skipped: false, date: targetDate, clueId: clueData.id, puzzleNumber: nextPuzzleNumber };
}
