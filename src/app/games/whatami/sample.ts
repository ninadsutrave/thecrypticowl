export interface WhatAmIPuzzle {
  category: string;
  answer: string;
  /** Every spelling that should count as right, including `answer`. */
  accepted: string[];
  /** Hardest first. Each one is worth one point less than the last. */
  clues: [string, string, string, string, string];
  source: { label: string; url: string };
}

/** Placeholder until the daily generator ships. Facts checked against Wikipedia. */
export const SAMPLE_WHAT_AM_I: WhatAmIPuzzle = {
  category: 'Country',
  answer: 'Iceland',
  accepted: ['Iceland', 'Republic of Iceland'],
  clues: [
    'My language has changed so little that people can still read sagas written here around 800 years ago.',
    'My parliament was founded in 930 and is often called one of the oldest still running.',
    'I sit on the seam between the North American and Eurasian tectonic plates.',
    'In 2010 one of my volcanoes grounded flights right across Europe.',
    'I share my name with a British frozen-food supermarket chain.',
  ],
  source: { label: 'Iceland on Wikipedia', url: 'https://en.wikipedia.org/wiki/Iceland' },
};
