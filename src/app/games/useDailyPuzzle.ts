import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { fetchGamePuzzle } from '../../lib/supabase';
import { StoreKeys, prunePuzzleCache, readJSON, writeJSON } from '../lib/localStore';
import type { GameId } from './registry';
import { localDateKey } from './solveRecords';
import { archiveDateFrom } from './archive';

export interface DailyPuzzle<T> {
  puzzle: T | null;
  /** True when the generated puzzle was unavailable and the sample is shown. */
  isPractice: boolean;
  loading: boolean;
}

/**
 * The day's generated puzzle for a game: today's for the player's local
 * date, or a past day's when the URL carries `?date=` (the archive).
 *
 * Paints instantly from the device cache when today's puzzle was fetched
 * before. Otherwise asks Supabase; on no row, a network failure or a payload
 * that fails `parse`, falls back to the built-in sample, flagged as practice
 * so it never counts as the day's solve.
 *
 * `parse` validates the untrusted JSON and returns null when it's unusable —
 * a malformed row must degrade to practice, not crash the board.
 */
export function useDailyPuzzle<T>(
  game: GameId,
  sample: T,
  parse: (raw: unknown) => T | null
): DailyPuzzle<T> {
  const [searchParams] = useSearchParams();
  const [today] = useState(localDateKey);
  const archiveDate = archiveDateFrom(searchParams, today);
  const date = archiveDate ?? today;
  const cacheKey = StoreKeys.gamePuzzle(date, game);
  const initial = (): DailyPuzzle<T> & { date: string } => {
    // Archive days are fetched fresh: the cache only keeps the last few days.
    const cached = archiveDate ? null : parse(readJSON<unknown>(cacheKey, null));
    return cached
      ? { date, puzzle: cached, isPractice: false, loading: false }
      : { date, puzzle: null, isPractice: false, loading: true };
  };
  const [state, setState] = useState(initial);
  // Another archive day opened on the same page: start over for it.
  const current = state.date === date ? state : initial();
  if (current !== state) setState(current);

  useEffect(() => {
    if (!current.loading) return;
    let cancelled = false;
    prunePuzzleCache();
    fetchGamePuzzle(game, date)
      .then(raw => {
        if (cancelled) return;
        const parsed = parse(raw);
        if (parsed) {
          if (!archiveDate) writeJSON(cacheKey, raw);
          setState({ date, puzzle: parsed, isPractice: false, loading: false });
        } else {
          setState({ date, puzzle: sample, isPractice: true, loading: false });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ date, puzzle: sample, isPractice: true, loading: false });
      });
    return () => {
      cancelled = true;
    };
    // `parse` and `sample` are module-level constants for every game.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, date, cacheKey, current.loading]);

  return { puzzle: current.puzzle, isPractice: current.isPractice, loading: current.loading };
}
