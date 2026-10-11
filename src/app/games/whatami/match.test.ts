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

  it('accepts the name without what kind of place or thing it is', () => {
    expect(isCorrectGuess('Ajanta', ['Ajanta Caves'])).toBe(true);
    expect(isCorrectGuess('ajanta cave', ['Ajanta Caves'])).toBe(true);
    expect(isCorrectGuess('Everest', ['Mount Everest'])).toBe(true);
    expect(isCorrectGuess('Infosys', ['Infosys Limited'])).toBe(true);
  });

  it('accepts saint / st / st. and other spellings of the same word', () => {
    const SPB = ['Saint Petersburg'];
    expect(isCorrectGuess('St Petersburg', SPB)).toBe(true);
    expect(isCorrectGuess('St. Petersburg', SPB)).toBe(true);
    expect(isCorrectGuess('Saint Petersburgh', SPB)).toBe(true);
    expect(isCorrectGuess('Mt Everest', ['Mount Everest'])).toBe(true);
    expect(isCorrectGuess('Kho-kho', ['Kho kho'])).toBe(true);
    expect(isCorrectGuess('khokho', ['Kho kho'])).toBe(true);
  });

  it('never shortens an answer to something too plain or too short', () => {
    expect(isCorrectGuess('Golden', ['Golden Temple'])).toBe(false);
    expect(isCorrectGuess('Red', ['Red Fort'])).toBe(false);
    expect(isCorrectGuess('India', ['India Gate'])).toBe(false);
    expect(isCorrectGuess('Caves', ['Ajanta Caves'])).toBe(false);
  });

  it('rejects an empty guess', () => {
    expect(isCorrectGuess('   ', ICELAND)).toBe(false);
  });
});
