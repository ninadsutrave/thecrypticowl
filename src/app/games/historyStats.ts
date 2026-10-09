import type { GameId } from './registry';
import { localDateKey, type PlayRecord } from './solveRecords';

export interface GameSummary {
  played: number;
  solved: number;
  bestSeconds: number | null;
  avgSeconds: number | null;
  hints: number;
}

export interface HistoryStats {
  daysPlayed: number;
  finished: number;
  solved: number;
  /** Consecutive days, ending today or yesterday, with at least one finish. */
  currentStreak: number;
  bestStreak: number;
  totalSeconds: number;
  hints: number;
  byDay: Map<string, PlayRecord[]>;
  perGame: Partial<Record<GameId, GameSummary>>;
}

function shiftDay(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return localDateKey(new Date(y, m - 1, d + days));
}

export function computeHistoryStats(plays: PlayRecord[], today = localDateKey()): HistoryStats {
  const byDay = new Map<string, PlayRecord[]>();
  const perGame: HistoryStats['perGame'] = {};
  const solvedTimes: Partial<Record<GameId, number[]>> = {};
  let totalSeconds = 0;
  let hints = 0;
  let solved = 0;

  for (const p of plays) {
    byDay.set(p.date, [...(byDay.get(p.date) ?? []), p]);
    totalSeconds += p.seconds;
    hints += p.hints;
    const g = (perGame[p.game] ??= {
      played: 0,
      solved: 0,
      bestSeconds: null,
      avgSeconds: null,
      hints: 0,
    });
    g.played++;
    g.hints += p.hints;
    if (p.outcome === 'solved') {
      solved++;
      g.solved++;
      (solvedTimes[p.game] ??= []).push(p.seconds);
    }
  }

  // Times only count when the puzzle was actually solved: a give-up after
  // ten seconds isn't a "best time".
  for (const [game, times] of Object.entries(solvedTimes) as [GameId, number[]][]) {
    const g = perGame[game]!;
    g.bestSeconds = Math.min(...times);
    g.avgSeconds = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  }

  // Streaks count days with any finish, solved or not: showing up is the habit.
  const days = [...byDay.keys()].sort();
  let bestStreak = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    run = prev && shiftDay(prev, 1) === d ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
    prev = d;
  }
  let currentStreak = 0;
  // Yesterday still counts: today's puzzles may simply not be done yet.
  let cursor = byDay.has(today) ? today : shiftDay(today, -1);
  while (byDay.has(cursor)) {
    currentStreak++;
    cursor = shiftDay(cursor, -1);
  }

  return {
    daysPlayed: byDay.size,
    finished: plays.length,
    solved,
    currentStreak,
    bestStreak,
    totalSeconds,
    hints,
    byDay,
    perGame,
  };
}

/**
 * Columns of 7 days (Monday first) ending with the week containing `today`,
 * for the calendar heatmap. Future days in the last week are null.
 */
export function calendarWeeks(weeks: number, today = localDateKey()): (string | null)[][] {
  const [y, m, d] = today.split('-').map(Number);
  const now = new Date(y, m - 1, d);
  const mondayOffset = (now.getDay() + 6) % 7;
  const start = new Date(y, m - 1, d - mondayOffset - (weeks - 1) * 7);
  const cols: (string | null)[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: (string | null)[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + i);
      const key = localDateKey(day);
      col.push(key > today ? null : key);
    }
    cols.push(col);
  }
  return cols;
}
