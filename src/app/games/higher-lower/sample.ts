export type ValueFormat = 'count' | 'area' | 'metres' | 'kilometres' | 'year';

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
  /** The question every round asks, e.g. "Which film came out later?". */
  title: string;
  /** What the number is, e.g. "release year". */
  noun: string;
  /** Button words for up and down, e.g. "Later" / "Earlier". */
  higher: string;
  lower: string;
  format: ValueFormat;
  /** Eleven items: each round compares the next with the one before. */
  items: HigherLowerItem[];
}

/**
 * Practice puzzle, shown when today's generated one is unavailable. Built by
 * the Lambda's own generator from a Wikidata snapshot of famous films (seed
 * "higher-lower-sample"), so it follows the same rules as every daily one.
 */
export const SAMPLE_HIGHER_LOWER: HigherLowerPuzzle = {
  theme: 'film-year',
  title: 'Which film came out later?',
  noun: 'release year',
  higher: 'Later',
  lower: 'Earlier',
  format: 'year',
  items: [
    {
      id: 'Q190908',
      name: 'Seven',
      description: 'Film by David Fincher',
      value: 1995,
      url: 'https://www.wikidata.org/wiki/Q190908',
    },
    {
      id: 'Q174284',
      name: 'Raiders of the Lost Ark',
      description: 'Film directed by Steven Spielberg',
      value: 1981,
      url: 'https://www.wikidata.org/wiki/Q174284',
    },
    {
      id: 'Q5890',
      name: 'V for Vendetta',
      description: 'Film directed by James McTeigue',
      value: 2005,
      url: 'https://www.wikidata.org/wiki/Q5890',
    },
    {
      id: 'Q205028',
      name: 'Iron Man 2',
      description: 'Film directed by Jon Favreau',
      value: 2010,
      url: 'https://www.wikidata.org/wiki/Q205028',
    },
    {
      id: 'Q109331',
      name: 'Back to the Future Part II',
      description: 'Film by Robert Zemeckis',
      value: 1989,
      url: 'https://www.wikidata.org/wiki/Q109331',
    },
    {
      id: 'Q189505',
      name: 'Jaws',
      description: 'Film by Steven Spielberg',
      value: 1975,
      url: 'https://www.wikidata.org/wiki/Q189505',
    },
    {
      id: 'Q60072',
      name: 'The Sound of Music',
      description: 'Film by Robert Wise',
      value: 1965,
      url: 'https://www.wikidata.org/wiki/Q60072',
    },
    {
      id: 'Q39571',
      name: 'My Neighbor Totoro',
      description: 'Film directed by Hayao Miyazaki',
      value: 1988,
      url: 'https://www.wikidata.org/wiki/Q39571',
    },
    {
      id: 'Q103474',
      name: '2001: A Space Odyssey',
      description: 'Film by Stanley Kubrick',
      value: 1968,
      url: 'https://www.wikidata.org/wiki/Q103474',
    },
    {
      id: 'Q270470',
      name: 'Peter Pan',
      description: 'Animated fantasy-adventure film by Disney',
      value: 1953,
      url: 'https://www.wikidata.org/wiki/Q270470',
    },
    {
      id: 'Q184768',
      name: 'The Godfather Part II',
      description: 'Film by Francis Ford Coppola',
      value: 1974,
      url: 'https://www.wikidata.org/wiki/Q184768',
    },
  ],
};
