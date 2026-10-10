import { beforeEach, describe, expect, it } from 'vitest';
import { IDEA_MAX, markSent, secondsUntilNext, suggestionProblem } from './suggestion';

describe('suggestionProblem', () => {
  it('needs a real idea, within limits', () => {
    expect(suggestionProblem('', '')).toMatch(/at least/);
    expect(suggestionProblem('   short   ', '')).toMatch(/at least/);
    expect(suggestionProblem('A daily word ladder', '')).toBeNull();
    expect(suggestionProblem('x'.repeat(IDEA_MAX + 1), '')).toMatch(/under/);
    expect(suggestionProblem('A daily word ladder', 'n'.repeat(61))).toMatch(/Names/);
  });
});

describe('cooldown', () => {
  beforeEach(() => localStorage.clear());

  it('waits a minute between suggestions from one device', () => {
    expect(secondsUntilNext(1_000_000)).toBe(0);
    markSent(1_000_000);
    expect(secondsUntilNext(1_000_000 + 1_000)).toBe(59);
    expect(secondsUntilNext(1_000_000 + 60_000)).toBe(0);
  });
});
