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
 * Practice set, shown when today's generated one is unavailable: four things
 * that happened on 15 August, Indian and world, well spread in time.
 */
export const SAMPLE_CHRONOLOGY: ChronologyPuzzle = {
  day: '15 August',
  // Shown in this order; none starts in its right place.
  events: [
    {
      id: 'independence',
      text: 'India becomes independent from British rule',
      year: 1947,
      url: 'https://en.wikipedia.org/wiki/Independence_Day_(India)',
    },
    {
      id: 'sholay',
      text: 'Sholay, starring Amitabh Bachchan and Dharmendra, opens in cinemas',
      year: 1975,
      url: 'https://en.wikipedia.org/wiki/Sholay',
    },
    {
      id: 'napoleon',
      text: 'Napoleon Bonaparte is born in Corsica',
      year: 1769,
      url: 'https://en.wikipedia.org/wiki/Napoleon',
    },
    {
      id: 'panama',
      text: 'The Panama Canal opens to shipping',
      year: 1914,
      url: 'https://en.wikipedia.org/wiki/Panama_Canal',
    },
  ],
};
