import { describe, expect, it } from 'vitest';
import { buildGameShare } from './share';

const trivia = { name: 'Trivia', path: '/trivia' };
const day = new Date(2026, 9, 10);

describe('buildGameShare', () => {
  it('includes the grid, time, result and link — never the answer', () => {
    const text = buildGameShare(
      trivia,
      { seconds: 252, outcome: 'solved', score: '8/10 correct', details: { grid: '🟩🟥🟩' } },
      day
    );
    expect(text).toBe(
      'The Cryptic Owl · Trivia · 10 Oct\n🟩🟥🟩\n⏱ 4:12 · 8/10 correct\nthecrypticowl.com/trivia'
    );
  });

  it('omits the grid line when a game has none, and words a miss kindly', () => {
    const text = buildGameShare(trivia, { seconds: 61, outcome: 'failed' }, day);
    expect(text).toBe(
      'The Cryptic Owl · Trivia · 10 Oct\n⏱ 1:01 · Not this time\nthecrypticowl.com/trivia'
    );
  });
});
