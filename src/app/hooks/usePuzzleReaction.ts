import { useEffect, useState } from 'react';
import { StoreKeys, readJSON, writeJSON } from '../lib/localStore';
import { deletePuzzleReaction, upsertPuzzleReaction } from '../../lib/supabase';
import type { Reaction } from './useClueReaction';

const read = () => readJSON<Record<string, Reaction>>(StoreKeys.puzzleReactions, {});

function persist(key: string, reaction: Reaction) {
  const all = read();
  if (reaction) all[key] = reaction;
  else delete all[key];
  writeJSON(StoreKeys.puzzleReactions, all);
}

/**
 * A player's thumbs up/down on one game's puzzle, the same way the cryptic
 * clue's works: kept on this device at once, saved to their account when
 * signed in, and rolled back if that save fails. A practice puzzle (no
 * date) is remembered on the device only.
 */
export function usePuzzleReaction(game: string, date: string | null, userId?: string) {
  const key = `${game}:${date ?? 'practice'}`;
  const [reaction, setReaction] = useState<Reaction>(() => read()[key] ?? null);

  useEffect(() => setReaction(read()[key] ?? null), [key]);

  const vote = async (r: 'like' | 'dislike'): Promise<boolean> => {
    const previous = reaction;
    const next: Reaction = reaction === r ? null : r;
    setReaction(next);
    persist(key, next);
    if (!userId || !date) return true;
    try {
      if (next) await upsertPuzzleReaction(userId, game, date, next);
      else await deletePuzzleReaction(userId, game, date);
      return true;
    } catch (err) {
      console.warn('[reaction] not saved, rolling back:', err);
      setReaction(previous);
      persist(key, previous);
      return false;
    }
  };

  return { reaction, vote };
}
