import { describe, expect, it } from 'vitest';
import { describePattern, triviaGrid } from './logic';
import { SAMPLE_TRIVIA } from './sample';
import { parseTrivia } from './parse';
import { isCorrectGuess } from '../whatami/match';

describe('describePattern', () => {
  it('reads the hint out in words', () => {
    expect(describePattern('Super Soaker')).toBe('Starts with S. 2 words: 5, 6 letters.');
    expect(describePattern('Ketchup')).toBe('Starts with K. 7 letters.');
  });
});

describe('triviaGrid', () => {
  it('shows each guess and the hint', () => {
    expect(triviaGrid(0, true, false, 3)).toBe('🧠 🟩⬜⬜');
    expect(triviaGrid(1, true, true, 3)).toBe('🧠 🟥🟩⬜ 💡');
    expect(triviaGrid(3, false, false, 3)).toBe('🧠 🟥🟥🟥');
    expect(triviaGrid(1, false, false, 3)).toBe('🧠 🟥⬜⬜');
  });
});

describe('the sample', () => {
  it('parses, and accepts its answer with a typo', () => {
    expect(parseTrivia(SAMPLE_TRIVIA)).not.toBeNull();
    expect(isCorrectGuess('amul diary', SAMPLE_TRIVIA.accepted)).toBe(true);
    expect(isCorrectGuess('mother dairy', SAMPLE_TRIVIA.accepted)).toBe(false);
  });

  it('never names its own answer in the question', () => {
    expect(SAMPLE_TRIVIA.question.toLowerCase()).not.toContain('amul');
  });
});
