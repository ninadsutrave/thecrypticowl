import type { GameId, GameMeta } from './registry';
import { formatClock, type SolveRecord } from './solveRecords';
import { VARIANTS } from './sudoku/variants';
import { shareBlocks } from '../pages/puzzle/shareResult';

type ShareRecord = Pick<SolveRecord, 'seconds' | 'outcome'> &
  Partial<Pick<SolveRecord, 'score' | 'details' | 'hints' | 'mistakes'>>;

interface ShareOptions {
  date?: Date;
  /** Days in a row with a finished puzzle, today included. */
  streak?: number;
}

const site = (path = '') => `thecrypticowl.com${path}`;

const dayLabel = (date: Date) =>
  date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const num = (v: unknown, fallback = 0) => (typeof v === 'number' ? v : fallback);

/** ", no hints ✨" or " with 2 hints". */
const hintsNote = (r: ShareRecord) =>
  r.hints ? ` with ${r.hints === 1 ? 'a hint' : plural(r.hints, 'hint')}` : ', no hints ✨';

interface Voice {
  /** What happened, in the game's own terms ("Got it on guess 2 of 3 in 1:35"). */
  solved: (r: ShareRecord, time: string) => string;
  failed?: (r: ShareRecord, time: string) => string;
  /** The challenge to whoever reads it. */
  dare: (r: ShareRecord, time: string) => string;
  /** The emoji squares, or null where the result line says it all. */
  grid?: (r: ShareRecord) => string | null;
}

/**
 * A result grid without the game's own emoji in front ("🧠 🟥🟩⬜" →
 * "🟥🟩⬜"): wherever the grid appears, the game is already named. Older
 * saved results still carry the prefix.
 */
export function gridWithoutEmoji(grid: string, emoji: string): string {
  return grid.startsWith(emoji) ? grid.slice(emoji.length).trim() : grid;
}

/** The share grid: no leading emoji and no trailing "✨ no hints". */
const squares = (r: ShareRecord, emoji: string) => {
  const g = typeof r.details?.grid === 'string' ? r.details.grid : null;
  if (!g) return null;
  return (
    gridWithoutEmoji(g, emoji)
      .replace(/\s*✨( no hints)?$/u, '')
      .trim() || null
  );
};

const VOICES: Record<GameId, Voice> = {
  sudoku: {
    solved: (r, t) => {
      const variant = SUDOKU_NAMES[String(r.details?.variant)] ?? 'Variant';
      const size = num(r.details?.size);
      return `Solved the ${variant}${size ? ` ${size}×${size}` : ''} in ${t}${hintsNote(r)}`;
    },
    dare: (r, t) => (r.outcome === 'solved' ? `Can you beat ${t}?` : 'Can you crack it?'),
    grid: () => null,
  },
  trivia: {
    solved: (r, t) => {
      const g = num(r.details?.guesses, 1);
      return `${g === 1 ? 'Got it first guess' : `Got it on guess ${g} of 3`} in ${t}`;
    },
    failed: () => 'Stumped after 3 guesses 😅',
    dare: r =>
      r.outcome !== 'solved'
        ? 'Can you crack it?'
        : num(r.details?.guesses, 1) > 1
          ? 'Can you get it first time?'
          : 'Can you match that?',
  },
  'what-am-i': {
    solved: (r, t) => `Named it on clue ${num(r.details?.cluesSeen, 1)} of 5 in ${t}`,
    failed: () => 'Stumped after all 5 clues 😅',
    dare: r =>
      r.outcome !== 'solved'
        ? 'Can you name it?'
        : num(r.details?.cluesSeen, 1) > 1
          ? 'Can you get it in fewer clues?'
          : 'Can you match that?',
  },
  chess: {
    solved: (r, t) => {
      const tries = num(r.mistakes);
      return `Found the mate in ${num(r.details?.mateIn, 4)} ${tries === 0 ? 'on my first try' : `after ${tries + 1} tries`} (${t})`;
    },
    failed: r => `The mate in ${num(r.details?.mateIn, 4)} got away from me 😅`,
    dare: () => 'Can you find it?',
    grid: r => '♟️'.repeat(num(r.details?.mateIn, 4)),
  },
  chronology: {
    solved: (r, t) => {
      const checks = num(r.details?.checks, 1);
      return checks === 1 ? `Sorted it first time in ${t}` : `Sorted it in ${checks} checks (${t})`;
    },
    failed: r =>
      `Got ${num(r.details?.placed)}/5 in place after ${plural(num(r.details?.checks, 4), 'check')} 😅`,
    dare: r =>
      r.outcome !== 'solved'
        ? 'Can you put it in order?'
        : num(r.details?.checks, 1) > 1
          ? 'Can you do it in one?'
          : 'Can you match that?',
  },
  cryptic: {
    solved: (r, t) =>
      r.hints
        ? `Cracked it with ${plural(r.hints, 'hint')} in ${t}`
        : `Cracked it with no hints in ${t}`,
    dare: r =>
      r.outcome === 'solved' && r.hints ? 'Can you crack it with none?' : 'Can you crack it?',
    grid: r => shareBlocks(r.hints ?? 0, r.outcome === 'revealed'),
  },
  'higher-lower': {
    solved: (r, t) => `Scored ${num(r.details?.right)}/${rounds(r)} in ${t}`,
    failed: (r, t) => `Scored ${num(r.details?.right)}/${rounds(r)} in ${t}`,
    dare: r =>
      num(r.details?.right) < rounds(r)
        ? `Can you get ${rounds(r)}/${rounds(r)}?`
        : 'Can you match that?',
  },
  slitherlink: {
    solved: (r, t) => {
      const size = num(r.details?.size);
      return `Closed the ${size ? `${size}×${size} ` : ''}loop in ${t}${hintsNote(r)}`;
    },
    dare: (r, t) => (r.outcome === 'solved' ? `Can you beat ${t}?` : 'Can you close the loop?'),
    grid: () => null,
  },
  cryptogram: {
    solved: (r, t) => `Decoded the quote in ${t}${hintsNote(r)}`,
    dare: (r, t) =>
      r.outcome !== 'solved'
        ? 'Can you crack the code?'
        : r.hints
          ? 'Can you do it with none?'
          : `Can you beat ${t}?`,
    grid: () => null,
  },
};

/** Higher or Lower rounds played: one square each. */
const rounds = (r: ShareRecord) => {
  const g =
    typeof r.details?.grid === 'string' ? [...r.details.grid.matchAll(/🟩|🟥/gu)].length : 0;
  return g || 5;
};

const SUDOKU_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(VARIANTS).map(([id, v]) => [id, v.name])
);

/**
 * The message a finished puzzle shares to a group chat: who and when, the
 * result in the game's own terms, the spoiler-free grid, and a dare.
 *
 *   🧠 Trivia · The Cryptic Owl · 11 Oct
 *   Got it on guess 2 of 3 in 1:35 · 🔥 5 days
 *   🟥🟩⬜
 *   Can you get it first time? 👉 thecrypticowl.com/trivia
 *
 * Pure, so the exact text can be asserted in tests.
 */
export function buildGameShare(
  game: Pick<GameMeta, 'id' | 'name' | 'path' | 'emoji'>,
  record: ShareRecord,
  { date = new Date(), streak = 0 }: ShareOptions = {}
): string {
  const voice = VOICES[game.id];
  const time = formatClock(record.seconds);
  const result =
    record.outcome === 'solved'
      ? voice.solved(record, time)
      : record.outcome === 'revealed'
        ? `Peeked at the answer${record.hints ? ` after ${plural(record.hints, 'hint')}` : ''} 👀`
        : (voice.failed?.(record, time) ?? 'Stumped this time 😅');
  const grid = voice.grid ? voice.grid(record) : squares(record, game.emoji);

  return [
    `${game.emoji} ${game.name} · The Cryptic Owl · ${dayLabel(date)}`,
    streak >= 2 ? `${result} · 🔥 ${streak} days` : result,
    grid,
    `${voice.dare(record, time)} 👉 ${site(game.path)}`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * The big one: every puzzle of the day finished. One mark per game, the
 * total time, and an invitation.
 *
 *   🦉🏆 The Cryptic Owl · 11 Oct
 *   I finished all 9 daily puzzles: 8/9 solved in 48:00 · 🔥 5 days
 *   🔢✅ 🧠✅ 🕵️✅ ♞❌ ⏳✅
 *   🧩✅ ↕️✅ ➰✅ 🔐✅
 *   Can you finish all 9? 👉 thecrypticowl.com
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
  const n = played.length;
  const summary =
    solved === n
      ? `I finished all ${n} daily puzzles, every one solved, in ${formatClock(total)}`
      : `I finished all ${n} daily puzzles: ${solved}/${n} solved in ${formatClock(total)}`;
  return [
    `🦉🏆 The Cryptic Owl · ${dayLabel(date)}`,
    streak >= 2 ? `${summary} · 🔥 ${streak} days` : summary,
    cells.slice(0, half).join(' '),
    cells.slice(half).join(' '),
    `Can you finish all ${n}? 👉 ${site()}`,
  ].join('\n');
}

/** One square per step: solved, missed, or not reached. */
export const square = (state: 'good' | 'bad' | 'close' | 'none') =>
  ({ good: '🟩', bad: '🟥', close: '🟨', none: '⬜' })[state];
