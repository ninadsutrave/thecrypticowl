import type { PuzzleHintCard, CluePartSegment } from './types';
import type { ClueWordplayType } from '../../../lib/supabase';
// ─── ACTIVE PUZZLE TYPE ───────────────────────────────────────────────────────

export interface ActivePuzzle {
  id?: string;
  number: number;
  clue: string;
  answer: string;
  letterCount: number;
  hints: PuzzleHintCard[];
  clueParts: CluePartSegment[];
  /** Wordplay mechanism, so the UI can react to the clue actually on screen. */
  type?: ClueWordplayType;
  date?: string;
  /**
   * True only for the built-in clue shown when the network fetch fails and
   * nothing is cached. It has no database row, so a "solve" of it can never be
   * recorded — awarding XP or a streak day for it silently desynchronises
   * local progress from the server's copy forever.
   */
  isFallback?: boolean;
  author?: string | null;
  authorSocial?: string | null;
  authorProfile?: {
    name: string;
    social_link: string | null;
    avatar_url: string | null;
  } | null;
}
