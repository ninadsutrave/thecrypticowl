import { describe, expect, it } from 'vitest';
import { ballpark, formatValue, isHigher, rounds, roundsGrid } from './logic';
import { parseHigherLower } from './parse';
import { SAMPLE_HIGHER_LOWER } from './sample';

describe('formatValue', () => {
  it('writes numbers the way people say them', () => {
    expect(formatValue(13_960_000, 'count')).toBe('14 million');
    expect(formatValue(2_103_778, 'count')).toBe('2.1 million');
    expect(formatValue(1_430_000_000, 'count')).toBe('1.43 billion');
    expect(formatValue(468_312, 'count')).toBe('468,000');
    expect(formatValue(643_801, 'area')).toBe('643,801 km²');
    expect(formatValue(8848.86, 'metres')).toBe('8,849 m');
    expect(formatValue(6650, 'kilometres')).toBe('6,650 km');
    expect(formatValue(1997, 'year')).toBe('1997');
  });
});

describe('ballpark', () => {
  it('rounds to one figure, or the decade', () => {
    expect(ballpark(13_960_000, 'count')).toBe('about 10 million');
    expect(ballpark(2_850, 'kilometres')).toBe('about 3,000 km');
    expect(ballpark(1997, 'year')).toBe('the 1990s');
  });
});

describe('the sample', () => {
  it('parses and has ten rounds with both answers', () => {
    expect(parseHigherLower(SAMPLE_HIGHER_LOWER)).not.toBeNull();
    expect(rounds(SAMPLE_HIGHER_LOWER)).toBe(10);
    const ups = Array.from({ length: 10 }, (_, i) => isHigher(SAMPLE_HIGHER_LOWER, i)).filter(
      Boolean
    );
    expect(ups.length).toBeGreaterThan(2);
    expect(ups.length).toBeLessThan(8);
  });

  it('rejects malformed payloads', () => {
    expect(parseHigherLower({ ...SAMPLE_HIGHER_LOWER, format: 'furlongs' })).toBeNull();
    expect(parseHigherLower({ ...SAMPLE_HIGHER_LOWER, items: [] })).toBeNull();
  });
});

it('draws the share grid', () => {
  expect(roundsGrid([true, false, true])).toBe('🟩🟥🟩');
});
