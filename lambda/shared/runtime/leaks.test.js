import { describe, it, expect } from 'vitest';
import { findLeak } from './leaks.js';

describe('findLeak', () => {
  it('catches the answer, its distinctive words and their longer forms', () => {
    expect(findLeak('Built for the Exposition Universelle', ['Eiffel Tower'])).toBeNull();
    expect(findLeak('Gustave Eiffel designed it', ['Eiffel Tower'])).toBe('eiffel');
    expect(findLeak('Icelandic sagas', ['Iceland'])).toBe('iceland');
  });

  it('catches an alias used as a whole name', () => {
    expect(findLeak('Scan the Quick Response code', ['QR code', 'Quick Response code'])).toBe(
      'quick response code'
    );
  });

  it("doesn't count a single word of an alias", () => {
    expect(findLeak('Phones quickly join networks', ['QR code', 'Quick Response code'])).toBeNull();
  });
});
