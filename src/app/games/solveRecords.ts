import { StoreKeys, readJSON, writeJSON } from '../lib/localStore';
import { GAMES, type GameId } from './registry';

/**
 * The play history: one record per game per day the player finished it.
 *
 * Every game writes here on completion, signed in or not, so the history
 * page and the home grid's "done" badges work offline and for anonymous
 * players. For signed-in players, playHistory.ts mirrors these records to the
 * `game_plays` table and merges the server's copy back in on sign-in.
 */

export type SolveOutcome = 'solved' | 'failed' | 'revealed';

export interface SolveRecord {
  /** Active solving time — the clock pauses while the tab is hidden. */
  seconds: number;
  outcome: SolveOutcome;
  /** Hints taken (cells revealed, letters shown, moves shown, …). */
  hints: number;
  /** Wrong guesses, wrong moves, failed checks — whatever the game counts. */
  mistakes: number;
  /** Game-specific result line, e.g. "8/10 correct" or "3/5 points". */
  score?: string;
  /** Game-specific numbers behind the score, for future stats. */
  details?: Record<string, number | string | boolean>;
  completedAt: string;
}

export interface PlayRecord extends SolveRecord {
  game: GameId;
  /** The puzzle's date on the player's local calendar, YYYY-MM-DD. */
  date: string;
}

type SolveLog = Partial<Record<GameId, Record<string, SolveRecord>>>;
type TimerLog = Record<string, number>;

/**
 * Days of records kept on the device per game. A year and a bit: enough for
 * the history calendar and yearly streaks, and about 50 KB at full use. The
 * server copy, for signed-in players, keeps everything.
 */
const SOLVE_HISTORY_DAYS = 400;

/**
 * Today's date on the solver's own calendar. Puzzles roll over at local
 * midnight, so a UTC date would hand an evening solver tomorrow's slot.
 */
export function localDateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Records written before hints/mistakes existed lack them; read them as 0. */
function normalise(
  r: Partial<SolveRecord> & Pick<SolveRecord, 'seconds' | 'outcome'>
): SolveRecord {
  return {
    hints: 0,
    mistakes: 0,
    completedAt: '',
    ...r,
  };
}

export function getSolveRecord(game: GameId, date = localDateKey()): SolveRecord | null {
  const r = readJSON<SolveLog>(StoreKeys.solves, {})[game]?.[date];
  return r ? normalise(r) : null;
}

const LIVE_GAMES = new Set<string>(GAMES.map(g => g.id));

/**
 * Days in a row with any puzzle finished, counting back from today, or from
 * yesterday while today's puzzles are still to play. The same rule as the
 * Stats page, cheap enough for the nav bar.
 */
export function currentStreak(today = new Date()): number {
  const days = new Set<string>();
  for (const [game, byDate] of Object.entries(readJSON<SolveLog>(StoreKeys.solves, {}))) {
    if (LIVE_GAMES.has(game)) for (const d of Object.keys(byDate ?? {})) days.add(d);
  }
  const cursor = new Date(today);
  if (!days.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let n = 0;
  while (days.has(localDateKey(cursor))) {
    n++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return n;
}

/** Every record on the device, newest first. */

export function getAllPlays(): PlayRecord[] {
  const log = readJSON<SolveLog>(StoreKeys.solves, {});
  const plays: PlayRecord[] = [];
  for (const [game, days] of Object.entries(log) as [GameId, Record<string, SolveRecord>][]) {
    // Plays of a game no longer in the lineup stay stored but aren't shown:
    // every page that lists plays looks the game up in the registry.
    if (!LIVE_GAMES.has(game)) continue;
    for (const [date, r] of Object.entries(days ?? {})) {
      plays.push({ ...normalise(r), game, date });
    }
  }
  return plays.sort(
    (a, b) => b.date.localeCompare(a.date) || b.completedAt.localeCompare(a.completedAt)
  );
}

/**
 * Record a finished puzzle. The first finish of the day is the one that
 * counts: a replay must never overwrite (or improve) the real time.
 *
 * @returns false when a record for that day already existed.
 */
export function saveSolveRecord(
  game: GameId,
  record: Omit<SolveRecord, 'completedAt'> & { completedAt?: string },
  date = localDateKey()
): boolean {
  const log = readJSON<SolveLog>(StoreKeys.solves, {});
  const days = log[game] ?? {};
  if (days[date]) return false;

  days[date] = { ...record, completedAt: record.completedAt ?? new Date().toISOString() };

  // Keep the newest N days only — one entry per game per day adds up.
  const kept = Object.keys(days).sort().slice(-SOLVE_HISTORY_DAYS);
  log[game] = Object.fromEntries(kept.map(k => [k, days[k]]));
  writeJSON(StoreKeys.solves, log);
  return true;
}

// ─── In-progress clocks ───────────────────────────────────────────────────────

const timerKey = (game: GameId, date: string) => `${game}:${date}`;

export function readInProgress(game: GameId, date: string): number {
  const ms = readJSON<TimerLog>(StoreKeys.timers, {})[timerKey(game, date)];
  return typeof ms === 'number' && Number.isFinite(ms) && ms > 0 ? ms : 0;
}

export function writeInProgress(game: GameId, date: string, ms: number): void {
  const log = readJSON<TimerLog>(StoreKeys.timers, {});
  // Clocks from earlier days belong to puzzles that can no longer be played.
  const suffix = `:${date}`;
  const fresh = Object.fromEntries(Object.entries(log).filter(([k]) => k.endsWith(suffix)));
  fresh[timerKey(game, date)] = Math.round(ms);
  writeJSON(StoreKeys.timers, fresh);
}

export function clearInProgress(game: GameId, date: string): void {
  const log = readJSON<TimerLog>(StoreKeys.timers, {});
  if (!(timerKey(game, date) in log)) return;
  delete log[timerKey(game, date)];
  writeJSON(StoreKeys.timers, log);
}

// ─── In-progress board state ──────────────────────────────────────────────────

type ProgressLog = Record<string, Record<string, unknown>>;

/** Storage slot for one game's puzzle on one day. */
/**
 * Storage slot for one game's puzzle on one day. The puzzle's fingerprint
 * is part of it: if the day's puzzle ever changes (a regenerated row, a
 * stale cache), the old board must not be restored onto the new grid.
 */
export function progressKey(game: GameId, date: string, puzzleId = ''): string {
  return `${timerKey(game, date)}:${fingerprint(puzzleId)}`;
}

/** Short stable hash (FNV-1a) — identifies a puzzle, not secret. */
export function fingerprint(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export function readProgress(slot: string): Record<string, unknown> {
  return readJSON<ProgressLog>(StoreKeys.progress, {})[slot] ?? {};
}

export function writeProgress(slot: string, field: string, value: unknown): void {
  const log = readJSON<ProgressLog>(StoreKeys.progress, {});
  // Like the clocks, state from earlier days is for puzzles no longer
  // playable — and so is state for a different puzzle on the same day.
  const [game, date] = slot.split(':');
  const fresh = Object.fromEntries(
    Object.entries(log).filter(([k]) => {
      const [g, d] = k.split(':');
      return d === date && (g !== game || k === slot);
    })
  );
  fresh[slot] = { ...(fresh[slot] ?? {}), [field]: value };
  writeJSON(StoreKeys.progress, fresh);
}

export function clearProgress(slot: string): void {
  const log = readJSON<ProgressLog>(StoreKeys.progress, {});
  if (!(slot in log)) return;
  delete log[slot];
  writeJSON(StoreKeys.progress, log);
}

/** `m:ss`, or `h:mm:ss` past the hour — the same shape the live clock shows. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}
