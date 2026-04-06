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

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface PuzzleHint {
  id: number;
  title: string;
  text: string;
  highlight: string | null;
  mascotComment: string;
  color: string;
  bg: string;
  bgDark: string;
  border: string;
}

export interface CluePart {
  text: string;
  type: string | null;
}

/** Row shape in the `puzzles` table */
export interface DbPuzzle {
  id: string;
  number: number;
  date: string;          // ISO date string e.g. "2026-04-06"
  clue: string;
  answer: string;
  letter_count: number;
  clue_type: string | null;
  hints: PuzzleHint[];
  clue_parts: CluePart[];
  created_at: string;
}

/** Row shape in the `user_stats` table */
export interface DbUserStats {
  user_id: string;
  streak_count: number;
  last_solved: string | null; // ISO date string
  total_solved: number;
  xp: number;
  level: number;
  best_streak: number;
  updated_at: string;
}

/** Row shape in the `solve_history` table */
export interface DbSolveRecord {
  id: string;
  user_id: string;
  puzzle_number: number;
  hints_used: number;
  xp_earned: number;
  solved_at: string;
}

// ─── PUZZLES ──────────────────────────────────────────────────────────────────

/** Fetch the puzzle for a specific ISO date (e.g. today). Returns null if not found. */
export async function fetchPuzzleByDate(isoDate: string): Promise<DbPuzzle | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('puzzles')
    .select('*')
    .eq('date', isoDate)
    .single();
  if (error) {
    console.warn('[supabase] fetchPuzzleByDate:', error.message);
    return null;
  }
  return data as DbPuzzle;
}

/** Fetch all puzzles ordered by date descending (for the archive). */
export async function fetchPuzzleArchive(): Promise<DbPuzzle[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('puzzles')
    .select('id, number, date, clue, clue_type, letter_count')
    .order('date', { ascending: false });
  if (error) {
    console.warn('[supabase] fetchPuzzleArchive:', error.message);
    return [];
  }
  return (data ?? []) as DbPuzzle[];
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
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
    console.warn('[supabase] fetchUserStats:', error.message);
  }
  return (data as DbUserStats) ?? null;
}

/** Create or update a user's stats row. */
export async function upsertUserStats(userId: string, stats: Omit<StreakData, 'history'>): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('user_stats').upsert({
    user_id: userId,
    streak_count: stats.count,
    last_solved: stats.lastSolved
      ? new Date(stats.lastSolved).toISOString().split('T')[0]
      : null,
    total_solved: stats.totalSolved,
    xp: stats.xp,
    level: stats.level,
    best_streak: stats.bestStreak,
    updated_at: new Date().toISOString(),
  });
  if (error) console.warn('[supabase] upsertUserStats:', error.message);
}

/**
 * Push localStorage stats to Supabase on first sign-in.
 * Only upserts if the user has no existing row, or if local data is ahead.
 */
export async function syncLocalStatsToSupabase(userId: string, local: Omit<StreakData, 'history'>): Promise<void> {
  if (!isSupabaseConfigured || local.totalSolved === 0) return;
  const existing = await fetchUserStats(userId);
  // Only push if local is ahead (more XP) or no remote data exists
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

/** Record a puzzle solve. Ignores duplicate (user_id, puzzle_number) pairs. */
export async function insertSolveRecord(
  userId: string,
  record: { puzzleNumber: number; hintsUsed: number; xpEarned: number }
): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('solve_history').upsert(
    {
      user_id: userId,
      puzzle_number: record.puzzleNumber,
      hints_used: record.hintsUsed,
      xp_earned: record.xpEarned,
      solved_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,puzzle_number', ignoreDuplicates: true }
  );
  if (error) console.warn('[supabase] insertSolveRecord:', error.message);
}

// ─── CLUE REACTIONS ───────────────────────────────────────────────────────────

/** Upsert a like or dislike for a puzzle clue. */
export async function upsertClueReaction(
  userId: string,
  puzzleNumber: number,
  reaction: 'like' | 'dislike'
): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('clue_reactions').upsert({
    user_id: userId,
    puzzle_number: puzzleNumber,
    reaction,
    updated_at: new Date().toISOString(),
  });
  if (error) console.warn('[supabase] upsertClueReaction:', error.message);
}

/** Remove a user's reaction (when they toggle off). */
export async function deleteClueReaction(
  userId: string,
  puzzleNumber: number
): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from('clue_reactions')
    .delete()
    .eq('user_id', userId)
    .eq('puzzle_number', puzzleNumber);
  if (error) console.warn('[supabase] deleteClueReaction:', error.message);
}
