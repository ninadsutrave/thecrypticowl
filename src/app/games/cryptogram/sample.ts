export interface CryptogramPuzzle {
  /** Plain text, upper case. Only A–Z are enciphered. */
  text: string;
  author: string;
  source: { label: string; url: string };
  /**
   * Cipher alphabet: `key[i]` stands for plain letter A+i. Never maps a
   * letter to itself.
   */
  key: string;
  /** Plain letters filled in at the start. Two keeps it at medium. */
  given: string[];
}

/**
 * Practice quote, shown when today's generated one is unavailable. Key and
 * the four given letters from the Lambda's own cipher (seed
 * "cryptogram-sample").
 */
export const SAMPLE_CRYPTOGRAM: CryptogramPuzzle = {
  text: 'IF YOU SHED TEARS WHEN YOU MISS THE SUN, YOU ALSO MISS THE STARS.',
  author: 'Rabindranath Tagore',
  source: { label: 'Stray Birds (1916)', url: 'https://www.gutenberg.org/ebooks/6524' },
  key: 'LPKMWGUFZHXQJSVACBTOYRDNIE',
  given: ['U', 'O', 'T', 'H'],
};
