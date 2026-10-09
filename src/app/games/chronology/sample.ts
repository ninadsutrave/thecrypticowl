export interface ChronologyEvent {
  id: string;
  /** Phrased so the text never gives the year away. */
  text: string;
  year: number;
  url: string;
}

export interface ChronologyPuzzle {
  /** The calendar day every event shares, e.g. "9 October". */
  day: string;
  /** In the order first shown to the player — never already sorted. */
  events: ChronologyEvent[];
}

/**
 * Placeholder until the daily feed import ships. All six happened on
 * 9 October. Two close pairs (1874/1888, 1940/1962) keep it at medium.
 */
export const SAMPLE_CHRONOLOGY: ChronologyPuzzle = {
  day: '9 October',
  events: [
    {
      id: 'lennon',
      text: 'John Lennon is born in Liverpool',
      year: 1940,
      url: 'https://en.wikipedia.org/wiki/John_Lennon',
    },
    {
      id: 'upu',
      text: 'The Treaty of Bern founds what is now the Universal Postal Union',
      year: 1874,
      url: 'https://en.wikipedia.org/wiki/Universal_Postal_Union',
    },
    {
      id: 'uganda',
      text: 'Uganda becomes independent from the United Kingdom',
      year: 1962,
      url: 'https://en.wikipedia.org/wiki/Uganda',
    },
    {
      id: 'hangul',
      text: "King Sejong's new Korean alphabet, Hangul, is published",
      year: 1446,
      url: 'https://en.wikipedia.org/wiki/Hangul',
    },
    {
      id: 'monument',
      text: 'The Washington Monument opens to the public',
      year: 1888,
      url: 'https://en.wikipedia.org/wiki/Washington_Monument',
    },
    {
      id: 'yale',
      text: 'The Collegiate School, later Yale University, receives its charter',
      year: 1701,
      url: 'https://en.wikipedia.org/wiki/Yale_University',
    },
  ],
};
