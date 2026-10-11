import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const callRecordSolve = vi.fn(async (..._args: unknown[]) => true);
const fetchUserStats = vi.fn(async () => null);
vi.mock('../../lib/supabase', () => ({
  callRecordSolve: (...a: unknown[]) => callRecordSolve(...(a as [])),
  fetchUserStats: (...a: unknown[]) => fetchUserStats(...(a as [])),
}));

const auth = {
  current: { user: null as null | { id: string }, isSignedIn: false, loading: false },
};
vi.mock('../context/AuthContext', () => ({
  useAuth: () => auth.current,
}));

const {
  useStreak,
  getXPForSolve,
  getLevelFromXP,
  getXPToNextLevel,
  getLevelTitle,
  hasSolvedToday,
  reloadStreakData,
  todayKey,
} = await import('./useStreak');

beforeEach(() => {
  localStorage.clear();
  reloadStreakData();
  callRecordSolve.mockClear();
  fetchUserStats.mockClear();
  auth.current = { user: null, isSignedIn: false, loading: false };
});
afterEach(() => vi.useRealTimers());

describe('getXPForSolve', () => {
  it.each([
    [0, 100],
    [1, 75],
    [2, 50],
    [3, 25],
    [4, 10],
    [9, 10],
  ])('awards %i hints → %i XP', (hints, xp) => {
    expect(getXPForSolve(hints)).toBe(xp);
  });

  it('never exceeds the 100 XP ceiling record_solve enforces server-side', () => {
    for (let h = 0; h <= 10; h++) expect(getXPForSolve(h)).toBeLessThanOrEqual(100);
  });
});

describe('getLevelFromXP', () => {
  it('follows a square-root curve', () => {
    expect(getLevelFromXP(0)).toBe(1);
    expect(getLevelFromXP(50)).toBe(2);
    expect(getLevelFromXP(200)).toBe(3);
    expect(getLevelFromXP(450)).toBe(4);
  });

  it('applies a consistency penalty for long gaps between recent solves', () => {
    const history = [
      { date: 'Sun Sep 13 2026', puzzleNumber: 10, hintsUsed: 0, xpEarned: 100 },
      { date: 'Sun Aug 30 2026', puzzleNumber: 9, hintsUsed: 0, xpEarned: 100 },
    ];
    expect(getLevelFromXP(450, history)).toBeLessThan(getLevelFromXP(450));
  });

  it('never drops below level 1', () => {
    const history = Array.from({ length: 5 }, (_, i) => ({
      date: new Date(2020, 0, 1 + i * 90).toDateString(),
      puzzleNumber: i,
      hintsUsed: 0,
      xpEarned: 10,
    }));
    expect(getLevelFromXP(10, history)).toBeGreaterThanOrEqual(1);
  });
});

describe('getXPToNextLevel', () => {
  it('reports progress within the current band', () => {
    const p = getXPToNextLevel(75);
    expect(p.label).toBe('Level 2');
    expect(p.current).toBe(25);
    expect(p.needed).toBe(150);
  });
});

describe('getLevelTitle', () => {
  it.each([
    [1, 'Newbie'],
    [2, 'Apprentice'],
    [5, 'Puzzle Hunter'],
    [10, 'Wise Owl'],
    [15, 'Puzzle Expert'],
    [20, 'Grand Master'],
  ])('level %i is %s', (level, fragment) => {
    expect(getLevelTitle(level)).toContain(fragment);
  });
});

describe('useStreak', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useStreak());
    expect(result.current.count).toBe(0);
    expect(result.current.xp).toBe(0);
  });

  it('records a solve and awards XP', () => {
    const { result } = renderHook(() => useStreak());
    act(() => {
      result.current.recordSolve(0, 42);
    });
    expect(result.current.count).toBe(1);
    expect(result.current.xp).toBe(100);
    expect(result.current.totalSolved).toBe(1);
    expect(hasSolvedToday()).toBe(true);
  });

  it('is idempotent within a day — a second solve does not double-count', () => {
    const { result } = renderHook(() => useStreak());
    act(() => {
      result.current.recordSolve(0, 42);
    });
    act(() => {
      result.current.recordSolve(0, 43);
    });
    expect(result.current.totalSolved).toBe(1);
    expect(result.current.xp).toBe(100);
  });

  it('extends the streak when yesterday was solved', () => {
    const yesterday = todayKey(new Date(Date.now() - 86_400_000));
    localStorage.setItem(
      'tco-streak',
      JSON.stringify({
        count: 4,
        lastSolved: yesterday,
        totalSolved: 4,
        xp: 400,
        level: 3,
        bestStreak: 4,
        history: [],
      })
    );
    reloadStreakData();

    const { result } = renderHook(() => useStreak());
    act(() => {
      result.current.recordSolve(1, 5);
    });
    expect(result.current.count).toBe(5);
    expect(result.current.bestStreak).toBe(5);
  });

  it('resets the streak after a missed day', () => {
    const threeDaysAgo = todayKey(new Date(Date.now() - 3 * 86_400_000));
    localStorage.setItem(
      'tco-streak',
      JSON.stringify({
        count: 9,
        lastSolved: threeDaysAgo,
        totalSolved: 9,
        xp: 900,
        level: 4,
        bestStreak: 9,
        history: [],
      })
    );
    reloadStreakData();

    const { result } = renderHook(() => useStreak());
    act(() => {
      result.current.recordSolve(0, 10);
    });
    expect(result.current.count).toBe(1);
    // The personal best survives a broken streak.
    expect(result.current.bestStreak).toBe(9);
  });

  it('shares one snapshot across every consumer', () => {
    // The navbar's 🔥 counter and the success screen both call useStreak. With
    // per-hook useState they held separate copies, so recording a solve left
    // the navbar showing the old number until something remounted it.
    const navbar = renderHook(() => useStreak());
    const success = renderHook(() => useStreak());

    act(() => {
      success.result.current.recordSolve(0, 42);
    });

    expect(success.result.current.count).toBe(1);
    expect(navbar.result.current.count).toBe(1);
    expect(navbar.result.current.xp).toBe(100);
  });

  it('syncs to Supabase only when both a user and a clue UUID are present', () => {
    const { result } = renderHook(() => useStreak());

    act(() => {
      result.current.recordSolve(0, 42); // signed out — local only
    });
    expect(callRecordSolve).not.toHaveBeenCalled();

    act(() => {
      localStorage.clear();
      reloadStreakData();
    });

    act(() => {
      result.current.recordSolve(1, 43, 'user-1', 'clue-uuid', 2, 95);
    });
    expect(callRecordSolve).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        clueId: 'clue-uuid',
        puzzleNumber: 43,
        hintsUsed: 1,
        wrongAttempts: 2,
        xpEarned: 75,
        solveTimeSeconds: 95,
        clientDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      })
    );
  });

  it('sends a LOCAL calendar date, so a late-evening solve in UTC+ does not break the streak', () => {
    vi.useFakeTimers();
    // 23:30 on the 13th locally is already the 14th in UTC for UTC+ players.
    vi.setSystemTime(new Date(2026, 8, 13, 23, 30, 0));

    const { result } = renderHook(() => useStreak());
    act(() => {
      result.current.recordSolve(0, 1, 'u', 'c');
    });

    expect(callRecordSolve.mock.calls[0]?.[1]).toMatchObject({ clientDate: '2026-09-13' });
  });

  it('keeps local progress when the remote sync fails', async () => {
    callRecordSolve.mockRejectedValueOnce(new Error('offline'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() => useStreak());
    act(() => {
      result.current.recordSolve(0, 1, 'u', 'c');
    });

    expect(result.current.xp).toBe(100);
  });

  it('survives a corrupt stored payload', () => {
    localStorage.setItem('tco-streak', 'not json at all');
    reloadStreakData();
    const { result } = renderHook(() => useStreak());
    expect(result.current.count).toBe(0);
  });
});
