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
 * Hand-written in the house style; facts from the Amul article.
 */
export const SAMPLE_TRIVIA: TriviaPuzzle = {
  category: 'Brands & products',
  question:
    'In 1946 dairy farmers in Gujarat’s Kaira district, tired of selling their milk cheaply to a single private dairy, formed a cooperative of their own on Sardar Patel’s advice. A young engineer posted to the town of Anand in 1949 stayed on to run it, and later led the programme that made India the world’s largest milk producer. Since 1966 its butter has been sold by a little girl in a polka-dot dress who comments on the news from billboards. Name the brand.',
  answer: 'Amul',
  accepted: ['Amul', 'Amul Dairy'],
  fact: 'The name comes from the Sanskrit amulya, “priceless”, and the engineer, Verghese Kurien, is remembered as the father of India’s White Revolution.',
  source: { label: 'Amul on Wikipedia', url: 'https://en.wikipedia.org/wiki/Amul' },
};
