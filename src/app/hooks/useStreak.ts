import { useState, useCallback } from 'react';
import { callRecordSolve } from '../../lib/supabase';

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

const STORAGE_KEY = 'tco-streak';

/** Exported so AuthContext can read local data on sign-in for the sync. */
export function getStoredStreakData(): StreakData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { history: [], ...parsed };
    }
  } catch {
    /* localStorage unavailable */
  }
  return {
    count: 0,
    lastSolved: null,
    totalSolved: 0,
    xp: 0,
    level: 1,
    bestStreak: 0,
    history: [],
  };
}

function saveData(data: StreakData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* localStorage unavailable */
  }
}

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

  // Professional penalty: drop levels for significant gaps in solving
  // A gap of > 3 days between any two solves in the last 5 solves results in a penalty
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
  if (level >= 15) return 'Cryptic Expert 🎓';
  if (level >= 10) return 'Word Wizard 🧙';
  if (level >= 5) return 'Clue Hunter 🔎';
  if (level >= 2) return 'Apprentice Solver 📖';
  return 'Newbie Cryptician 🦉';
}

export function hasSolvedToday(): boolean {
  const data = getStoredStreakData();
  const today = new Date().toDateString();
  return data.lastSolved === today;
}

export function useStreak() {
  const [data, setData] = useState<StreakData>(getStoredStreakData);

  /**
   * Record a puzzle solve.
   * - Always writes to localStorage immediately (works offline / without auth).
   * - If userId is provided, fire-and-forget syncs to Supabase via record_solve() RPC.
   */
  const recordSolve = useCallback(
    (
      hintsUsed: number,
      puzzleNumber: number = 0,
      userId?: string,
      puzzleId?: string, // UUID from DB — required for Supabase write; omit for local-only
      wrongAttempts: number = 0,
      solveTimeSeconds?: number
    ) => {
      const today = new Date().toDateString();
      const current = getStoredStreakData();

      if (current.lastSolved === today) return current;

      const yesterday = new Date(Date.now() - 86400000).toDateString();
      const newCount = current.lastSolved === yesterday ? current.count + 1 : 1;
      const xpGained = getXPForSolve(hintsUsed);
      const newXP = current.xp + xpGained;

      const solveRecord: SolveRecord = {
        date: today,
        puzzleNumber,
        hintsUsed,
        xpEarned: xpGained,
      };

      const newHistory = [solveRecord, ...(current.history ?? [])];
      const newData: StreakData = {
        count: newCount,
        lastSolved: today,
        totalSolved: current.totalSolved + 1,
        xp: newXP,
        level: getLevelFromXP(newXP, newHistory),
        bestStreak: Math.max(current.bestStreak, newCount),
        history: newHistory,
      };

      saveData(newData);
      setData(newData);

      // Sync to Supabase in the background — never blocks the UI.
      // record_solve() atomically writes solve_history + updates user_stats in one
      // transaction, so no separate upsertUserStats call is needed here.
      // puzzleId (UUID) is required by the DB schema; skip if we only have a local
      // puzzle number (e.g. the hardcoded fallback puzzle used in local dev).
      if (userId && puzzleId) {
        callRecordSolve(userId, {
          clueId: puzzleId,
          puzzleNumber,
          hintsUsed,
          wrongAttempts,
          xpEarned: xpGained,
          solveTimeSeconds,
          // Send the client's local date so the DB streak logic isn't skewed by UTC offset
          clientDate: new Date().toISOString().split('T')[0],
        }).catch(console.error);
      }

      return newData;
    },
    []
  );

  const refresh = useCallback(() => {
    setData(getStoredStreakData());
  }, []);

  return { ...data, recordSolve, refresh };
}
