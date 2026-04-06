import { useState, useCallback } from 'react';

export interface SolveRecord {
  date: string;         // toDateString() format
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

function getStoredData(): StreakData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migrate older saves that don't have history
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
  const data = getStoredData();
  const today = new Date().toDateString();
  return data.lastSolved === today;
}

export function useStreak() {
  const [data, setData] = useState<StreakData>(getStoredData);

  const recordSolve = useCallback((hintsUsed: number, puzzleNumber: number = 0) => {
    const today = new Date().toDateString();
    const current = getStoredData();

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
    return newData;
  }, []);

  const refresh = useCallback(() => {
    setData(getStoredData());
  }, []);

  return { ...data, recordSolve, refresh };
}
