import { useState } from 'react';
import { upsertClueReaction, deleteClueReaction } from '../../lib/supabase';

export type Reaction = 'like' | 'dislike' | null;

const STORAGE_KEY = 'tco-reactions';

function getStoredReactions(): Record<number, Reaction> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function persistReaction(puzzleNumber: number, reaction: Reaction) {
  const all = getStoredReactions();
  if (reaction === null) {
    delete all[puzzleNumber];
  } else {
    all[puzzleNumber] = reaction;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {}
}

/**
 * Tracks a user's like/dislike on a given puzzle clue.
 * - Always writes to localStorage immediately (works without auth).
 * - If userId is provided, syncs to Supabase in the background.
 * - Clicking the active reaction again deselects it (toggle off).
 */
export function useClueReaction(puzzleNumber: number, userId?: string) {
  const [reaction, setReaction] = useState<Reaction>(
    () => getStoredReactions()[puzzleNumber] ?? null
  );

  const vote = (r: 'like' | 'dislike') => {
    const next: Reaction = reaction === r ? null : r;

    setReaction(next);
    persistReaction(puzzleNumber, next);

    if (userId) {
      if (next) {
        upsertClueReaction(userId, puzzleNumber, next).catch(console.error);
      } else {
        deleteClueReaction(userId, puzzleNumber).catch(console.error);
      }
    }
  };

  return { reaction, vote };
}
