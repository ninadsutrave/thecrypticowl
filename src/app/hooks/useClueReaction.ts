import { useState, useEffect } from 'react';
import { StoreKeys, readJSON, writeJSON } from '../lib/localStore';
import { upsertClueReaction, deleteClueReaction } from '../../lib/supabase';

export type Reaction = 'like' | 'dislike' | null;

const STORAGE_KEY = StoreKeys.reactions;

function getStoredReactions(): Record<number, Reaction> {
  return readJSON<Record<number, Reaction>>(STORAGE_KEY, {});
}

function persistReaction(puzzleNumber: number, reaction: Reaction) {
  const all = getStoredReactions();
  if (reaction === null) {
    delete all[puzzleNumber];
  } else {
    all[puzzleNumber] = reaction;
  }
  writeJSON(STORAGE_KEY, all);
}

/**
 * Tracks a user's like/dislike on a given puzzle clue.
 * - Always writes to localStorage immediately (works without auth).
 * - If userId is provided, syncs to Supabase in the background.
 * - Clicking the active reaction again deselects it (toggle off).
 */
/**
 * puzzleNumber  — integer key used for localStorage (always available)
 * userId        — if provided, reactions are synced to Supabase
 * puzzleId      — UUID from the DB; required for Supabase writes.
 *                 Omit when using the local fallback puzzle (no UUID available).
 */
export function useClueReaction(puzzleNumber: number, userId?: string, puzzleId?: string) {
  const [reaction, setReaction] = useState<Reaction>(
    () => getStoredReactions()[puzzleNumber] ?? null
  );

  // Re-read when the puzzleNumber changes (user navigates from today's puzzle
  // to an archive puzzle). Without this, the state remains locked to the very
  // first puzzleNumber the hook was instantiated with.
  useEffect(() => {
    setReaction(getStoredReactions()[puzzleNumber] ?? null);
  }, [puzzleNumber]);

  // Cross-tab sync: if the user votes in another tab, mirror the change here.
  // The `storage` event fires for changes in *other* tabs only — this tab's
  // own writes won't re-trigger a render.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      setReaction(getStoredReactions()[puzzleNumber] ?? null);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [puzzleNumber]);

  /**
   * Applies the vote at once. When signed in it is also saved; if the save
   * fails the vote is rolled back, so the widget never claims a rating the
   * server didn't keep. Resolves false on a rollback.
   */
  const vote = async (r: 'like' | 'dislike'): Promise<boolean> => {
    const previous = reaction;
    const next: Reaction = reaction === r ? null : r;

    setReaction(next);
    persistReaction(puzzleNumber, next);

    if (!userId || !puzzleId) return true;
    try {
      if (next) await upsertClueReaction(userId, puzzleId, next);
      else await deleteClueReaction(userId, puzzleId);
      return true;
    } catch (err) {
      console.warn('[reaction] not saved, rolling back:', err);
      setReaction(previous);
      persistReaction(puzzleNumber, previous);
      return false;
    }
  };

  return { reaction, vote };
}
