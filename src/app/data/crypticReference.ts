/**
 * Reference material for the Learn page's Indicators and Glossary tabs.
 * Standard British cryptic conventions: the usual signposts, not an
 * exhaustive list (setters invent new ones all the time).
 */

export interface IndicatorGroup {
  type: string;
  emoji: string;
  /** What the indicator tells you to do. */
  means: string;
  words: string[];
  example?: string;
}

export const INDICATORS: IndicatorGroup[] = [
  {
    type: 'Anagram',
    emoji: '🔀',
    means: 'Rearrange the letters of the fodder.',
    words: [
      'broken',
      'mixed',
      'wild',
      'crazy',
      'strange',
      'confused',
      'novel',
      'poor',
      'ruined',
      'odd',
      'upset',
      'scrambled',
      'shaken',
      'cooked',
      'reformed',
      'badly',
      'out',
      'dancing',
      'in a mess',
    ],
    example: 'Stone broken becomes musical sounds (5) → TONES',
  },
  {
    type: 'Hidden word',
    emoji: '🔎',
    means: 'The answer is spelled out inside the words of the clue.',
    words: [
      'in',
      'within',
      'inside',
      'some',
      'part of',
      'held by',
      'among',
      'partly',
      'concealed by',
      'buried in',
      'from',
    ],
    example: 'Some hot elixir in the inn (5) → HOTEL',
  },
  {
    type: 'Reversal',
    emoji: '↩️',
    means: 'Write the letters backwards.',
    words: [
      'back',
      'returned',
      'reversed',
      'over',
      'about',
      'going west',
      'retiring',
      'recalled',
      'reflected',
      'up (in a down clue)',
    ],
    example: 'Stop pots going back (4) → STOP',
  },
  {
    type: 'Container / insertion',
    emoji: '🫙',
    means: 'Put one piece inside another.',
    words: [
      'in',
      'into',
      'inside',
      'holding',
      'around',
      'about',
      'embracing',
      'outside',
      'without',
      'eating',
      'swallowing',
      'keeping',
      'nursing',
      'grabbing',
    ],
  },
  {
    type: 'Deletion',
    emoji: '✂️',
    means: 'Remove letters: the first, last, middle, or a named piece.',
    words: [
      'headless / beheaded (first letter)',
      'endless / curtailed (last letter)',
      'heartless (middle)',
      'losing',
      'leaving',
      'dropping',
      'without',
      'cut',
      'short',
    ],
  },
  {
    type: 'Homophone',
    emoji: '👂',
    means: 'The answer sounds like another word.',
    words: [
      'we hear',
      'they say',
      'reportedly',
      'on the radio',
      'sounds like',
      'aloud',
      'broadcast',
      'by the sound of it',
      'spoken',
      'audibly',
    ],
  },
  {
    type: 'Alternate letters',
    emoji: '🔢',
    means: 'Take every other letter.',
    words: ['oddly', 'evenly', 'regularly', 'alternately', 'every other', 'now and then'],
  },
  {
    type: 'First / last letters',
    emoji: '🅰️',
    means: 'Take the first (or last) letters of a run of words.',
    words: [
      'initially',
      'at first',
      'leaders',
      'heads of',
      'finally',
      'ultimately',
      'ends of',
      'tails',
      'lastly',
    ],
  },
  {
    type: 'Link words',
    emoji: '🔗',
    means: 'Join the definition to the wordplay; usually ignored.',
    words: [
      'gives',
      'makes',
      'for',
      'from',
      'is',
      'in',
      'becomes',
      'to produce',
      'leads to',
      'and',
    ],
  },
];

export interface GlossaryEntry {
  term: string;
  meaning: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: '&lit (all-in-one)',
    meaning: 'A clue where the whole clue is both the definition and the wordplay at once.',
  },
  { term: 'Acrostic', meaning: 'Wordplay that takes the first letters of consecutive words.' },
  {
    term: 'Alternation',
    meaning:
      'Wordplay that takes every other letter, signalled by words like "oddly" or "regularly".',
  },
  {
    term: 'Anagram',
    meaning: 'Wordplay that rearranges letters. The letters being rearranged are the fodder.',
  },
  {
    term: 'Anagrind',
    meaning: 'Slang for an anagram indicator: "broken", "wild", "confused" and so on.',
  },
  {
    term: 'Answer',
    meaning: 'The word or phrase the clue leads to; its length is the enumeration.',
  },
  {
    term: 'Charade',
    meaning:
      'Wordplay that builds the answer from pieces placed one after another, like CAR + PET = CARPET.',
  },
  {
    term: 'Container',
    meaning: 'Wordplay that puts one piece around another; the inner piece is the insertion.',
  },
  {
    term: 'Cryptic definition',
    meaning: 'A clue that is one misleading, punning definition with no separate wordplay.',
  },
  {
    term: 'Definition',
    meaning: 'The part of the clue that means the answer, always at the very start or very end.',
  },
  {
    term: 'Deletion',
    meaning: 'Wordplay that removes letters: a first, last or middle letter, or a named piece.',
  },
  {
    term: 'Double definition',
    meaning: 'A clue made of two definitions of the same word, side by side.',
  },
  {
    term: 'Enumeration',
    meaning: 'The numbers in brackets giving the answer’s length, e.g. (5) or (3,4) for two words.',
  },
  {
    term: 'Fodder',
    meaning: 'The letters wordplay works on: the word to be anagrammed, reversed, cut and so on.',
  },
  { term: 'Hidden word', meaning: 'An answer spelled out inside a run of words in the clue.' },
  { term: 'Homophone', meaning: 'Wordplay based on a word that sounds like another.' },
  { term: 'Indicator', meaning: 'A word that tells you which kind of wordplay to use.' },
  {
    term: 'Link word',
    meaning: 'A small connecting word between definition and wordplay, such as "gives" or "for".',
  },
  { term: 'Reversal', meaning: 'Wordplay that reads letters backwards.' },
  { term: 'Setter', meaning: 'Whoever writes the clue; the solver is whoever cracks it.' },
  {
    term: 'Surface reading',
    meaning: 'What the clue appears to say as an ordinary sentence: the misdirection.',
  },
  {
    term: 'Wordplay',
    meaning: 'The half of the clue that builds the answer a second way, from its parts.',
  },
];
