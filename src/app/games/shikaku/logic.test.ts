import { describe, expect, it } from 'vitest';
import { isSolved, isValidRect, nextHint, place, rectBetween, removeAt } from './logic';
import { parseShikaku } from './parse';
import { SAMPLE_SHIKAKU } from './sample';

describe('drawing rectangles', () => {
  it('spans two corners in either order', () => {
    expect(rectBetween([3, 4], [1, 2])).toEqual({ r: 1, c: 2, h: 3, w: 3 });
  });

  it('replaces what a new rectangle overlaps, and removes by cell', () => {
    const a = { r: 0, c: 0, h: 1, w: 2 };
    const b = { r: 1, c: 0, h: 1, w: 2 };
    const c = { r: 0, c: 1, h: 2, w: 1 };
    expect(place([a, b], c)).toEqual([c]);
    expect(removeAt([a, b], 1, 1)).toEqual([a]);
  });
});

describe('the sample', () => {
  it('parses', () => {
    expect(parseShikaku(SAMPLE_SHIKAKU)).not.toBeNull();
    expect(parseShikaku({ ...SAMPLE_SHIKAKU, solution: [] })).toBeNull();
  });

  it('is solved by its own solution, and by nothing less', () => {
    expect(isSolved(SAMPLE_SHIKAKU.solution, SAMPLE_SHIKAKU)).toBe(true);
    expect(isSolved(SAMPLE_SHIKAKU.solution.slice(1), SAMPLE_SHIKAKU)).toBe(false);
    expect(SAMPLE_SHIKAKU.solution.every(q => isValidRect(q, SAMPLE_SHIKAKU))).toBe(true);
  });

  it('hints the missing rectangle under the cursor first', () => {
    const [first, second] = SAMPLE_SHIKAKU.solution;
    const at: [number, number] = [second.r, second.c];
    expect(nextHint([], SAMPLE_SHIKAKU, at)).toEqual(second);
    expect(nextHint([], SAMPLE_SHIKAKU, null)).toEqual(first);
    expect(nextHint(SAMPLE_SHIKAKU.solution, SAMPLE_SHIKAKU, null)).toBeNull();
  });
});
