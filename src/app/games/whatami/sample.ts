export interface WhatAmIPuzzle {
  category: string;
  answer: string;
  /** Every spelling that should count as right, including `answer`. */
  accepted: string[];
  /** Hardest first. Each one is worth one point less than the last. */
  clues: [string, string, string, string, string];
  source: { label: string; url: string };
}

/**
 * Practice riddle, shown when today's generated one is unavailable. Indian,
 * so medium-hard: the first clues need real knowledge.
 */
export const SAMPLE_WHAT_AM_I: WhatAmIPuzzle = {
  category: 'Festival',
  answer: 'Holi',
  accepted: ['Holi', 'Holi festival', 'Phagwah'],
  clues: [
    'In the Caribbean, people of Indian descent celebrate me in spring under a different name.',
    'I fall on the full moon of the Hindu month of Phalguna.',
    'In Barsana, women playfully beat men with sticks as part of my celebrations.',
    'The night before me, bonfires recall how Prahlad survived the fire that consumed Holika.',
    'People throw coloured powder and water at each other: I am the festival of colours.',
  ],
  source: { label: 'Holi on Wikipedia', url: 'https://en.wikipedia.org/wiki/Holi' },
};
