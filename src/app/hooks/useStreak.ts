import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { callRecordSolve, fetchUserStats } from '../../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { StoreKeys, readJSON, writeJSON } from '../lib/localStore';

export interface SolveRecord {
  date: string;
  puzzleNumber: number;
  hintsUsed: number;
  xpEarned: number;
}

export interface StreakData {
  count: number;
  lastSolved: string | null;
  totalSolved: number;
  xp: number;
  level: number;
  bestStreak: number;
  history: SolveRecord[];
}

const STORAGE_KEY = StoreKeys.streak;

const EMPTY: StreakData = {
  count: 0,
  lastSolved: null,
  totalSolved: 0,
  xp: 0,
  level: 1,
  bestStreak: 0,
  history: [],
};

// ─── SHARED STORE ─────────────────────────────────────────────────────────────
//
// Every component calling useStreak used to hold its own useState copy seeded
// from localStorage, so recording a solve on the success screen left the
// navbar's 🔥 counter showing the old value until something happened to
// remount it. One module-level snapshot with subscribers means every consumer
// re-renders together, and `useSyncExternalStore` gives React a stable
// snapshot identity so it does not loop.

let snapshot: StreakData = readJSON<StreakData>(STORAGE_KEY, EMPTY);
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach(l => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): StreakData {
  return snapshot;
}

/** Replace the shared snapshot, persist it, and notify every consumer. */
function commit(next: StreakData) {
  snapshot = next;
  writeJSON(STORAGE_KEY, next);
  emit();
}

/** Exported so AuthContext can read local data on sign-in for the sync. */
export function getStoredStreakData(): StreakData {
  return snapshot;
}

/** Re-read from storage — used after a cross-tab change or a sign-out wipe. */
export function reloadStreakData(): void {
  snapshot = readJSON<StreakData>(STORAGE_KEY, EMPTY);
  emit();
}

// Another tab solving a puzzle should update this one's navbar too.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    if (e.key === STORAGE_KEY) reloadStreakData();
  });
}

// ─── SCORING ──────────────────────────────────────────────────────────────────

export function getXPForSolve(hintsUsed: number): number {
  if (hintsUsed === 0) return 100;
  if (hintsUsed === 1) return 75;
  if (hintsUsed === 2) return 50;
  if (hintsUsed === 3) return 25;
  return 10;
}

export function getLevelFromXP(xp: number, history: SolveRecord[] = []): number {
  const baseLevel = Math.floor(Math.sqrt(xp / 50)) + 1;
  if (history.length < 2) return baseLevel;

  // Consistency penalty: a long gap between recent solves costs levels, so the
  // title reflects current habit rather than lifetime total.
  const recentHistory = history.slice(0, 5);
  let maxGapDays = 0;
  for (let i = 0; i < recentHistory.length - 1; i++) {
    const d1 = new Date(recentHistory[i].date).getTime();
    const d2 = new Date(recentHistory[i + 1].date).getTime();
    const gap = Math.floor((d1 - d2) / (1000 * 60 * 60 * 24));
    if (gap > maxGapDays) maxGapDays = gap;
  }

  const penalty = maxGapDays > 3 ? Math.floor(maxGapDays / 3) : 0;
  return Math.max(1, baseLevel - penalty);
}

export function getXPToNextLevel(
  xp: number,
  history: SolveRecord[] = []
): { current: number; needed: number; label: string } {
  const level = getLevelFromXP(xp, history);
  const currentLevelXP = (level - 1) ** 2 * 50;
  const nextLevelXP = level ** 2 * 50;
  return {
    current: xp - currentLevelXP,
    needed: nextLevelXP - currentLevelXP,
    label: `Level ${level}`,
  };
}

export function getLevelTitle(level: number): string {
  if (level >= 20) return 'Grand Master 🏆';
  if (level >= 15) return 'Puzzle Expert 🎓';
  if (level >= 10) return 'Wise Owl 🦉';
  if (level >= 5) return 'Puzzle Hunter 🔎';
  if (level >= 2) return 'Apprentice Solver 📖';
  return 'Newbie Owlet 🐣';
}

/** Local-time day key. Deliberately not UTC — see recordSolve. */
export function todayKey(now = new Date()): string {
  return now.toDateString();
}

export function hasSolvedToday(): boolean {
  return snapshot.lastSolved === todayKey();
}

// ─── HOOK ─────────────────────────────────────────────────────────────────────

export function useStreak() {
  const data = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const { user, isSignedIn, loading: authLoading } = useAuth();

  // Hydrate from Supabase once per sign-in. Without this, signing in on a
  // fresh device shows streak 0 / xp 0 until the next local solve, even when
  // the server holds the real progress.
  useEffect(() => {
    if (authLoading || !isSignedIn || !user) return;
    let cancelled = false;

    fetchUserStats(user.id)
      .then(remote => {
        if (cancelled || !remote) return;
        const local = snapshot;
        const merged: StreakData = {
          // NOTE: this merge takes the higher of local and remote on every
          // field, so a legitimately broken streak is restored from whichever
          // side is stale. Making the server authoritative is the correct fix
          // but changes what existing users see, so it is left as a product
          // decision rather than folded into a refactor.
          count: Math.max(local.count, remote.streak_count),
          lastSolved: local.lastSolved, // local-time day key; remote uses a UTC date
          totalSolved: Math.max(local.totalSolved, remote.total_solved),
          xp: Math.max(local.xp, remote.xp),
          level: Math.max(local.level, remote.level),
          bestStreak: Math.max(local.bestStreak, remote.best_streak),
          history: local.history,
        };

        const changed =
          merged.count !== local.count ||
          merged.totalSolved !== local.totalSolved ||
          merged.xp !== local.xp ||
          merged.level !== local.level ||
          merged.bestStreak !== local.bestStreak;

        if (changed) commit(merged);
      })
      .catch(() => {
        /* best-effort hydration; the local cache stands on failure */
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, isSignedIn, user]);

  /**
   * Record a solve.
   * - Always writes locally first, so signed-out and offline solves count.
   * - Syncs to Supabase in the background when we have both a user and a
   *   clue UUID. `record_solve` writes solve_history and user_stats in one
   *   transaction, so no separate stats upsert is needed.
   *
   * Returns the new snapshot, or the existing one if today is already solved.
   */
  const recordSolve = useCallback(
    (
      hintsUsed: number,
      puzzleNumber = 0,
      userId?: string,
      puzzleId?: string,
      wrongAttempts = 0,
      solveTimeSeconds?: number
    ): StreakData => {
      const today = todayKey();
      const current = snapshot;

      if (current.lastSolved === today) return current;

      const yesterday = todayKey(new Date(Date.now() - 86_400_000));
      const newCount = current.lastSolved === yesterday ? current.count + 1 : 1;
      const xpGained = getXPForSolve(hintsUsed);
      const newXP = current.xp + xpGained;

      const newHistory: SolveRecord[] = [
        { date: today, puzzleNumber, hintsUsed, xpEarned: xpGained },
        ...(current.history ?? []),
      ];

      const next: StreakData = {
        count: newCount,
        lastSolved: today,
        totalSolved: current.totalSolved + 1,
        xp: newXP,
        level: getLevelFromXP(newXP, newHistory),
        bestStreak: Math.max(current.bestStreak, newCount),
        history: newHistory,
      };

      commit(next);

      if (userId && puzzleId) {
        // Build YYYY-MM-DD from local time, not UTC, so a player in UTC+ who
        // solves at 11pm local isn't recorded against the following day and
        // does not break their own streak.
        const d = new Date();
        const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate()
        ).padStart(2, '0')}`;

        callRecordSolve(userId, {
          clueId: puzzleId,
          puzzleNumber,
          hintsUsed,
          wrongAttempts,
          xpEarned: xpGained,
          solveTimeSeconds,
          clientDate: localDate,
        }).catch(err => console.warn('[streak] solve sync failed:', err));
      }

      return next;
    },
    []
  );

  return { ...data, recordSolve, refresh: reloadStreakData };
}
