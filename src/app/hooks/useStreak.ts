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
  } catch {}
  return { count: 0, lastSolved: null, totalSolved: 0, xp: 0, level: 1, bestStreak: 0, history: [] };
}

function saveData(data: StreakData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function getXPForSolve(hintsUsed: number): number {
  if (hintsUsed === 0) return 100;
  if (hintsUsed === 1) return 75;
  if (hintsUsed === 2) return 50;
  if (hintsUsed === 3) return 25;
  return 10;
}

export function getLevelFromXP(xp: number): number {
  return Math.floor(Math.sqrt(xp / 50)) + 1;
}

export function getXPToNextLevel(xp: number): { current: number; needed: number; label: string } {
  const level = getLevelFromXP(xp);
  const currentLevelXP = ((level - 1) ** 2) * 50;
  const nextLevelXP = (level ** 2) * 50;
  return {
    current: xp - currentLevelXP,
    needed: nextLevelXP - currentLevelXP,
    label: `Level ${level}`,
  };
}

export function getLevelTitle(level: number): string {
  if (level >= 10) return 'Grand Master 🏆';
  if (level >= 7) return 'Cryptic Expert 🎓';
  if (level >= 5) return 'Word Wizard 🧙';
  if (level >= 3) return 'Clue Hunter 🔎';
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
  const recordSolve = useCallback((
    hintsUsed: number,
    puzzleNumber: number = 0,
    userId?: string,
    puzzleId?: string,        // UUID from DB — required for Supabase write; omit for local-only
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

    const newData: StreakData = {
      count: newCount,
      lastSolved: today,
      totalSolved: current.totalSolved + 1,
      xp: newXP,
      level: getLevelFromXP(newXP),
      bestStreak: Math.max(current.bestStreak, newCount),
      history: [solveRecord, ...(current.history ?? [])],
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
        clueId:           puzzleId,
        puzzleNumber,
        hintsUsed,
        wrongAttempts,
        xpEarned:         xpGained,
        solveTimeSeconds,
      }).catch(console.error);
    }

    return newData;
  }, []);

  const refresh = useCallback(() => {
    setData(getStoredStreakData());
  }, []);

  return { ...data, recordSolve, refresh };
}
