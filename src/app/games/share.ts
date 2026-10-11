import type { GameId, GameMeta } from './registry';
import { formatClock, type SolveRecord } from './solveRecords';

type ShareRecord = Pick<SolveRecord, 'seconds' | 'outcome' | 'score' | 'details'> &
  Partial<Pick<SolveRecord, 'hints'>>;

interface ShareOptions {
  date?: Date;
  /** Days in a row with a finished puzzle, today included. */
  streak?: number;
}

/** What a solve sounds like, game by game ("Cracked today's cryptic clue"). */
const SOLVED: Record<GameId, (r: ShareRecord) => string> = {
  sudoku: () => "Solved today's Variant Sudoku",
  cryptic: () => "Cracked today's cryptic clue",
  'what-am-i': () => "Guessed today's What Am I?",
  trivia: () => "Nailed today's trivia question",
  chronology: () => "Put today's history in order",
  chess: r => `Found today's mate in ${r.details?.mateIn ?? 'N'}`,
  cryptogram: () => "Decoded today's cryptogram",
  slitherlink: () => "Closed today's Slitherlink loop",
  'higher-lower': () => "Played today's Higher or Lower",
};

const site = (path = '') => `thecrypticowl.com${path}`;

/** The full address of a page on the site, for "Copy link", e.g. puzzleUrl('/trivia'). */
export function puzzleUrl(path = '/'): string {
  return `https://www.thecrypticowl.com${path}`;
}
const dayLabel = (date: Date) =>
  date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/**
 * The message a finished puzzle shares to a group chat: a headline in the
 * game's own voice, the result, the spoiler-free grid, and a dare.
 *
 *   🧠 Nailed today's trivia question in 4:12!
 *   Guess 1 of 3 · ✨ no hints · 🔥 5-day streak
 *   🧠 🟩⬜⬜
 *   Can you beat 4:12? 👉 thecrypticowl.com/trivia
 *
 * Pure, so the exact text can be asserted in tests.
 */
export function buildGameShare(
  game: Pick<GameMeta, 'id' | 'name' | 'path' | 'emoji'>,
  record: ShareRecord,
  { date = new Date(), streak = 0 }: ShareOptions = {}
): string {
  const time = formatClock(record.seconds);
  const headline =
    record.outcome === 'solved'
      ? `${game.emoji} ${SOLVED[game.id](record)} in ${time}!`
      : record.outcome === 'failed'
        ? `${game.emoji} Today's ${game.name} got the better of me 😅`
        : `${game.emoji} I peeked at the answer to today's ${game.name} 👀`;

  const facts = [
    record.outcome === 'solved' && record.score && record.score !== 'No hints'
      ? record.score
      : null,
    record.outcome === 'solved' && record.hints === 0 ? '✨ no hints' : null,
    streak >= 2 ? `🔥 ${streak}-day streak` : null,
  ].filter(Boolean);

  const grid = typeof record.details?.grid === 'string' ? record.details.grid : null;
  const dare =
    record.outcome === 'solved'
      ? `Can you beat ${time}? 👉 ${site(game.path)}`
      : `Think you can do better? 👉 ${site(game.path)}`;

  return [headline, facts.length ? facts.join(' · ') : null, grid, `${dare} · ${dayLabel(date)}`]
    .filter(Boolean)
    .join('\n');
}

/**
 * The big one: every puzzle of the day finished. One mark per game, the
 * total time, and an invitation.
 *
 *   🦉🏆 I finished all 9 daily puzzles on The Cryptic Owl!
 *   10 Oct · ⏱ 31:20 in total · 8/9 solved · 🔥 6-day streak
 *   🔢✅ 🧩✅ 🕵️✅ 🧠❌ ⏳✅
 *   ♞✅ 🔐✅ ➰✅ ↕️✅
 *   Fancy a go? 👉 thecrypticowl.com
 */
export function buildDayShare(
  played: { game: Pick<GameMeta, 'emoji'>; record: Pick<SolveRecord, 'seconds' | 'outcome'> }[],
  { date = new Date(), streak = 0 }: ShareOptions = {}
): string {
  const total = played.reduce((s, p) => s + p.record.seconds, 0);
  const solved = played.filter(p => p.record.outcome === 'solved').length;
  const mark = { solved: '✅', failed: '❌', revealed: '👀' } as const;
  const cells = played.map(p => `${p.game.emoji}${mark[p.record.outcome]}`);
  const half = Math.ceil(cells.length / 2);
  const perfect = solved === played.length;
  return [
    `🦉🏆 I finished all ${played.length} daily puzzles on The Cryptic Owl${perfect ? ', every one solved' : ''}!`,
    [
      dayLabel(date),
      `⏱ ${formatClock(total)} in total`,
      `${solved}/${played.length} solved`,
      streak >= 2 ? `🔥 ${streak}-day streak` : null,
    ]
      .filter(Boolean)
      .join(' · '),
    cells.slice(0, half).join(' '),
    cells.slice(half).join(' '),
    `Fancy a go? 👉 ${site()}`,
  ].join('\n');
}

/** One square per step: solved, missed, or not reached. */
export const square = (state: 'good' | 'bad' | 'close' | 'none') =>
  ({ good: '🟩', bad: '🟥', close: '🟨', none: '⬜' })[state];
