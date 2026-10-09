import { describe, expect, it } from 'vitest';
import { isCorrectGuess, normalizeGuess, typoDistance } from './match';

const ICELAND = ['Iceland', 'Republic of Iceland'];

describe('normalizeGuess', () => {
  it('ignores case, accents, punctuation and a leading "the"', () => {
    expect(normalizeGuess('  The   Ísland! ')).toBe('island');
    expect(normalizeGuess('Marks & Spencer')).toBe('marks and spencer');
  });
});

describe('typoDistance', () => {
  it('charges 1 for a dropped, extra or swapped letter', () => {
    expect(typoDistance('iceand', 'iceland')).toBe(1);
    expect(typoDistance('icelland', 'iceland')).toBe(1);
    expect(typoDistance('icelnad', 'iceland')).toBe(1);
  });

  it('charges 2 for a wrong letter', () => {
    expect(typoDistance('ireland', 'iceland')).toBe(2);
  });
});

describe('isCorrectGuess', () => {
  it('accepts the answer and its aliases however they are typed', () => {
    expect(isCorrectGuess('iceland', ICELAND)).toBe(true);
    expect(isCorrectGuess('ICELAND!', ICELAND)).toBe(true);
    expect(isCorrectGuess('republic of iceland', ICELAND)).toBe(true);
  });

  it('forgives a small slip on a longer answer', () => {
    expect(isCorrectGuess('Icelnad', ICELAND)).toBe(true);
    expect(isCorrectGuess('Iceand', ICELAND)).toBe(true);
  });

  it('never accepts a different real answer one letter away', () => {
    expect(isCorrectGuess('Ireland', ICELAND)).toBe(false);
    expect(isCorrectGuess('Iran', ['Iraq'])).toBe(false);
  });

  it('requires short answers to be exact', () => {
    expect(isCorrectGuess('Cba', ['Cuba'])).toBe(false);
  });

  it('rejects an empty guess', () => {
    expect(isCorrectGuess('   ', ICELAND)).toBe(false);
  });
});
