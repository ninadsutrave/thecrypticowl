import { hasSolvedToday } from '../hooks/useStreak';
import { GAMES, type GameId, type GameMeta } from './registry';
import { getSolveRecord } from './solveRecords';

/** Whether today's puzzle for a game has been finished, from any source. */
export function isDoneToday(id: GameId): boolean {
  // The cryptic page also records solves through its own streak store.
  return Boolean(getSolveRecord(id)) || (id === 'cryptic' && hasSolvedToday());
}

/** The next game after `current` (wrapping round) still to play today. */
export function nextUnfinished(current: GameId): GameMeta | undefined {
  const start = GAMES.findIndex(g => g.id === current);
  const rotated = [...GAMES.slice(start + 1), ...GAMES.slice(0, start)];
  return rotated.find(g => !isDoneToday(g.id));
}
