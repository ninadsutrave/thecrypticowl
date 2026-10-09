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
 * Placeholder until the curated quote pool ships. Public domain: Benjamin
 * Franklin, Poor Richard's Almanack (1735).
 */
export const SAMPLE_CRYPTOGRAM: CryptogramPuzzle = {
  text: 'EARLY TO BED AND EARLY TO RISE, MAKES A MAN HEALTHY, WEALTHY, AND WISE.',
  author: 'Benjamin Franklin',
  source: {
    label: "Poor Richard's Almanack, 1735",
    url: 'https://en.wikipedia.org/wiki/Poor_Richard%27s_Almanack',
  },
  key: 'LEKFHORGBSWCUZJAVYIXMPTQND',
  given: ['W', 'K'],
};
