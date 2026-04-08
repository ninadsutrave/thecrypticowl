import { createClient } from '@supabase/supabase-js';
import type { StreakData } from '../app/hooks/useStreak';

// ─── CLIENT ───────────────────────────────────────────────────────────────────

export const isSupabaseConfigured =
  !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

// Use placeholder strings when env vars are missing so createClient doesn't
// throw synchronously and crash the app before React mounts.
// All helper functions below guard on isSupabaseConfigured before making calls.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key'
);

// ─── ENUMS (mirror the PostgreSQL lookup tables / enums in 001_initial.sql) ───

export type ClueWordplayType =
  | 'anagram'
  | 'reversal'
  | 'container'
  | 'hidden'
  | 'deletion'
  | 'charade'
  | 'homophone'
  | 'double_definition'
  | 'cryptic_definition'
  | 'andlit'
  | 'compound';

export type ClueIndicatorType =
  | 'anagram'
  | 'reversal'
  | 'container'
  | 'hidden'
  | 'deletion'
  | 'homophone'
  | 'initial_letters'
  | 'final_letters'
  | 'alternating_letters'
  | 'spoonerism';

export type ClueComponentRole =
  | 'definition'
  | 'indicator'
  | 'fodder'
  | 'container_outer'
  | 'container_inner'
  | 'link_word'
  | 'result';

export type PuzzleDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

// ─── TYPES ────────────────────────────────────────────────────────────────────

/** One colour-coded segment of the clue string. Stored as JSONB in clues.clue_parts. */
export interface CluePart {
  text: string;
  /** null = structural text (letter count, filler) */
  type: 'definition' | 'indicator' | 'fodder' | 'link' | null;
}

/** One progressive hint card. Stored as JSONB in clues.hints.
 *  snake_case matches the DB column; the frontend maps to camelCase as needed. */
export interface PuzzleHint {
  id: number;
  title: string;
  text: string;
  highlight: string | null;
  mascot_comment: string;
  color: string;
  bg: string;
  bg_dark: string;
  border: string;
}

/**
 * Flattened result of daily_puzzles JOIN clues.
 * This is the primary type the frontend works with for the game.
 * `number` and `date` come from daily_puzzles; everything else from clues.
 */
export interface DbDailyPuzzle {
  // From daily_puzzles
  number: number; // puzzle_number — the user-facing "Puzzle #42"
  date: string; // ISO date string e.g. "2026-04-06"

  // From clues
  id: string;
  // Note: no `published` field — daily_puzzles.published is the sole visibility gate.
  // The RLS policy on clues enforces this; only clues with a published daily_puzzle row
  // are ever returned.
  clue_text: string;
  answer: string;
  answer_length: number; // generated column — always equals answer.length
  answer_pattern: string; // display form: "5", "3,4", "2-3"

  primary_type: ClueWordplayType;
  definition_text: string;
  wordplay_summary: string; // shown to user after a solve

  clue_parts: CluePart[];
  hints: PuzzleHint[];

  difficulty: PuzzleDifficulty;
  author: string | null;
  tags: string[];
  // notes is intentionally omitted — never sent to the frontend

  created_at: string;
  updated_at: string;
}

/** Row from the `clue_components` table (normalised wordplay breakdown). */
export interface DbClueComponent {
  id: string;
  clue_id: string;
  step_order: number;
  role: ClueComponentRole;
  clue_text: string;
  derived_text: string | null;
  indicator_type: ClueIndicatorType | null;
  explanation: string | null;
  created_at: string;
}

/** Row from the `user_stats` table. */
export interface DbUserStats {
  user_id: string;
  streak_count: number;
  best_streak: number;
  last_solved: string | null; // ISO date string
  total_solved: number;
  xp: number;
  level: number;
  updated_at: string;
}

/** Row from the `solve_history` table. */
export interface DbSolveRecord {
  id: string;
  user_id: string;
  clue_id: string;
  puzzle_number: number; // denormalised for fast list queries
  hints_used: number;
  wrong_attempts: number;
  xp_earned: number;
  solve_time_seconds: number | null;
  solved_at: string;
}

/** Row from the `clue_solve_stats` view (admin / clue-author use). */
export interface DbClueSolveStats {
  clue_id: string;
  date: string;
  primary_type: ClueWordplayType;
  difficulty: PuzzleDifficulty;
  author: string | null;
  total_solves: number;
  avg_hints_used: number | null;
  avg_solve_seconds: number | null;
  avg_wrong_attempts: number | null;
  hint_1_opens: number;
  hint_2_opens: number;
  hint_3_opens: number;
  hint_4_opens: number;
  zero_hint_solves: number;
  likes: number;
  dislikes: number;
  like_pct: number | null;
}

// ─── DAILY PUZZLES ────────────────────────────────────────────────────────────

/**
 * Fetch the published puzzle for a specific ISO date (e.g. "2026-04-06").
 * Joins daily_puzzles → clues and flattens the result into DbDailyPuzzle.
 * Returns null if no published puzzle exists for that date.
 */
export async function fetchPuzzleByDate(isoDate: string): Promise<DbDailyPuzzle | null> {
  if (!isSupabaseConfigured) return null;
  // Use limit(1) + order rather than .single() so that future multi-clue days
  // (crossword mode) don't cause a "multiple rows" error. We always want the first
  // clue in sequence (sequence_number = 1) for the standard daily game.
  const { data, error } = await supabase
    .from('daily_puzzles')
    .select(
      `
      puzzle_number,
      date,
      clues (
        id,
        clue_text, answer, answer_length, answer_pattern,
        primary_type, definition_text, wordplay_summary,
        clue_parts, hints,
        difficulty, author, tags,
        created_at, updated_at
      )
    `
    )
    .eq('date', isoDate)
    .eq('published', true)
    .order('sequence_number')
    .limit(1);

  if (error) {
    console.warn('[supabase] fetchPuzzleByDate:', error.message);
    return null;
  }
  if (!data || data.length === 0 || !data[0].clues) return null;

  // Flatten the nested join into a single object
  const row = data[0];
  const clue = row.clues as unknown as Record<string, unknown>;
  return {
    number: row.puzzle_number,
    date: row.date,
    ...clue,
  } as DbDailyPuzzle;
}

/**
 * Fetch a published puzzle by its sequential puzzle number (e.g. 42).
 * Returns null if not found or not published.
 */
export async function fetchPuzzleByNumber(puzzleNumber: number): Promise<DbDailyPuzzle | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('daily_puzzles')
    .select(
      `
      puzzle_number,
      date,
      clues (
        id,
        clue_text, answer, answer_length, answer_pattern,
        primary_type, definition_text, wordplay_summary,
        clue_parts, hints,
        difficulty, author, tags,
        created_at, updated_at
      )
    `
    )
    .eq('puzzle_number', puzzleNumber)
    .eq('published', true)
    .order('sequence_number')
    .limit(1);

  if (error) {
    console.warn('[supabase] fetchPuzzleByNumber:', error.message);
    return null;
  }
  if (!data || data.length === 0 || !data[0].clues) return null;

  const row = data[0];
  const clue = row.clues as unknown as Record<string, unknown>;
  return {
    number: row.puzzle_number,
    date: row.date,
    ...clue,
  } as DbDailyPuzzle;
}

/** Fetch all published daily puzzles ordered by date descending (for the archive). */
export async function fetchPuzzleArchive(): Promise<DbDailyPuzzle[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('daily_puzzles')
    .select(
      `
      puzzle_number,
      date,
      clues (
        id,
        clue_text, answer_length, answer_pattern,
        primary_type, difficulty
      )
    `
    )
    .eq('published', true)
    .order('date', { ascending: false });

  if (error) {
    console.warn('[supabase] fetchPuzzleArchive:', error.message);
    return [];
  }

  return (data ?? []).map(row => {
    const clue = (row.clues ?? {}) as unknown as Record<string, unknown>;
    return {
      number: row.puzzle_number,
      date: row.date,
      ...clue,
    } as DbDailyPuzzle;
  });
}

/** Fetch the normalised wordplay components for a clue (admin / detail view). */
export async function fetchClueComponents(clueId: string): Promise<DbClueComponent[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('clue_components')
    .select('*')
    .eq('clue_id', clueId)
    .order('step_order');
  if (error) {
    console.warn('[supabase] fetchClueComponents:', error.message);
    return [];
  }
  return (data ?? []) as DbClueComponent[];
}

// ─── USER STATS ───────────────────────────────────────────────────────────────

/** Fetch a user's aggregate stats row. Returns null if they haven't played yet. */
export async function fetchUserStats(userId: string): Promise<DbUserStats | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found
    console.warn('[supabase] fetchUserStats:', error.message);
  }
  return (data as DbUserStats) ?? null;
}

/**
 * Upsert a user's stats row directly.
 * Used only for the initial sign-in sync (syncLocalStatsToSupabase).
 * For in-game solves, use callRecordSolve() instead — it updates stats atomically.
 */
export async function upsertUserStats(
  userId: string,
  stats: Omit<StreakData, 'history'>
): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('user_stats').upsert({
    user_id: userId,
    streak_count: stats.count,
    last_solved: stats.lastSolved ? new Date(stats.lastSolved).toISOString().split('T')[0] : null,
    total_solved: stats.totalSolved,
    xp: stats.xp,
    level: stats.level,
    best_streak: stats.bestStreak,
  });
  if (error) console.warn('[supabase] upsertUserStats:', error.message);
}

/**
 * Push localStorage stats to Supabase on first sign-in.
 * Only upserts if the user has no existing row, or if local data is ahead.
 */
export async function syncLocalStatsToSupabase(
  userId: string,
  local: Omit<StreakData, 'history'>
): Promise<void> {
  if (!isSupabaseConfigured || local.totalSolved === 0) return;
  const existing = await fetchUserStats(userId);
  // Only push local data if it's ahead (more XP) or no remote record exists yet
  if (!existing || local.xp > existing.xp) {
    await upsertUserStats(userId, local);
  }
}

// ─── SOLVE HISTORY ────────────────────────────────────────────────────────────

/** Fetch a user's full solve history, newest first. */
export async function fetchSolveHistory(userId: string): Promise<DbSolveRecord[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('solve_history')
    .select('*')
    .eq('user_id', userId)
    .order('solved_at', { ascending: false });
  if (error) {
    console.warn('[supabase] fetchSolveHistory:', error.message);
    return [];
  }
  return (data ?? []) as DbSolveRecord[];
}

/**
 * Record a puzzle solve atomically via the record_solve() PL/pgSQL function.
 * Updates both solve_history and user_stats in a single transaction.
 * Returns true if this was a new solve, false if the user already solved this clue.
 */
export async function callRecordSolve(
  userId: string,
  record: {
    clueId: string;
    puzzleNumber: number;
    hintsUsed: number;
    wrongAttempts: number;
    xpEarned: number;
    solveTimeSeconds?: number;
    /** ISO date string "YYYY-MM-DD" in the user's local timezone.
     *  Passed as p_client_date to avoid streak-breaking timezone skew
     *  (e.g. IST users solving at 11 PM are still on "yesterday" in UTC). */
    clientDate?: string;
  }
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { data, error } = await supabase.rpc('record_solve', {
    p_user_id: userId,
    p_clue_id: record.clueId,
    p_puzzle_number: record.puzzleNumber,
    p_hints_used: record.hintsUsed,
    p_wrong_attempts: record.wrongAttempts,
    p_xp_earned: record.xpEarned,
    p_solve_time_seconds: record.solveTimeSeconds ?? null,
    p_client_date: record.clientDate ?? null,
  });
  if (error) {
    console.warn('[supabase] record_solve:', error.message);
    return false;
  }
  return data as boolean;
}

// ─── CLUE REACTIONS ───────────────────────────────────────────────────────────

/** Upsert a like or dislike for a clue. Keyed by clue_id (UUID). */
export async function upsertClueReaction(
  userId: string,
  clueId: string,
  reaction: 'like' | 'dislike'
): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('clue_reactions').upsert({
    user_id: userId,
    clue_id: clueId,
    reaction,
    updated_at: new Date().toISOString(),
  });
  if (error) console.warn('[supabase] upsertClueReaction:', error.message);
}

/** Remove a user's reaction (when they toggle off). */
export async function deleteClueReaction(userId: string, clueId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from('clue_reactions')
    .delete()
    .eq('user_id', userId)
    .eq('clue_id', clueId);
  if (error) console.warn('[supabase] deleteClueReaction:', error.message);
}
