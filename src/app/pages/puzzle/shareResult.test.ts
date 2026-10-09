import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  buildShareText,
  shareBlocks,
  formatSolveTime,
  funCallout,
  shareOrCopy,
} from './shareResult';

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

describe('buildShareText', () => {
  const base = {
    puzzleNumber: 42,
    hintsUsed: 0,
    wasRevealed: false,
    solveTime: 95,
    streak: 7,
  };

  it('leads with the puzzle number', () => {
    expect(buildShareText(base).split('\n')[0]).toBe('🦉 TheCrypticOwl #42');
  });

  it('includes blocks, time and streak for a genuine solve', () => {
    const text = buildShareText(base);
    expect(text).toContain('🟩🟩🟩🟩  (0/4 hints used)');
    expect(text).toContain('⏱️ 1m 35s  🔥 7-day streak');
    expect(text).toContain('thecrypticowl.com');
  });

  it('omits the time and streak line when the answer was revealed', () => {
    // Nothing to boast about, and a "streak" beside a revealed answer reads
    // as a claim the solver didn't earn.
    const text = buildShareText({ ...base, wasRevealed: true });
    expect(text).toContain('(revealed the answer)');
    expect(text).not.toContain('day streak');
    expect(text).not.toContain('⏱️');
  });

  it('never leaks the answer or the clue', () => {
    const text = buildShareText(base);
    expect(text).not.toMatch(/CANOE|SPEAR/);
  });

  it('is stable — the same input always produces the same text', () => {
    expect(buildShareText(base)).toBe(buildShareText(base));
  });

  it('does not claim a streak for the offline practice clue', () => {
    // The fallback clue has no database row, so there is no streak behind it.
    // "🔥 0-day streak" is worse than saying nothing.
    const text = buildShareText({ ...base, isPractice: true, streak: 0 });
    expect(text).toContain('practice clue');
    expect(text).not.toContain('day streak');
    expect(text).toContain('⏱️ 1m 35s');
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
