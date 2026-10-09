import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameId } from './registry';
import { clearInProgress, localDateKey, readInProgress, writeInProgress } from './solveRecords';

/** How often the in-progress clock is flushed to storage while running. */
const PERSIST_EVERY_MS = 5_000;

/**
 * The solve clock every game shares.
 *
 * It measures *active* time: the clock pauses while the tab is hidden, so
 * leaving a puzzle open overnight doesn't record a twelve-hour solve. With
 * `persist`, elapsed time survives a reload — refreshing is not a way to
 * reset a slow solve. Replays pass `persist: false` and start from zero.
 * `paused` holds the clock still — while a tutorial is open, for instance.
 */
export function useGameTimer(
  game: GameId,
  { persist = true, paused = false }: { persist?: boolean; paused?: boolean } = {}
) {
  // Fixed at mount: a puzzle started before midnight is still that day's.
  const [date] = useState(localDateKey);
  const accumulated = useRef(persist ? readInProgress(game, date) : 0);
  const runStart = useRef<number | null>(null);
  // Set once the puzzle is finished, so the unmount flush can't resurrect
  // the in-progress entry that `stop` just cleared.
  const finished = useRef(false);
  const [elapsedMs, setElapsedMs] = useState(accumulated.current);
  const [stopped, setStopped] = useState(false);

  const currentMs = useCallback(
    () => accumulated.current + (runStart.current === null ? 0 : Date.now() - runStart.current),
    []
  );

  useEffect(() => {
    if (stopped || paused) return;

    const flush = () => {
      if (persist && !finished.current) writeInProgress(game, date, currentMs());
    };
    const pause = () => {
      if (runStart.current !== null) {
        accumulated.current += Date.now() - runStart.current;
        runStart.current = null;
      }
      flush();
    };
    const resume = () => {
      if (runStart.current === null && document.visibilityState !== 'hidden') {
        runStart.current = Date.now();
      }
    };
    const onVisibility = () => (document.visibilityState === 'hidden' ? pause() : resume());

    resume();
    const tick = setInterval(() => setElapsedMs(currentMs()), 250);
    const save = setInterval(flush, PERSIST_EVERY_MS);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', pause);

    return () => {
      clearInterval(tick);
      clearInterval(save);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', pause);
      pause();
    };
  }, [stopped, paused, persist, game, date, currentMs]);

  /** Freeze the clock and return the solve time in whole seconds (min 1). */
  const stop = useCallback((): number => {
    const ms = currentMs();
    accumulated.current = ms;
    runStart.current = null;
    finished.current = true;
    if (persist) clearInProgress(game, date);
    setElapsedMs(ms);
    setStopped(true);
    return Math.max(1, Math.round(ms / 1000));
  }, [currentMs, persist, game, date]);

  return { seconds: Math.floor(elapsedMs / 1000), stopped, stop, date };
}
