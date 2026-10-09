import { describe, expect, it } from 'vitest';
import { calendarWeeks, computeHistoryStats } from './historyStats';
import type { PlayRecord } from './solveRecords';

const play = (date: string, extra: Partial<PlayRecord> = {}): PlayRecord => ({
  game: 'sudoku',
  date,
  seconds: 300,
  outcome: 'solved',
  hints: 0,
  mistakes: 0,
  completedAt: `${date}T10:00:00Z`,
  ...extra,
});

describe('computeHistoryStats', () => {
  it('counts days, finishes, time and hints', () => {
    const s = computeHistoryStats(
      [
        play('2026-10-08', { hints: 2 }),
        play('2026-10-08', { game: 'chess', outcome: 'failed', seconds: 100 }),
        play('2026-10-09', { hints: 1 }),
      ],
      '2026-10-09'
    );
    expect(s.daysPlayed).toBe(2);
    expect(s.finished).toBe(3);
    expect(s.solved).toBe(2);
    expect(s.totalSeconds).toBe(700);
    expect(s.hints).toBe(3);
  });

  it('keeps best and average times to solved puzzles only', () => {
    const s = computeHistoryStats([
      play('2026-10-07', { seconds: 400 }),
      play('2026-10-08', { seconds: 200 }),
      play('2026-10-09', { seconds: 5, outcome: 'revealed' }),
    ]);
    expect(s.perGame.sudoku).toMatchObject({
      played: 3,
      solved: 2,
      bestSeconds: 200,
      avgSeconds: 300,
    });
  });

  it('keeps a streak alive through yesterday, and breaks it on a gap', () => {
    const plays = [play('2026-10-03'), play('2026-10-06'), play('2026-10-07'), play('2026-10-08')];
    expect(computeHistoryStats(plays, '2026-10-09').currentStreak).toBe(3);
    expect(computeHistoryStats(plays, '2026-10-10').currentStreak).toBe(0);
    expect(computeHistoryStats(plays, '2026-10-09').bestStreak).toBe(3);
  });

  it('counts a streak across a month boundary', () => {
    const plays = [play('2026-09-30'), play('2026-10-01')];
    expect(computeHistoryStats(plays, '2026-10-01').currentStreak).toBe(2);
  });
});

describe('calendarWeeks', () => {
  it('ends on the current week, Monday first, with future days empty', () => {
    // 2026-10-09 is a Friday.
    const weeks = calendarWeeks(2, '2026-10-09');
    expect(weeks).toHaveLength(2);
    expect(weeks[1][0]).toBe('2026-10-05');
    expect(weeks[1][4]).toBe('2026-10-09');
    expect(weeks[1][5]).toBeNull();
    expect(weeks[0][0]).toBe('2026-09-28');
  });
});
