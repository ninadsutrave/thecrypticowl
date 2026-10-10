import { describe, expect, it } from 'vitest';
import { buildDayShare, buildGameShare } from './share';

const trivia = { id: 'trivia' as const, name: 'Trivia', path: '/trivia', emoji: '🧠' };
const chess = { id: 'chess' as const, name: 'Checkmate', path: '/chess', emoji: '♞' };
const date = new Date(2026, 9, 10);

describe('buildGameShare', () => {
  it('celebrates a solve in the game’s own voice, with a dare — never the answer', () => {
    const text = buildGameShare(
      trivia,
      {
        seconds: 252,
        outcome: 'solved',
        score: 'Guess 1 of 3',
        hints: 0,
        details: { grid: '🧠 🟩⬜⬜' },
      },
      { date, streak: 5 }
    );
    expect(text).toBe(
      [
        "🧠 Nailed today's trivia question in 4:12!",
        'Guess 1 of 3 · ✨ no hints · 🔥 5-day streak',
        '🧠 🟩⬜⬜',
        'Can you beat 4:12? 👉 thecrypticowl.com/trivia · 10 Oct',
      ].join('\n')
    );
  });

  it('uses game details where they make the line (mate in N)', () => {
    const text = buildGameShare(
      chess,
      { seconds: 95, outcome: 'solved', hints: 1, details: { mateIn: 3 } },
      { date }
    );
    expect(text.split('\n')[0]).toBe("♞ Found today's mate in 3 in 1:35!");
    expect(text).not.toMatch(/no hints|streak/);
  });

  it('words a miss or a reveal kindly, and still invites a go', () => {
    const failed = buildGameShare(trivia, { seconds: 61, outcome: 'failed' }, { date });
    expect(failed).toBe(
      [
        "🧠 Today's Trivia got the better of me 😅",
        'Think you can do better? 👉 thecrypticowl.com/trivia · 10 Oct',
      ].join('\n')
    );
    expect(buildGameShare(trivia, { seconds: 61, outcome: 'revealed' }, { date })).toMatch(
      /peeked/
    );
  });
});

describe('buildDayShare', () => {
  it('sums the day: one mark per game, total time, solved count and streak', () => {
    const played = [
      { game: { emoji: '🔢' }, record: { seconds: 252, outcome: 'solved' as const } },
      { game: { emoji: '🧩' }, record: { seconds: 150, outcome: 'solved' as const } },
      { game: { emoji: '🧠' }, record: { seconds: 60, outcome: 'failed' as const } },
    ];
    expect(buildDayShare(played, { date, streak: 6 })).toBe(
      [
        '🦉🏆 I finished all 3 daily puzzles on The Cryptic Owl!',
        '10 Oct · ⏱ 7:42 in total · 2/3 solved · 🔥 6-day streak',
        '🔢✅ 🧩✅',
        '🧠❌',
        'Fancy a go? 👉 thecrypticowl.com',
      ].join('\n')
    );
  });

  it('says so when every one was solved', () => {
    const played = [{ game: { emoji: '🔢' }, record: { seconds: 10, outcome: 'solved' as const } }];
    expect(buildDayShare(played, { date }).split('\n')[0]).toMatch(/every one solved/);
  });
});
