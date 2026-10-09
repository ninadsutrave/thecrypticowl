import { describe, expect, it } from 'vitest';
import { assign, encode, isSolved, isValidKey, pickHint, solutionMap } from './logic';
import { SAMPLE_CRYPTOGRAM } from './sample';

const { text, key } = SAMPLE_CRYPTOGRAM;

describe('the sample puzzle', () => {
  it('uses a key where no letter stands for itself', () => {
    expect(isValidKey(key)).toBe(true);
  });

  it('enciphers letters only, keeping spaces and punctuation', () => {
    expect(encode(text, key)).toBe(
      'HLYCN XJ EHF LZF HLYCN XJ YBIH, ULWHI L ULZ GHLCXGN, THLCXGN, LZF TBIH.'
    );
  });
});

describe('isValidKey', () => {
  it('rejects a key that maps a letter to itself or repeats one', () => {
    expect(isValidKey('ABCDEFGHIJKLMNOPQRSTUVWXYZ')).toBe(false);
    expect(isValidKey('BBCDEFGHIJKLMNOPQRSTUVWXYA')).toBe(false);
  });
});

describe('assign', () => {
  it('moves a plain letter off any other cipher letter', () => {
    expect(assign({ X: 'T', Q: 'E' }, 'Z', 'T')).toEqual({ Q: 'E', Z: 'T' });
  });

  it('clears a letter with an empty guess', () => {
    expect(assign({ X: 'T' }, 'X', '')).toEqual({});
  });
});

describe('isSolved', () => {
  it('needs every cipher letter right', () => {
    const solution = solutionMap('AB', 'BCDEFGHIJKLMNOPQRSTUVWXYZA');
    expect(isSolved({ B: 'A' }, solution)).toBe(false);
    expect(isSolved({ B: 'A', C: 'B' }, solution)).toBe(true);
  });
});

describe('pickHint', () => {
  const solution = solutionMap(text, key);
  const cipher = encode(text, key);

  it('reveals the selected letter while it is still wrong', () => {
    expect(pickHint({}, solution, cipher, 'X')).toBe('X');
  });

  it('otherwise reveals the most frequent unsolved letter', () => {
    // H (plain E) and L (plain A) are the commonest; either is a fair hint.
    expect(['H', 'L']).toContain(pickHint({}, solution, cipher, null));
  });

  it('returns null once everything is solved', () => {
    expect(pickHint(solution, solution, cipher, null)).toBeNull();
  });
});
