import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DbGamePlay } from '../../lib/supabase';

const remote: DbGamePlay[] = [];
const inserted: DbGamePlay[][] = [];

vi.mock('../../lib/supabase', () => ({
  fetchGamePlays: vi.fn(async () => remote),
  insertGamePlays: vi.fn(async (rows: DbGamePlay[]) => {
    inserted.push(rows);
    return true;
  }),
}));

const { recordPlay, syncPlayHistory, toRow } = await import('./playHistory');
const { getSolveRecord, localDateKey, saveSolveRecord } = await import('./solveRecords');

const row = (over: Partial<DbGamePlay>): DbGamePlay => ({
  user_id: 'u1',
  game: 'trivia',
  puzzle_date: localDateKey(),
  outcome: 'solved',
  seconds: 120,
  hints_used: 1,
  mistakes: 2,
  score: '8/10 correct',
  details: { correct: 8, total: 10 },
  completed_at: '2026-10-09T08:00:00Z',
  ...over,
});

beforeEach(() => {
  remote.length = 0;
  inserted.length = 0;
});

describe('recordPlay', () => {
  it('saves locally and, when signed in, uploads the play', () => {
    expect(
      recordPlay('chess', { seconds: 95, outcome: 'solved', hints: 1, mistakes: 0 }, 'u1')
    ).toBe(true);
    expect(getSolveRecord('chess')?.hints).toBe(1);
    expect(inserted[0][0]).toMatchObject({
      user_id: 'u1',
      game: 'chess',
      seconds: 95,
      hints_used: 1,
    });
  });

  it('records a replay neither locally nor remotely', () => {
    recordPlay('chess', { seconds: 95, outcome: 'solved', hints: 0, mistakes: 0 }, 'u1');
    inserted.length = 0;
    expect(
      recordPlay('chess', { seconds: 5, outcome: 'solved', hints: 0, mistakes: 0 }, 'u1')
    ).toBe(false);
    expect(inserted).toHaveLength(0);
    expect(getSolveRecord('chess')?.seconds).toBe(95);
  });

  it('stays local-only when signed out', () => {
    recordPlay('sudoku', { seconds: 300, outcome: 'solved', hints: 0, mistakes: 0 }, null);
    expect(inserted).toHaveLength(0);
    expect(getSolveRecord('sudoku')).not.toBeNull();
  });
});

describe('syncPlayHistory', () => {
  it('pulls server plays down and pushes only the local plays the server lacks', async () => {
    const today = localDateKey();
    remote.push(row({ game: 'trivia', puzzle_date: today }));
    saveSolveRecord(
      'cryptogram',
      { seconds: 200, outcome: 'solved', hints: 2, mistakes: 1 },
      today
    );

    await syncPlayHistory('u1');

    expect(getSolveRecord('trivia', today)).toMatchObject({ seconds: 120, hints: 1, mistakes: 2 });
    expect(inserted[0].map(r => r.game)).toEqual(['cryptogram']);
  });

  it('never overwrites a day already on the device', async () => {
    const today = localDateKey();
    saveSolveRecord('trivia', { seconds: 60, outcome: 'solved', hints: 0, mistakes: 0 }, today);
    remote.push(row({ game: 'trivia', puzzle_date: today, seconds: 999 }));
    await syncPlayHistory('u1');
    expect(getSolveRecord('trivia', today)?.seconds).toBe(60);
  });
});

describe('toRow', () => {
  it('clamps time into the range the table accepts', () => {
    const base = { game: 'sudoku' as const, date: '2026-10-09', outcome: 'solved' as const };
    const common = { hints: 0, mistakes: 0, completedAt: 'x' };
    expect(toRow('u', { ...base, ...common, seconds: 0 }).seconds).toBe(1);
    expect(toRow('u', { ...base, ...common, seconds: 999_999 }).seconds).toBe(86_399);
  });
});
