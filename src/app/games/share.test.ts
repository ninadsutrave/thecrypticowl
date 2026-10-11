import { describe, expect, it } from 'vitest';
import { buildDayShare, buildGameShare } from './share';

const trivia = { id: 'trivia' as const, name: 'Trivia', path: '/trivia', emoji: '🧠' };
const chess = { id: 'chess' as const, name: 'Checkmate', path: '/chess', emoji: '♞' };
const date = new Date(2026, 9, 10);

describe('buildGameShare', () => {
  const game = (id: string, name: string, emoji: string) =>
    ({ id, name, path: `/${id}`, emoji }) as Parameters<typeof buildGameShare>[0];

  it('names the game, the site and the day, then the result, grid and a dare', () => {
    const text = buildGameShare(
      trivia,
      { seconds: 95, outcome: 'solved', hints: 0, details: { guesses: 2, grid: '🧠 🟥🟩⬜' } },
      { date, streak: 5 }
    );
    expect(text).toBe(
      [
        '🧠 Trivia · The Cryptic Owl · 10 Oct',
        'Got it on guess 2 of 3 in 1:35 · 🔥 5 days',
        '🟥🟩⬜',
        'Can you get it first time? 👉 thecrypticowl.com/trivia',
      ].join('\n')
    );
  });

  it('never says "no hints" twice or repeats the game emoji', () => {
    const text = buildGameShare(
      game('sudoku', 'Variant Sudoku', '🔢'),
      {
        seconds: 412,
        outcome: 'solved',
        hints: 0,
        details: { variant: 'killer', size: 6, grid: '🔢 Killer 6×6 ✨ no hints' },
      },
      { date }
    );
    expect(text).toBe(
      [
        '🔢 Variant Sudoku · The Cryptic Owl · 10 Oct',
        'Solved the Killer 6×6 in 6:52, no hints ✨',
        'Can you beat 6:52? 👉 thecrypticowl.com/sudoku',
      ].join('\n')
    );
  });

  it('speaks each game in its own terms', () => {
    const line = (id: string, name: string, emoji: string, record: object) =>
      buildGameShare(game(id, name, emoji), record as never, { date })
        .split('\n')
        .slice(1);
    expect(
      line('chess', 'Checkmate', '♞', {
        seconds: 210,
        outcome: 'solved',
        mistakes: 0,
        details: { mateIn: 4 },
      })
    ).toEqual([
      'Found the mate in 4 on my first try (3:30)',
      '♟️♟️♟️♟️',
      'Can you find it? 👉 thecrypticowl.com/chess',
    ]);
    expect(
      line('higher-lower', 'Higher or Lower', '↕️', {
        seconds: 60,
        outcome: 'solved',
        details: { right: 4, grid: '🟩🟩🟥🟩🟩' },
      })
    ).toEqual([
      'Scored 4/5 in 1:00',
      '🟩🟩🟥🟩🟩',
      'Can you get 5/5? 👉 thecrypticowl.com/higher-lower',
    ]);
    expect(
      line('cryptic', 'British Style Cryptics', '🧩', { seconds: 300, outcome: 'solved', hints: 1 })
    ).toEqual([
      'Cracked it with 1 hint in 5:00',
      '🟨🟩🟩🟩',
      'Can you crack it with none? 👉 thecrypticowl.com/cryptic',
    ]);
    expect(
      line('chronology', 'Chronology', '⏳', {
        seconds: 120,
        outcome: 'solved',
        details: { checks: 2, grid: '🟩🟨🟨🟩🟩\n🟩🟩🟩🟩🟩' },
      })
    ).toEqual([
      'Sorted it in 2 checks (2:00)',
      '🟩🟨🟨🟩🟩',
      '🟩🟩🟩🟩🟩',
      'Can you do it in one? 👉 thecrypticowl.com/chronology',
    ]);
  });

  it('words a miss or a reveal kindly, and still invites a go', () => {
    expect(
      buildGameShare(
        trivia,
        { seconds: 61, outcome: 'failed', details: { grid: '🧠 🟥🟥🟥' } },
        { date }
      )
    ).toBe(
      [
        '🧠 Trivia · The Cryptic Owl · 10 Oct',
        'Stumped after 3 guesses 😅',
        '🟥🟥🟥',
        'Can you crack it? 👉 thecrypticowl.com/trivia',
      ].join('\n')
    );
    expect(buildGameShare(chess, { seconds: 61, outcome: 'revealed', hints: 2 }, { date })).toMatch(
      /Peeked at the answer after 2 hints 👀/
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
        '🦉🏆 The Cryptic Owl · 10 Oct',
        'I finished all 3 daily puzzles: 2/3 solved in 7:42 · 🔥 6 days',
        '🔢✅ 🧩✅',
        '🧠❌',
        'Can you finish all 3? 👉 thecrypticowl.com',
      ].join('\n')
    );
  });

  it('says so when every one was solved', () => {
    const played = [{ game: { emoji: '🔢' }, record: { seconds: 10, outcome: 'solved' as const } }];
    expect(buildDayShare(played, { date }).split('\n')[1]).toMatch(/every one solved/);
  });
});
