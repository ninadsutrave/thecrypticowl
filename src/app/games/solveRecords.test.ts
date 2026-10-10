import { describe, expect, it } from 'vitest';
import {
  clearProgress,
  formatClock,
  getSolveRecord,
  localDateKey,
  progressKey,
  readInProgress,
  readProgress,
  saveSolveRecord,
  writeInProgress,
  writeProgress,
} from './solveRecords';

describe('localDateKey', () => {
  it('uses the local calendar date', () => {
    expect(localDateKey(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});

describe('saveSolveRecord', () => {
  it('keeps the first finish of the day and ignores replays', () => {
    expect(
      saveSolveRecord(
        'trivia',
        { seconds: 300, outcome: 'solved', hints: 0, mistakes: 0 },
        '2026-10-09'
      )
    ).toBe(true);
    expect(
      saveSolveRecord(
        'trivia',
        { seconds: 20, outcome: 'solved', hints: 0, mistakes: 0 },
        '2026-10-09'
      )
    ).toBe(false);
    expect(getSolveRecord('trivia', '2026-10-09')?.seconds).toBe(300);
  });

  it('keeps games apart', () => {
    saveSolveRecord(
      'chess',
      { seconds: 90, outcome: 'solved', hints: 1, mistakes: 2 },
      '2026-10-09'
    );
    expect(getSolveRecord('sudoku', '2026-10-09')).toBeNull();
  });
});

describe('in-progress clocks', () => {
  it('round-trips and drops other days', () => {
    writeInProgress('sudoku', '2026-10-08', 5000);
    writeInProgress('sudoku', '2026-10-09', 1234);
    expect(readInProgress('sudoku', '2026-10-09')).toBe(1234);
    expect(readInProgress('sudoku', '2026-10-08')).toBe(0);
  });
});

describe('in-progress board state', () => {
  it('stores fields per slot and clears them', () => {
    writeProgress('chess:2026-10-09', 'ply', 3);
    writeProgress('chess:2026-10-09', 'mistakes', 1);
    expect(readProgress('chess:2026-10-09')).toEqual({ ply: 3, mistakes: 1 });
    clearProgress('chess:2026-10-09');
    expect(readProgress('chess:2026-10-09')).toEqual({});
  });
});

describe('progressKey', () => {
  it('gives a different puzzle on the same day its own slot', () => {
    const a = progressKey('sudoku', '2026-10-09', 'puzzle-a');
    const b = progressKey('sudoku', '2026-10-09', 'puzzle-b');
    expect(a).not.toBe(b);
    writeProgress(a, 'values', [1]);
    expect(readProgress(b)).toEqual({});
    // Writing the new puzzle's state drops the old puzzle's.
    writeProgress(b, 'values', [2]);
    expect(readProgress(a)).toEqual({});
  });
});

describe('formatClock', () => {
  it('shows m:ss, and h:mm:ss past the hour', () => {
    expect(formatClock(65)).toBe('1:05');
    expect(formatClock(3725)).toBe('1:02:05');
  });
});

describe('currentStreak', () => {
  it('counts consecutive days with any finish, from today or yesterday', async () => {
    const { currentStreak } = await import('./solveRecords');
    localStorage.clear();
    const day = (n: number) => {
      const d = new Date(2026, 9, 10 - n);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const rec = { seconds: 60, outcome: 'solved', hints: 0, mistakes: 0, completedAt: '' };
    localStorage.setItem(
      'tco-solves',
      JSON.stringify({
        trivia: { [day(1)]: rec, [day(2)]: rec },
        sudoku: { [day(3)]: rec, [day(5)]: rec },
      })
    );
    expect(currentStreak(new Date(2026, 9, 10))).toBe(3); // today not played yet: 9, 8, 7 Oct
    expect(currentStreak(new Date(2026, 9, 12))).toBe(0);
  });
});
