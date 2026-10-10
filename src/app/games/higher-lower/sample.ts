export type ValueFormat =
  | 'count'
  | 'area'
  | 'metres'
  | 'kilometres'
  /** US dollars: net worth, box office, revenue. */
  | 'usd'
  /** Indian rupees, shown in crore: Indian box office. */
  | 'inr'
  /** An age in years. */
  | 'years';

export interface HigherLowerItem {
  id: string;
  name: string;
  /** Wikidata's description, with anything that gives the answer away removed. */
  description: string;
  value: number;
  url: string;
}

export interface HigherLowerPuzzle {
  theme: string;
  /** The question every round asks, e.g. "Which stadium holds more people?". */
  title: string;
  /** What the number is, e.g. "capacity". */
  noun: string;
  /** Button words for up and down, e.g. "More" / "Fewer". */
  higher: string;
  lower: string;
  format: ValueFormat;
  /** Six items: each round compares the next with the one before. */
  items: HigherLowerItem[];
}

/**
 * Practice puzzle, shown when today's generated one is unavailable. Built by
 * the Lambda's own generator from Wikipedia's list of international cricket
 * centuries (seed "higher-lower-sample-8"), so it follows the same rules as
 * every daily one.
 */
export const SAMPLE_HIGHER_LOWER: HigherLowerPuzzle = {
  theme: 'cricket-centuries',
  title: 'Who has scored more international hundreds?',
  noun: 'international centuries',
  higher: 'More',
  lower: 'Fewer',
  format: 'count',
  items: [
    {
      id: 'Rohit Sharma',
      name: 'Rohit Sharma',
      description: 'Indian cricketer',
      value: 52,
      url: 'https://en.wikipedia.org/wiki/Rohit_Sharma',
    },
    {
      id: 'Virat Kohli',
      name: 'Virat Kohli',
      description: 'Indian cricketer',
      value: 86,
      url: 'https://en.wikipedia.org/wiki/Virat_Kohli',
    },
    {
      id: 'Adam Gilchrist',
      name: 'Adam Gilchrist',
      description: 'Australian cricketer',
      value: 33,
      url: 'https://en.wikipedia.org/wiki/Adam_Gilchrist',
    },
    {
      id: 'Steve Smith (cricketer)',
      name: 'Steve Smith',
      description: 'Australian cricketer',
      value: 49,
      url: 'https://en.wikipedia.org/wiki/Steve_Smith_(cricketer)',
    },
    {
      id: 'Joe Root',
      name: 'Joe Root',
      description: 'English cricketer',
      value: 61,
      url: 'https://en.wikipedia.org/wiki/Joe_Root',
    },
    {
      id: 'Don Bradman',
      name: 'Don Bradman',
      description: 'Australian cricketer',
      value: 29,
      url: 'https://en.wikipedia.org/wiki/Don_Bradman',
    },
  ],
};
