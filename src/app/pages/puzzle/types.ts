/**
 * Shared types and static data for the puzzle page.
 *
 * FALLBACK_* is the built-in clue shown only when the network fetch fails AND
 * nothing is cached. It is deliberately marked `isFallback` on the puzzle
 * object so the page can refuse to award XP or a streak day for it.
 */
// ─── PUZZLE TYPES ─────────────────────────────────────────────────────────────

/**
 * A progressive hint card as rendered on the frontend. camelCase field names
 * mirror the shape `buildHintsFromComponents` returns, which is distinct from
 * the snake_case `PuzzleHint` persisted as JSONB in the DB.
 */
export interface PuzzleHintCard {
  id: number;
  title: string;
  text: string;
  highlight: string | null;
  mascotComment: string;
  color: string;
  bg: string;
  bgDark: string;
  border: string;
}

/** One coloured segment of the clue, as rendered in the breakdown view. */
export interface CluePartSegment {
  text: string;
  type: string | null;
}

// ─── FALLBACK PUZZLE ──────────────────────────────────────────────────────────
// Shown when the DB has no puzzle for today's date, so users always see a
// playable clue rather than an empty state.
export const FALLBACK_HINTS: PuzzleHintCard[] = [
  {
    id: 1,
    title: 'Definition Location',
    text: 'The definition is at the end of the clue.',
    highlight: 'a weapon',
    mascotComment:
      'The definition is always at the start or end of a cryptic clue. Look at the end! 👀',
    color: '#3B82F6',
    bg: '#EFF6FF',
    bgDark: '#0D1F35',
    border: '#93C5FD',
  },
  {
    id: 2,
    title: 'Spot the Indicator',
    text: '"Mixed up" is an anagram indicator! That means some letters need to be rearranged.',
    highlight: 'mixed up',
    mascotComment: '"Mixed up" signals an anagram — letters are getting scrambled! 🔀',
    color: '#7C3AED',
    bg: '#F5F3FF',
    bgDark: '#1A0F35',
    border: '#C4B5FD',
  },
  {
    id: 3,
    title: 'Find the Fodder',
    // Same rule the generated hints follow: say what KIND of material to look
    // for, never which word it is. Naming it here hands over the near-answer
    // one hint early and flattens the difficulty curve.
    text: 'A word in the clue has the same letters as the answer, just scrambled. Can you spot it?',
    highlight: null,
    mascotComment: 'Find the letters, then shuffle them around! ✨',
    color: '#F97316',
    bg: '#FFF7ED',
    bgDark: '#2A1505',
    border: '#FED7AA',
  },
  {
    id: 4,
    title: 'Full Breakdown',
    text: 'Rearrange the fodder letters to get a 5-letter weapon. Think of something long and pointed, carried by a knight...',
    highlight: null,
    mascotComment: "You've got all the pieces now — put them together! 🎯",
    color: '#059669',
    bg: '#ECFDF5',
    bgDark: '#062010',
    border: '#6EE7B7',
  },
];

export const FALLBACK_CLUE_PARTS: CluePartSegment[] = [
  { text: 'Pears', type: 'fodder' },
  { text: ' mixed up ', type: 'indicator' },
  { text: 'to form ', type: null },
  { text: 'a weapon', type: 'definition' },
  { text: ' (5)', type: null },
];

export const PART_STYLES: Record<
  string,
  { bg: string; bgDark: string; color: string; border: string; label: string }
> = {
  definition: {
    bg: '#EFF6FF',
    bgDark: '#0D1F35',
    color: '#1D4ED8',
    border: '#3B82F6',
    label: 'Definition',
  },
  indicator: {
    bg: '#F5F3FF',
    bgDark: '#1A0F35',
    color: '#5B21B6',
    border: '#7C3AED',
    label: 'Indicator',
  },
  fodder: {
    bg: '#FFF7ED',
    bgDark: '#2A1505',
    color: '#C2410C',
    border: '#F97316',
    label: 'Fodder',
  },
  wordplay: {
    bg: '#ECFDF5',
    bgDark: '#062010',
    color: '#065F46',
    border: '#10B981',
    label: 'Wordplay',
  },
};
