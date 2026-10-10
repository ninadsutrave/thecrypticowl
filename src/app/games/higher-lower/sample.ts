export type ValueFormat = 'count' | 'area' | 'metres' | 'kilometres';

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
 * the Lambda's own generator from a Wikidata snapshot of famous stadiums (seed
 * "higher-lower-sample"), so it follows the same rules as every daily one.
 */
export const SAMPLE_HIGHER_LOWER: HigherLowerPuzzle = {
  theme: 'stadium-capacity',
  title: 'Which stadium holds more people?',
  noun: 'capacity',
  higher: 'More',
  lower: 'Fewer',
  format: 'count',
  items: [
    {
      id: 'Q19520501',
      name: 'SoFi Stadium',
      description: 'Stadium in Inglewood, California',
      value: 70240,
      url: 'https://www.wikidata.org/wiki/Q19520501',
    },
    {
      id: 'Q33993',
      name: 'Ak Bars Arena',
      description: 'Football stadium in Kazan, Russia',
      value: 45105,
      url: 'https://www.wikidata.org/wiki/Q33993',
    },
    {
      id: 'Q150933',
      name: 'Volksparkstadion',
      description: 'Football stadium in Hamburg, Germany',
      value: 57000,
      url: 'https://www.wikidata.org/wiki/Q150933',
    },
    {
      id: 'Q133525',
      name: 'Beijing National Stadium',
      description: 'Stadium at Beijing, China',
      value: 80000,
      url: 'https://www.wikidata.org/wiki/Q133525',
    },
    {
      id: 'Q150961',
      name: 'Arena AufSchalke',
      description: 'Football stadium in Gelsenkirchen, North Rhine-Westphalia, Germany',
      value: 62271,
      url: 'https://www.wikidata.org/wiki/Q150961',
    },
    {
      id: 'Q4366184',
      name: 'Volgograd Arena',
      description: 'Stadium in Volgograd, Russia',
      value: 45568,
      url: 'https://www.wikidata.org/wiki/Q4366184',
    },
  ],
};
