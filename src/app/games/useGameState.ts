import { useEffect, useState } from 'react';
import type { PlayApi } from './GameShell';
import { readProgress, writeProgress } from './solveRecords';

/**
 * `useState` that survives a reload while today's puzzle is unfinished.
 *
 * Each game keeps its board in a handful of these, so closing the tab
 * mid-solve picks up where it left off — matching the clock, which also
 * resumes. Replays (no `progressSlot`) and finished puzzles never write.
 * Values must be JSON-serialisable: use arrays, not Sets or Maps.
 */
export function useGameState<T>(api: PlayApi, field: string, initial: T | (() => T)) {
  const slot = api.progressSlot;
  const [value, setValue] = useState<T>(() => {
    if (slot) {
      const saved = readProgress(slot)[field];
      if (saved !== undefined) return saved as T;
    }
    return typeof initial === 'function' ? (initial as () => T)() : initial;
  });

  useEffect(() => {
    if (slot && !api.finished) writeProgress(slot, field, value);
  }, [slot, field, value, api.finished]);

  return [value, setValue] as const;
}
