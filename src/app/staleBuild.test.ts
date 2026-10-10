import { describe, expect, it } from 'vitest';
import { isChunkLoadError } from './staleBuild';

describe('isChunkLoadError', () => {
  it('recognises a missing chunk in every browser’s wording', () => {
    expect(
      isChunkLoadError(
        new TypeError(
          'Failed to fetch dynamically imported module: https://www.thecrypticowl.com/assets/Puzzle-dkLhnJn0.js'
        )
      )
    ).toBe(true);
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError(new Error('error loading dynamically imported module'))).toBe(true);
  });

  it('leaves other errors alone', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});
