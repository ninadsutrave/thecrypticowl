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
 * Hand-written in the house style, medium-hard as Indian subjects are;
 * facts from the Amul article.
 */
export const SAMPLE_TRIVIA: TriviaPuzzle = {
  category: 'Brands & products',
  question:
    'In 1946 dairy farmers in a district of Gujarat, tired of selling their milk cheaply to a single private dairy, set up a cooperative of their own on Sardar Patel’s advice. An engineer who had been posted to the town of Anand against his wishes stayed on to run it for decades. Its success became the model for a nationwide programme that transformed India’s milk supply. Its name comes from a Sanskrit word meaning “priceless”. Name the brand.',
  answer: 'Amul',
  accepted: ['Amul', 'Amul Dairy'],
  fact: 'Since 1966 its butter has been sold by the Amul girl, a little girl in a polka-dot dress whose billboards comment on the news.',
  source: { label: 'Amul on Wikipedia', url: 'https://en.wikipedia.org/wiki/Amul' },
};
