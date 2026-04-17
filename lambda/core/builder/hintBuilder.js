import { MECHANISM_DESCRIPTIONS } from '../../constants/clue.js';

// Per-hint colour tokens (matches the frontend Tailwind palette).
const HINT_STYLES = [
  { color: '#3B82F6', bg: '#EFF6FF', bg_dark: '#0D1F35', border: '#93C5FD' }, // 1 — blue
  { color: '#7C3AED', bg: '#F5F3FF', bg_dark: '#1A0F35', border: '#C4B5FD' }, // 2 — purple
  { color: '#F97316', bg: '#FFF7ED', bg_dark: '#2A1505', border: '#FED7AA' }, // 3 — orange
  { color: '#059669', bg: '#ECFDF5', bg_dark: '#062010', border: '#6EE7B7' }, // 4 — green
];

// Hint 3 text per mechanism — guides the solver toward what to look for
// WITHOUT revealing the specific fodder word (which would near-solve the puzzle).
const FODDER_HINT_TEXT = {
  anagram:
    'A word or phrase in the clue has the same letters as the answer, just scrambled. Can you spot the anagram?',
  reversal:
    'One word in the clue, when read backwards, gives the answer. Look for it near the reversal indicator.',
  container:
    'One part of the clue fits inside another to spell the answer. Look for a containment indicator like "in", "around", or "holding".',
  hidden:
    'The answer is spelled out consecutively, hidden across the words of the clue. Read the letters carefully.',
  deletion:
    'Remove certain letters from a word in the clue to get the answer. What needs to be dropped — the first letter, last letter, or something inside?',
  initial_letters:
    'Take the FIRST letter of each consecutive word in part of the clue — they spell the answer. Look for an indicator like "initially" or "leaders of".',
  final_letters:
    'Take the LAST letter of each consecutive word in part of the clue — they spell the answer. Look for an indicator like "ends of" or "ultimately".',
  alternating_letters:
    'Take every OTHER letter (odd or even positions) from a word or phrase — they spell the answer. Look for an indicator like "regularly" or "oddly".',
  spoonerism:
    'Swap the initial sounds of two words in the clue, as Reverend Spooner would. The result sounds like the answer.',
  charade:
    'Two or more parts of the clue join together in sequence to spell the answer. Try splitting the clue at a natural boundary.',
  homophone:
    'The answer sounds like another word or phrase in the clue. Listen carefully to what the sounds-like indicator is pointing at.',
  cryptic_definition:
    'The whole clue is a lateral, playful definition of the answer. Try reading it in a completely unexpected way.',
  andlit:
    'The entire clue works as both the definition and the wordplay simultaneously. Every word pulls double duty!',
  compound:
    'This clue combines two different wordplay mechanisms. Try to identify where each part begins and ends.',
  double_definition:
    'Find a single word that satisfies both definitions — one at each end of the clue.',
};

/**
 * Constructs the four progressive hint cards for the interactive UI.
 *
 * Hint 1 (blue)   — Definition location + highlight
 * Hint 2 (purple) — Indicator word (or first definition for double_definition)
 * Hint 3 (orange) — Mechanism-aware guidance (never reveals the fodder directly)
 * Hint 4 (green)  — Wordplay mechanism explained
 */
export function constructHints(lexical, clue) {
  const isDoubleDef = lexical.type === 'double_definition';

  let baseHints;

  if (isDoubleDef) {
    baseHints = [
      {
        id: 1,
        title: 'Two Definitions',
        text: 'This clue has two completely different definitions for the same answer — one at each end.',
        highlight: clue.definition,
        mascot_comment: 'Double definitions are sneaky! Two meanings, one word.',
      },
      {
        id: 2,
        title: 'First Definition',
        text: `The first definition is: "${clue.definition}". Find a word that fits this.`,
        highlight: clue.definition,
        mascot_comment: 'Start with one side first...',
      },
      {
        id: 3,
        title: 'Second Definition',
        text: `The second definition is: "${clue.indicator}". The same word must fit this too!`,
        highlight: clue.indicator,
        mascot_comment: 'Does your word fit both? Then you have it! 🎯',
      },
      {
        id: 4,
        title: 'Wordplay Type',
        text: 'This is a double definition clue — no indicator or fodder, just two completely different meanings of the same word.',
        mascot_comment: 'No tricks, just vocabulary. Can you see it now? 🦉',
      },
    ];
  } else {
    const defAtStart = clue.clue.toLowerCase().startsWith(clue.definition.toLowerCase());

    baseHints = [
      {
        id: 1,
        title: 'Definition Location',
        text: `The definition is at the ${defAtStart ? 'start' : 'end'} of the clue.`,
        highlight: clue.definition,
        mascot_comment: "Found the definition! It's always at one of the ends. 👀",
      },
      {
        id: 2,
        title: 'The Indicator',
        text: clue.indicator
          ? `"${clue.indicator}" is the indicator — it signals how the wordplay works.`
          : 'Look for a signal word that tells you what to do with the letters.',
        highlight: clue.indicator || null,
        mascot_comment: 'Indicators are like road signs — they tell you which way to go!',
      },
      {
        id: 3,
        title: 'The Wordplay Material',
        // Never reveal the actual fodder — that hands over the near-answer.
        // Instead, tell the solver what kind of thing to look for.
        text: FODDER_HINT_TEXT[lexical.type] || 'Look closely at the letters in the clue...',
        highlight: null,
        mascot_comment: "We've got the ingredients, now let's cook! 🍳",
      },
      {
        id: 4,
        title: 'Wordplay Type',
        text: `This is a ${lexical.type.replace(/_/g, ' ')} clue. ${
          MECHANISM_DESCRIPTIONS[lexical.type] || 'Parts are combined to form the answer.'
        }`,
        mascot_comment: 'The final piece of the puzzle! Can you see it now? 🦉',
      },
    ];
  }

  // Attach per-hint colour tokens.
  return baseHints.map((hint, i) => ({
    ...hint,
    ...HINT_STYLES[i % HINT_STYLES.length],
  }));
}
