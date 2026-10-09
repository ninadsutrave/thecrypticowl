export interface TriviaPuzzle {
  category: string;
  /** A short story ending in one direct question; answered in free text. */
  question: string;
  answer: string;
  /** Every spelling that counts as correct (matched forgivingly). */
  accepted: string[];
  /** Shown once the puzzle ends: one more detail about the answer. */
  fact: string;
  source: { label: string; url: string };
}

/**
 * Practice question, shown when today's generated one is unavailable.
 * Every fact is from the linked Wikipedia article.
 */
export const SAMPLE_TRIVIA: TriviaPuzzle = {
  category: 'Brands & products',
  question:
    'In 1982 an American engineer who had worked on NASA’s Galileo mission to Jupiter was tinkering at home with a heat pump that used water instead of chemical refrigerants. When he tested a homemade nozzle in his bathroom, a powerful jet of water shot right across the room. Realising he had made something more fun than a heat pump, he spent years refining it before a toy company took it on. Launched in 1990 as the Power Drencher, it was renamed a year later. Name it.',
  answer: 'Super Soaker',
  accepted: ['Super Soaker', 'Supersoaker'],
  fact: 'Its inventor, Lonnie Johnson, holds more than 100 patents, and the toy has sold over a billion dollars’ worth.',
  source: {
    label: 'Super Soaker on Wikipedia',
    url: 'https://en.wikipedia.org/wiki/Super_Soaker',
  },
};
