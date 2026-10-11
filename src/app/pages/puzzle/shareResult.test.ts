import { describe, it, expect, vi, afterEach } from 'vitest';
import { shareBlocks, formatSolveTime, funCallout, shareOrCopy } from './shareResult';

describe('shareBlocks', () => {
  it('is all green when no hints were used', () => {
    expect(shareBlocks(0, false)).toBe('🟩🟩🟩🟩');
  });

  it('marks early hints yellow and late hints red', () => {
    expect(shareBlocks(1, false)).toBe('🟨🟩🟩🟩');
    expect(shareBlocks(2, false)).toBe('🟨🟨🟩🟩');
    expect(shareBlocks(3, false)).toBe('🟨🟨🟥🟩');
    expect(shareBlocks(4, false)).toBe('🟨🟨🟥🟥');
  });

  it('is all brown when the answer was revealed, whatever the hint count', () => {
    expect(shareBlocks(0, true)).toBe('🟫🟫🟫🟫');
    expect(shareBlocks(4, true)).toBe('🟫🟫🟫🟫');
  });

  it('always emits exactly four blocks', () => {
    for (let h = 0; h <= 4; h++) {
      expect([...shareBlocks(h, false)]).toHaveLength(4);
    }
  });
});

describe('formatSolveTime', () => {
  it.each([
    [0, '0s'],
    [45, '45s'],
    [59, '59s'],
    [60, '1m 00s'],
    [65, '1m 05s'],
    [125, '2m 05s'],
    [3600, '60m 00s'],
  ])('formats %is as %s', (input, expected) => {
    expect(formatSolveTime(input)).toBe(expected);
  });

  it('pads the seconds so times line up when read in a list', () => {
    expect(formatSolveTime(61)).toBe('1m 01s');
  });

  it('degrades gracefully on nonsense input', () => {
    expect(formatSolveTime(-5)).toBe('0s');
    expect(formatSolveTime(NaN)).toBe('0s');
  });
});

describe('funCallout', () => {
  it('scales the boast with how much help was needed', () => {
    expect(funCallout({ hintsUsed: 0, wasRevealed: false })).toMatch(/zero hints/);
    expect(funCallout({ hintsUsed: 1, wasRevealed: false })).toMatch(/Just 1 hint/);
    expect(funCallout({ hintsUsed: 3, wasRevealed: false })).toMatch(/Tricky clue/);
    expect(funCallout({ hintsUsed: 4, wasRevealed: false })).toMatch(/nearly had me/);
  });

  it('never boasts about a revealed answer', () => {
    expect(funCallout({ hintsUsed: 0, wasRevealed: true })).toMatch(/stumped me/);
  });
});

describe('shareOrCopy', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prefers the native share sheet', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share, clipboard: { writeText: vi.fn() } });
    expect(await shareOrCopy('hello')).toBe('shared');
    expect(share).toHaveBeenCalledWith({ text: 'hello' });
  });

  it('falls back to the clipboard when the share sheet is dismissed', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      share: vi.fn().mockRejectedValue(new Error('dismissed')),
      clipboard: { writeText },
    });
    expect(await shareOrCopy('hello')).toBe('copied');
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('uses the clipboard directly where no share sheet exists', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    expect(await shareOrCopy('hello')).toBe('copied');
  });

  it('reports failure rather than claiming success when the clipboard is blocked', async () => {
    // Private windows and insecure contexts both reject writeText. Saying
    // "Copied!" when nothing was copied is worse than saying nothing.
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    expect(await shareOrCopy('hello')).toBe('failed');
  });
});
