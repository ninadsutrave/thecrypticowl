import { fetchGamePlays, insertGamePlays, type DbGamePlay } from '../../lib/supabase';
import { GAMES, type GameId } from './registry';
import {
  getAllPlays,
  localDateKey,
  saveSolveRecord,
  type PlayRecord,
  type SolveRecord,
} from './solveRecords';

/**
 * Play history persistence: the device copy (solveRecords.ts) is always
 * written; signed-in players also get a server copy in `game_plays`.
 *
 * The server write is fire-and-forget. If it fails (offline, blocked), the
 * play is still on the device, and `syncPlayHistory` uploads it on the next
 * page load while signed in.
 */

const GAME_IDS = new Set<string>(GAMES.map(g => g.id));
/** Must match the date window in the game_plays insert policy. */
const SYNC_WINDOW_DAYS = 400;

export function toRow(userId: string, p: PlayRecord): DbGamePlay {
  return {
    user_id: userId,
    game: p.game,
    puzzle_date: p.date,
    outcome: p.outcome,
    // The table requires 0 < seconds < one day.
    seconds: Math.min(86_399, Math.max(1, Math.round(p.seconds))),
    hints_used: p.hints,
    mistakes: p.mistakes,
    score: p.score ?? null,
    details: p.details ?? {},
    completed_at: p.completedAt || new Date().toISOString(),
  };
}

export function fromRow(r: DbGamePlay): SolveRecord {
  return {
    seconds: r.seconds,
    outcome: r.outcome,
    hints: r.hints_used,
    mistakes: r.mistakes,
    score: r.score ?? undefined,
    details: r.details ?? {},
    completedAt: r.completed_at,
  };
}

/**
 * Record the first finish of today's puzzle.
 * @returns false when today already had a record (a replay) — nothing written.
 */
export function recordPlay(
  game: GameId,
  record: Omit<SolveRecord, 'completedAt'>,
  userId?: string | null
): boolean {
  const date = localDateKey();
  const completedAt = new Date().toISOString();
  const saved = saveSolveRecord(game, { ...record, completedAt }, date);
  if (saved && userId) {
    void insertGamePlays([toRow(userId, { ...record, completedAt, game, date })]);
  }
  return saved;
}

/**
 * Two-way merge on sign-in: pull the server's plays onto this device (never
 * overwriting a local day), then push any local plays the server lacks.
 */
export async function syncPlayHistory(userId: string): Promise<void> {
  const remote = await fetchGamePlays(userId);
  const onServer = new Set<string>();
  for (const r of remote) {
    onServer.add(`${r.game}:${r.puzzle_date}`);
    if (GAME_IDS.has(r.game)) saveSolveRecord(r.game as GameId, fromRow(r), r.puzzle_date);
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - SYNC_WINDOW_DAYS);
  const cutoffKey = localDateKey(cutoff);
  const missing = getAllPlays().filter(
    p => !onServer.has(`${p.game}:${p.date}`) && p.date >= cutoffKey
  );
  await insertGamePlays(missing.map(p => toRow(userId, p)));
}
