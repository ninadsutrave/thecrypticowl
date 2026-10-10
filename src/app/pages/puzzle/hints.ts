import type { DbDailyPuzzle, PuzzleHint, ClueWordplayType } from '../../../lib/supabase';
import type { PuzzleHintCard } from './types';
import { FALLBACK_HINTS, FALLBACK_CLUE_PARTS } from './types';
import type { ActivePuzzle } from './ActivePuzzle';
// ─── HINT BUILDER ────────────────────────────────────────────────────────────

/** Fixed colour scheme per hint slot (1→blue, 2→purple, 3→orange, 4→green). */
export const HINT_STYLES = [
  { color: '#3B82F6', bg: '#EFF6FF', bgDark: '#0D1F35', border: '#93C5FD' },
  { color: '#7C3AED', bg: '#F5F3FF', bgDark: '#1D1B26', border: '#C4B5FD' },
  { color: '#F97316', bg: '#FFF7ED', bgDark: '#2A1505', border: '#FED7AA' },
  { color: '#059669', bg: '#ECFDF5', bgDark: '#062010', border: '#6EE7B7' },
] as const;

/** Human-readable descriptions for each wordplay mechanism (Hint 4). */
export const MECHANISM_DESCRIPTIONS: Record<string, string> = {
  anagram:
    'This is an anagram clue — the letters of the fodder are rearranged to spell the answer.',
  reversal: 'This is a reversal clue — a word or phrase is read backwards to give the answer.',
  container: 'This is a container clue — one word is placed inside another to form the answer.',
  hidden:
    'This is a hidden word clue — the answer is literally spelled out consecutively inside the clue.',
  deletion:
    'This is a deletion clue — removing one or more letters from a word produces the answer.',
  initial_letters:
    'This is an initial-letters clue — the first letter of each consecutive word in the fodder spells the answer.',
  final_letters:
    'This is a final-letters clue — the last letter of each consecutive word in the fodder spells the answer.',
  alternating_letters:
    'This is an alternating-letters clue — every other letter (odds or evens) of the fodder spells the answer.',
  spoonerism:
    'This is a spoonerism — swapping the initial sounds of two words produces the answer (in the style of Reverend Spooner).',
  charade:
    'This is a charade clue — two or more parts are assembled consecutively to spell the answer.',
  homophone: 'This is a homophone clue — the answer sounds like another word or phrase.',
  double_definition:
    'This is a double definition clue — two separate meanings both independently define the same answer.',
  cryptic_definition:
    'This is a cryptic definition — a single cleverly phrased definition that misdirects before revealing the answer.',
  andlit:
    'This is an &lit clue — the entire clue simultaneously serves as both definition and wordplay.',
  compound:
    'This is a compound clue — two or more cryptic mechanisms are combined to arrive at the answer.',
};

/** Mascot quips per hint slot. */
export const HINT_MASCOT_COMMENTS = [
  'The definition is always at the start or end of a cryptic clue. Found it? 👀',
  'The indicator tells you what trick to apply — look for the signal word! 🔍',
  'Now you have the raw material — apply the mechanism to it! ✨',
  "You've got all the pieces now — put it together! 🎯",
];

/**
 * Build the 4 progressive hints from normalised clue_components data.
 * Falls back to the legacy PuzzleHint[] JSONB if no components are present.
 *
 * Hint slot meanings:
 *   1 → definition (what the answer means)
 *   2 → indicator / second-definition for double_def
 *   3 → fodder (the raw wordplay material)
 *   4 → mechanism description
 */
/**
 * What to look for, per mechanism, WITHOUT naming the fodder. Mirrors
 * FODDER_HINT_TEXT in lambda/games/cryptic/builder/hintBuilder.js so both hint paths
 * teach the same thing.
 */
const FODDER_GUIDANCE: Record<string, string> = {
  anagram:
    'A word or phrase in the clue has the same letters as the answer, just scrambled. Can you spot it?',
  reversal:
    'One word in the clue, read backwards, gives the answer. Look near the reversal indicator.',
  container: 'One part of the clue fits inside another to spell the answer.',
  hidden:
    'The answer is spelled out consecutively, hidden across the words of the clue. Read the letters carefully.',
  deletion:
    'Remove certain letters from a word in the clue to get the answer — the first, the last, or something inside.',
  initial_letters:
    'Take the FIRST letter of each consecutive word in part of the clue — they spell the answer.',
  final_letters:
    'Take the LAST letter of each consecutive word in part of the clue — they spell the answer.',
  alternating_letters:
    'Take every OTHER letter (odd or even positions) from a word or phrase — they spell the answer.',
  spoonerism: 'Swap the initial sounds of two words in the clue, as Reverend Spooner would.',
  charade:
    'Two or more parts of the clue join in sequence to spell the answer. Try splitting at a natural boundary.',
  homophone: 'The answer sounds like another word or phrase in the clue.',
  compound:
    'This clue combines two different mechanisms. Work out where each part begins and ends.',
};

export function buildHintsFromComponents(
  components: DbDailyPuzzle['clue_components'],
  primaryType: ClueWordplayType,
  storedHints: PuzzleHint[],
  clueText = ''
): PuzzleHintCard[] {
  /** Is `definition` the opening of the clue rather than its tail? */
  const defAtStart = (definition?: string) => {
    if (!definition) return true;
    const norm = (v: string) =>
      v
        .toLowerCase()
        .replace(/[^a-z\s]/g, '')
        .trim();
    return norm(clueText).startsWith(norm(definition));
  };

  // `clues.hints` is the canonical progression, written by the generator's own
  // hint builder, which deliberately withholds the fodder at hint 3 — "never
  // reveal the actual fodder, that hands over the near-answer".
  //
  // This used to be the *last* resort, reached only when clue_components was
  // empty. Since the generator always writes components, the canonical
  // progression never ran and every solver got the component-derived hints
  // below, which name the fodder outright. Two hints in, the puzzle was over.
  // Preferring the stored hints restores the intended difficulty curve.
  if (storedHints.length > 0) {
    return storedHints.map(h => ({
      id: h.id,
      title: h.title,
      text: h.text,
      highlight: h.highlight ?? null,
      mascotComment: h.mascot_comment,
      color: h.color,
      bg: h.bg,
      bgDark: h.bg_dark,
      border: h.border,
    }));
  }

  // No stored progression (a human-authored clue approved through
  // approve_clue_submission, which does not populate hints). Derive what we
  // can from the normalised breakdown, following the same anti-spoiler rule.
  if (!components || components.length === 0) {
    return [
      {
        id: 1,
        title: 'Definition',
        text: 'The definition is at the very start or end of the clue.',
        highlight: null,
        mascotComment: HINT_MASCOT_COMMENTS[0],
        ...HINT_STYLES[0],
      },
      {
        id: 2,
        title: 'Indicator',
        text: 'Look for a word that signals the cryptic trick (e.g. "mixed", "back", "hidden in").',
        highlight: null,
        mascotComment: HINT_MASCOT_COMMENTS[1],
        ...HINT_STYLES[1],
      },
      {
        id: 3,
        title: 'Fodder',
        text: 'The wordplay material is somewhere in the clue — apply the mechanism to it.',
        highlight: null,
        mascotComment: HINT_MASCOT_COMMENTS[2],
        ...HINT_STYLES[2],
      },
      {
        id: 4,
        title: 'Mechanism',
        text:
          MECHANISM_DESCRIPTIONS[primaryType] ?? 'Apply the cryptic mechanism to find the answer.',
        highlight: null,
        mascotComment: HINT_MASCOT_COMMENTS[3],
        ...HINT_STYLES[3],
      },
    ];
  }

  const defs = components.filter(c => c.role === 'definition');
  const inds = components.filter(c => c.role === 'indicator');
  // Fodder-like roles the solver manipulates (container inner/outer count too).
  const fods = components.filter(
    c => c.role === 'fodder' || c.role === 'container_inner' || c.role === 'container_outer'
  );

  const def = defs[0];
  // For double_definition the model stores the 2nd definition in the indicator slot.
  const ind = inds[0];
  const fod = fods[0];

  const isDoubleDef = primaryType === 'double_definition';
  const isCrypticDef = primaryType === 'cryptic_definition';
  const isAndlit = primaryType === 'andlit';
  const noFodder = isDoubleDef || isCrypticDef || isAndlit;

  const prettyType = (t: string | null | undefined) => (t ? t.replace(/_/g, ' ') : null);

  const formatIndicatorList = (items: typeof inds) =>
    items
      .map(i => {
        const sub = prettyType(i.indicator_type);
        return sub ? `"${i.clue_text}" (${sub})` : `"${i.clue_text}"`;
      })
      .join(' and ');

  // ── Hint 1: Definition ─────────────────────────────────────────────────────
  let hint1Text: string;
  let hint1Highlight: string | null;

  if (isDoubleDef) {
    hint1Text =
      def && ind
        ? `This clue has two definitions: "${def.clue_text}" and "${ind.clue_text}". The answer satisfies both.`
        : def
          ? `One definition is: "${def.clue_text}". Find the second one at the other end of the clue.`
          : 'Both ends of this clue are plain definitions — the answer satisfies both simultaneously.';
    hint1Highlight = def?.clue_text ?? null;
  } else if (isCrypticDef || isAndlit) {
    hint1Text = def
      ? `The entire clue is a cleverly worded definition: "${def.clue_text}". Think laterally!`
      : 'The whole clue is a single, cleverly phrased definition — there is no separate wordplay section.';
    hint1Highlight = def?.clue_text ?? null;
  } else {
    // Tell the solver WHICH end to look at and let the highlight mark it,
    // rather than restating the definition as plain text.
    const atStart = defAtStart(def?.clue_text);
    hint1Text = def
      ? `The definition is at the ${atStart ? 'start' : 'end'} of the clue.`
      : 'Look at the very start or end of the clue — one of them is a plain definition of the answer.';
    hint1Highlight = def?.clue_text ?? null;
  }

  // ── Hint 2: Indicator(s) ───────────────────────────────────────────────────
  let hint2Text: string;
  let hint2Highlight: string | null;

  if (isDoubleDef) {
    hint2Text =
      'There is no indicator word in this clue — both halves are plain definitions. Look for the boundary between them.';
    hint2Highlight = null;
  } else if (isCrypticDef || isAndlit) {
    hint2Text =
      'There is no separate indicator — the wordplay and definition are one and the same. Re-read the clue from a different angle.';
    hint2Highlight = null;
  } else if (inds.length >= 2) {
    hint2Text = `This clue has multiple indicators: ${formatIndicatorList(inds)}. Each one signals a different trick — apply them in the order they appear.`;
    hint2Highlight = ind.clue_text;
  } else if (ind) {
    const sub = prettyType(ind.indicator_type);
    hint2Text = sub
      ? `"${ind.clue_text}" is the indicator (a ${sub} indicator) — it signals which wordplay trick to apply.`
      : `"${ind.clue_text}" is the indicator — it tells you which wordplay trick to apply.`;
    hint2Highlight = ind.clue_text;
  } else {
    hint2Text =
      'Look for a signal word or phrase that tells you the cryptic trick (e.g. "mixed up", "back", "hidden in", "sounds like").';
    hint2Highlight = null;
  }

  // ── Hint 3: Fodder(s) ──────────────────────────────────────────────────────
  let hint3Text: string;
  let hint3Highlight: string | null;

  if (noFodder) {
    hint3Text = isDoubleDef
      ? 'Double definitions have no fodder. The trick is that both parts of the clue, read separately, define the same word.'
      : 'This clue type has no separate fodder — the cleverness is all in the phrasing.';
    hint3Highlight = null;
  } else if (fods.length >= 2) {
    // Say how many pieces there are and what to do with them — not which
    // words they are. Naming the fodder is handing over the near-answer.
    hint3Text =
      `The wordplay uses ${fods.length} separate pieces of material. Apply each indicator ` +
      `to its own piece, then combine the results.`;
    hint3Highlight = null;
  } else if (fod) {
    hint3Text =
      FODDER_GUIDANCE[primaryType] ??
      'One part of the clue is the raw material — apply the mechanism to it.';
    hint3Highlight = null;
  } else {
    hint3Text =
      'The wordplay material is somewhere in the clue — it may appear as a word, phrase, or synonym.';
    hint3Highlight = null;
  }

  // ── Hint 4: Mechanism(s) ───────────────────────────────────────────────────
  let hint4Text =
    MECHANISM_DESCRIPTIONS[primaryType] ??
    'Apply the cryptic mechanism to the fodder to produce the answer.';

  // Compound clues benefit from a per-indicator sub-type roll-up.
  if (primaryType === 'compound') {
    const uniqueSubtypes = Array.from(
      new Set(inds.map(i => i.indicator_type).filter(Boolean) as string[])
    );
    if (uniqueSubtypes.length >= 2) {
      hint4Text += ` Tricks at play: ${uniqueSubtypes.map(s => s.replace(/_/g, ' ')).join(' + ')}.`;
    }
  }

  return [
    {
      id: 1,
      title: 'Find the Definition',
      text: hint1Text,
      highlight: hint1Highlight,
      mascotComment: HINT_MASCOT_COMMENTS[0],
      ...HINT_STYLES[0],
    },
    {
      id: 2,
      title: 'Spot the Indicator',
      text: hint2Text,
      highlight: hint2Highlight,
      mascotComment: HINT_MASCOT_COMMENTS[1],
      ...HINT_STYLES[1],
    },
    {
      id: 3,
      title: 'Find the Fodder',
      text: hint3Text,
      highlight: hint3Highlight,
      mascotComment: HINT_MASCOT_COMMENTS[2],
      ...HINT_STYLES[2],
    },
    {
      id: 4,
      title: 'Mechanism Type',
      text: hint4Text,
      highlight: null,
      mascotComment: HINT_MASCOT_COMMENTS[3],
      ...HINT_STYLES[3],
    },
  ];
}

export function mapDbPuzzle(p: DbDailyPuzzle): ActivePuzzle {
  return {
    id: p.id,
    number: p.number,
    clue: p.clue_text,
    answer: p.answer,
    type: p.primary_type,
    letterCount: p.answer_length,
    hints: buildHintsFromComponents(p.clue_components, p.primary_type, p.hints ?? [], p.clue_text),
    clueParts: (p.clue_parts ?? []).map(cp => ({ text: cp.text, type: cp.type as string | null })),
    date: p.date,
    author: p.author,
    authorSocial: p.author_social,
    authorProfile: p.author_profile,
  };
}

// Shown when the DB has no puzzle for today — so users always land on a playable clue.
export const DEFAULT_PUZZLE: ActivePuzzle = {
  isFallback: true,
  type: 'anagram',
  number: 42,
  clue: 'Pears mixed up to form a weapon (5)',
  answer: 'SPEAR',
  letterCount: 5,
  hints: FALLBACK_HINTS,
  clueParts: FALLBACK_CLUE_PARTS,
};
