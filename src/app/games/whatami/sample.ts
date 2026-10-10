export interface WhatAmIPuzzle {
  category: string;
  answer: string;
  /** Every spelling that should count as right, including `answer`. */
  accepted: string[];
  /** Hardest first. Each one is worth one point less than the last. */
  clues: [string, string, string, string, string];
  source: { label: string; url: string };
}

/** Practice riddle, shown when today's generated one is unavailable. */
export const SAMPLE_WHAT_AM_I: WhatAmIPuzzle = {
  category: 'Festival',
  answer: 'Holi',
  accepted: ['Holi', 'Holi festival', 'Phagwah'],
  clues: [
    'I arrive on the full moon of the Hindu month of Phalguna.',
    'The night before me, bonfires are lit to remember how Prahlad escaped Holika.',
    'In Barsana and Nandgaon, women playfully chase men with sticks during my celebrations.',
    'I mark the end of winter and the welcome of spring across India and Nepal.',
    'People celebrate me by throwing coloured powder and water at each other: I am the festival of colours.',
  ],
  source: { label: 'Holi on Wikipedia', url: 'https://en.wikipedia.org/wiki/Holi' },
};
