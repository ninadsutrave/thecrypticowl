import type { SupabaseClient } from '@supabase/supabase-js';
import type { StreakData } from '../app/hooks/useStreak';

// ─── CLIENT (lazy-loaded) ─────────────────────────────────────────────────────
//
// The `@supabase/supabase-js` bundle is ~193 KB uncompressed. Importing it
// statically would parse-and-execute that code during initial hydration,
// blocking LCP on mobile. Instead we dynamic-import the package the first
// time any helper actually needs it — so it ships as its own chunk, loaded
// in parallel with the app's real first paint (and often _after_ LCP).

export const isSupabaseConfigured =
  !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

let _clientPromise: Promise<SupabaseClient> | null = null;

/**
 * Returns a cached Supabase client. First call pays the module import cost
 * (dynamic chunk); subsequent calls resolve immediately from the cache.
 * Safe to call even when env vars are missing — we use placeholder strings
 * so `createClient` won't throw, and the helper functions here guard on
 * `isSupabaseConfigured` before making real network calls.
 */
export function getSupabaseClient(): Promise<SupabaseClient> {
  if (!_clientPromise) {
    _clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(
        import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
        import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key'
      )
    );
  }
  return _clientPromise;
}

/**
 * Drop the cached Supabase client so the next getSupabaseClient() call
 * creates a fresh instance. Invoked from signOut() so that any in-memory
 * auth state in the current client is released alongside the localStorage
 * wipe. (We also hard-reload in signOut, so this is belt-and-braces; keeps
 * the invariant clean for any future non-reload sign-out path.)
 */
export function resetSupabaseClient(): void {
  _clientPromise = null;
}

/**
 * How long a read may take before we give up and render something.
 *
 * Without a bound, a blocked or very slow network leaves the puzzle page on
 * its loading skeleton indefinitely — the fetch never settles, so the code
 * that would show the fallback clue never runs. An ad blocker that filters
 * `*.supabase.co`, a captive portal, or a stalled DNS lookup all produce
 * exactly that. Eight seconds is well past a slow-3G round trip and well
 * short of a user deciding the site is broken.
 */
const READ_TIMEOUT_MS = 8_000;

/**
 * Resolve to `fallback` if `promise` has not settled in time.
 *
 * The underlying request is not cancelled — it may still populate the cache —
 * but the UI stops waiting on it.
 */
function withTimeout<T>(
  promise: Promise<T>,
  fallback: T,
  label: string,
  timeoutMs = READ_TIMEOUT_MS
): Promise<T> {
  return new Promise<T>(resolve => {
    const timer = setTimeout(() => {
      console.warn(`[supabase] ${label} timed out after ${timeoutMs}ms`);
      resolve(fallback);
    }, timeoutMs);

    promise
      .then(value => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(err => {
        clearTimeout(timer);
        console.warn(`[supabase] ${label} failed:`, err?.message ?? err);
        resolve(fallback);
      });
  });
}

// ─── ENUMS (mirror the PostgreSQL lookup tables / enums in 001_initial.sql) ───

export type ClueWordplayType =
  | 'anagram'
  | 'reversal'
  | 'container'
  | 'hidden'
  | 'deletion'
  | 'initial_letters'
  | 'final_letters'
  | 'alternating_letters'
  | 'spoonerism'
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

  /** Normalised wordplay breakdown from clue_components. Used to build progressive hints. */
  clue_components?: Array<{
    step_order: number;
    role: ClueComponentRole;
    clue_text: string;
    indicator_type: ClueIndicatorType | null;
  }> | null;

  difficulty: PuzzleDifficulty;
  author: string | null;
  author_id: string | null;
  author_social: string | null;
  author_profile?: {
    name: string;
    social_link: string | null;
    avatar_url: string | null;
  } | null;
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

/** Row from the `clue_submissions` table. */
export interface DbClueSubmission {
  id: string;
  user_id: string;
  clue_text: string;
  answer: string;
  answer_pattern: string;
  primary_type: ClueWordplayType;
  definition_text: string;
  wordplay_summary: string;
  fodder: string | null;
  indicator: string | null;
  explanation: string;

  // Contributor info
  author_name: string;
  author_email: string;
  author_social: string | null;

  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  created_at: string;
}

// ─── DAILY PUZZLES ────────────────────────────────────────────────────────────

/**
 * Fetch the published puzzle for a specific ISO date (e.g. "2026-04-06").
 * Joins daily_puzzles → clues → clue_components and flattens into DbDailyPuzzle.
 * If no puzzle exists for `isoDate`, automatically tries the previous day (once).
 * Returns null if neither date has a published puzzle.
 */
export function fetchPuzzleByDate(
  isoDate: string,
  allowFallback = true
): Promise<DbDailyPuzzle | null> {
  return withTimeout(fetchPuzzleByDateUncapped(isoDate, allowFallback), null, 'fetchPuzzleByDate');
}

async function fetchPuzzleByDateUncapped(
  isoDate: string,
  allowFallback = true
): Promise<DbDailyPuzzle | null> {
  const supabase = await getSupabaseClient();
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
        difficulty, author, author_id, author_social, tags,
        created_at, updated_at,
        authors (
          name,
          social_link,
          avatar_url
        ),
        clue_components (
          step_order, role, clue_text, indicator_type
        )
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

  // No puzzle for this date — try yesterday (only one level of fallback)
  if (!data || data.length === 0 || !data[0].clues) {
    if (allowFallback) {
      const [y, m, d] = isoDate.split('-').map(Number);
      const prev = new Date(y, m - 1, d - 1);
      const prevISO = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`;
      console.info('[supabase] No puzzle for today — falling back to', prevISO);
      return fetchPuzzleByDateUncapped(prevISO, false);
    }
    return null;
  }

  // Flatten the nested join into a single object
  const row = data[0];
  const clue = row.clues as unknown as Record<string, unknown>;

  // Sort clue_components by step_order (PostgREST nested selects are unordered)
  const components = ((clue.clue_components as DbDailyPuzzle['clue_components']) ?? []).sort(
    (a, b) => a.step_order - b.step_order
  );

  return {
    number: row.puzzle_number,
    date: row.date,
    ...clue,
    clue_components: components,
    author_profile: (clue.authors as DbDailyPuzzle['author_profile']) || null,
  } as DbDailyPuzzle;
}

/**
 * Fetch a published puzzle by its sequential puzzle number (e.g. 42).
 * Returns null if not found or not published.
 */
export function fetchPuzzleByNumber(puzzleNumber: number): Promise<DbDailyPuzzle | null> {
  return withTimeout(fetchPuzzleByNumberUncapped(puzzleNumber), null, 'fetchPuzzleByNumber');
}

async function fetchPuzzleByNumberUncapped(puzzleNumber: number): Promise<DbDailyPuzzle | null> {
  const supabase = await getSupabaseClient();
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
        difficulty, author, author_id, author_social, tags,
        created_at, updated_at,
        authors (
          name,
          social_link,
          avatar_url
        ),
        clue_components (
          step_order, role, clue_text, indicator_type
        )
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

  const components = ((clue.clue_components as DbDailyPuzzle['clue_components']) ?? []).sort(
    (a, b) => a.step_order - b.step_order
  );

  return {
    number: row.puzzle_number,
    date: row.date,
    ...clue,
    clue_components: components,
    author_profile: (clue.authors as DbDailyPuzzle['author_profile']) || null,
  } as DbDailyPuzzle;
}

/** Fetch all published daily puzzles ordered by date descending (for the archive). */
export async function fetchPuzzleArchive(): Promise<DbDailyPuzzle[]> {
  const supabase = await getSupabaseClient();
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
  const supabase = await getSupabaseClient();
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
  const supabase = await getSupabaseClient();
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
  const supabase = await getSupabaseClient();
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
  // Delegates to fetchUserStats / upsertUserStats — each acquires the client
  // itself, so this wrapper doesn't need a local `supabase` reference.
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
  const supabase = await getSupabaseClient();
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
  const supabase = await getSupabaseClient();
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

// ─── GENERATED DAILY PUZZLES (every game but cryptic) ─────────────────────────

/**
 * The day's puzzle for a game from `game_puzzles` (migration 004), written
 * ahead of time by that game's Lambda. Null when none exists yet, the network
 * fails, or Supabase isn't configured — callers fall back to a practice puzzle.
 */
export function fetchGamePuzzle(game: string, isoDate: string): Promise<unknown | null> {
  // Shorter than other reads: the player is looking at a loading board, and
  // a practice puzzle is a better answer than a long wait.
  return withTimeout(fetchGamePuzzleUncapped(game, isoDate), null, 'fetchGamePuzzle', 4_000);
}

async function fetchGamePuzzleUncapped(game: string, isoDate: string): Promise<unknown | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('game_puzzles')
    .select('payload')
    .eq('game', game)
    .eq('puzzle_date', isoDate)
    .maybeSingle();
  if (error) throw error;
  return data?.payload ?? null;
}

// ─── GAME PLAY HISTORY (all games) ────────────────────────────────────────────

/** A row of `game_plays` (migration 003). */
export interface DbGamePlay {
  user_id: string;
  game: string;
  puzzle_date: string;
  outcome: 'solved' | 'failed' | 'revealed';
  seconds: number;
  hints_used: number;
  mistakes: number;
  score: string | null;
  details: Record<string, number | string | boolean>;
  completed_at: string;
}

/** Every play the user has recorded, newest first. */
export function fetchGamePlays(userId: string): Promise<DbGamePlay[]> {
  return withTimeout(fetchGamePlaysUncapped(userId), [], 'fetchGamePlays');
}

async function fetchGamePlaysUncapped(userId: string): Promise<DbGamePlay[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from('game_plays')
    .select('*')
    .eq('user_id', userId)
    .order('puzzle_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbGamePlay[];
}

/**
 * Insert plays, skipping any (user, game, date) already stored — the first
 * finish of a day is final, so a re-sync can never overwrite it.
 */
export async function insertGamePlays(rows: DbGamePlay[]): Promise<boolean> {
  if (!isSupabaseConfigured || rows.length === 0) return true;
  const supabase = await getSupabaseClient();
  const { error } = await supabase
    .from('game_plays')
    .upsert(rows, { onConflict: 'user_id,game,puzzle_date', ignoreDuplicates: true });
  if (error) {
    console.warn('[supabase] insertGamePlays:', error.message);
    return false;
  }
  return true;
}

// ─── CLUE REACTIONS ───────────────────────────────────────────────────────────

/** Upsert a like or dislike for a clue. Keyed by clue_id (UUID). */
export async function upsertClueReaction(
  userId: string,
  clueId: string,
  reaction: 'like' | 'dislike'
): Promise<void> {
  const supabase = await getSupabaseClient();
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
  const supabase = await getSupabaseClient();
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from('clue_reactions')
    .delete()
    .eq('user_id', userId)
    .eq('clue_id', clueId);
  if (error) console.warn('[supabase] deleteClueReaction:', error.message);
}

// ─── APP LIKES ───────────────────────────────────────────────────────────────

/** Fetch the total number of likes for the entire app. */
export async function fetchAppLikesCount(): Promise<number> {
  const supabase = await getSupabaseClient();
  if (!isSupabaseConfigured) return 0;
  const { data, error } = await supabase.from('app_likes_count').select('total_likes').single();
  if (error) {
    console.warn('[supabase] fetchAppLikesCount:', error.message);
    return 0;
  }
  return data?.total_likes ?? 0;
}

/** Record a new like for the app. */
export async function addAppLike(): Promise<boolean> {
  const supabase = await getSupabaseClient();
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase.from('app_likes').insert({});
  if (error) {
    console.warn('[supabase] addAppLike:', error.message);
    return false;
  }
  return true;
}

// removeAppLike removed — anonymous rows are write-only appreciation.

// ─── PUZZLE SUGGESTIONS ──────────────────────────────────────────────────────

/**
 * Suggest a puzzle type (migration 007). Insert-only: nothing is read back.
 * Signed-in suggesters are linked by the database's default (auth.uid()).
 */
export async function submitPuzzleSuggestion(idea: string, name?: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const supabase = await getSupabaseClient();
  const { error } = await supabase
    .from('puzzle_suggestions')
    .insert({ idea: idea.trim(), name: name?.trim() || null });
  if (error) {
    console.warn('[supabase] submitPuzzleSuggestion:', error.message);
    return false;
  }
  return true;
}

// ─── CLUE SUBMISSIONS ────────────────────────────────────────────────────────

/** Submit a new clue for review. */
export async function submitClue(
  userId: string,
  clue: Omit<DbClueSubmission, 'id' | 'user_id' | 'status' | 'admin_notes' | 'created_at'>
): Promise<boolean> {
  const supabase = await getSupabaseClient();
  if (!isSupabaseConfigured) return false;
  const { error } = await supabase.from('clue_submissions').insert({
    user_id: userId,
    ...clue,
  });
  if (error) {
    console.warn('[supabase] submitClue:', error.message);
    return false;
  }
  return true;
}

/** Fetch all submissions for a specific user. */
export async function fetchUserSubmissions(userId: string): Promise<DbClueSubmission[]> {
  const supabase = await getSupabaseClient();
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('clue_submissions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[supabase] fetchUserSubmissions:', error.message);
    return [];
  }
  return (data ?? []) as DbClueSubmission[];
}
