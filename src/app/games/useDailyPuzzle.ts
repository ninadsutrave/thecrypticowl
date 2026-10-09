import { useEffect, useState } from 'react';
import { fetchGamePuzzle } from '../../lib/supabase';
import { StoreKeys, prunePuzzleCache, readJSON, writeJSON } from '../lib/localStore';
import type { GameId } from './registry';
import { localDateKey } from './solveRecords';

export interface DailyPuzzle<T> {
  puzzle: T | null;
  /** True when today's generated puzzle was unavailable and the sample is shown. */
  isPractice: boolean;
  loading: boolean;
}

/**
 * Today's generated puzzle for a game, for the player's local date.
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
  const [date] = useState(localDateKey);
  const cacheKey = StoreKeys.gamePuzzle(date, game);
  const [state, setState] = useState<DailyPuzzle<T>>(() => {
    const cached = parse(readJSON<unknown>(cacheKey, null));
    return cached
      ? { puzzle: cached, isPractice: false, loading: false }
      : { puzzle: null, isPractice: false, loading: true };
  });

  useEffect(() => {
    if (!state.loading) return;
    let cancelled = false;
    prunePuzzleCache();
    fetchGamePuzzle(game, date)
      .then(raw => {
        if (cancelled) return;
        const parsed = parse(raw);
        if (parsed) {
          writeJSON(cacheKey, raw);
          setState({ puzzle: parsed, isPractice: false, loading: false });
        } else {
          setState({ puzzle: sample, isPractice: true, loading: false });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ puzzle: sample, isPractice: true, loading: false });
      });
    return () => {
      cancelled = true;
    };
    // `parse` and `sample` are module-level constants for every game.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, date, cacheKey, state.loading]);

  return state;
}
