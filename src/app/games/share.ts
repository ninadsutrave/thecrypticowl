import type { GameMeta } from './registry';
import { formatClock, type SolveRecord } from './solveRecords';

/**
 * Spoiler-free share text for any game's result — the line that lands in a
 * group chat. Pure, so the exact text can be asserted in tests.
 *
 *   The Cryptic Owl · Trivia · 10 Oct
 *   🟩🟩🟥🟩🟩🟩🟩🟥🟩🟩
 *   ⏱ 4:12 · 8/10 correct
 *   thecrypticowl.com/trivia
 */
export function buildGameShare(
  game: Pick<GameMeta, 'name' | 'path'>,
  record: Pick<SolveRecord, 'seconds' | 'outcome' | 'score' | 'details'>,
  date = new Date()
): string {
  const day = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const grid = typeof record.details?.grid === 'string' ? record.details.grid : null;
  const result =
    record.outcome === 'solved'
      ? (record.score ?? 'Solved')
      : record.outcome === 'failed'
        ? 'Not this time'
        : 'Revealed';
  return [
    `The Cryptic Owl · ${game.name} · ${day}`,
    grid,
    `⏱ ${formatClock(record.seconds)} · ${result}`,
    `thecrypticowl.com${game.path}`,
  ]
    .filter(Boolean)
    .join('\n');
}

/** One square per step: solved, missed, or not reached. */
export const square = (state: 'good' | 'bad' | 'close' | 'none') =>
  ({ good: '🟩', bad: '🟥', close: '🟨', none: '⬜' })[state];
