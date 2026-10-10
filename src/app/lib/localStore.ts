/**
 * Namespaced localStorage access.
 *
 * Every key this app writes is prefixed `tco-`. Centralising that does three
 * things scattered `localStorage` calls could not:
 *
 *   1. Sign-out actually clears user data. `signOut` only removed Supabase's
 *      own `sb-*` keys, so `tco-streak`, `tco-reactions` and the puzzle cache
 *      survived — and the next person to sign in on that device inherited the
 *      previous user's streak, XP and history.
 *   2. The dated puzzle cache gets pruned. `tco-puzzle-<date>` was written
 *      once a day and never removed, so the cache grew for the lifetime of
 *      the browser profile.
 *   3. Storage failures stop being a crash. Private windows, disabled site
 *      data and full quotas all throw on read as well as write; every access
 *      here is guarded and degrades to "no cached value".
 */

const PREFIX = 'tco-';

export const StoreKeys = {
  streak: `${PREFIX}streak`,
  reactions: `${PREFIX}reactions`,
  appLiked: `${PREFIX}app-liked`,
  darkMode: `${PREFIX}dark-mode`,
  /** One entry per calendar date; pruned by `prunePuzzleCache`. */
  puzzle: (isoDate: string) => `${PREFIX}puzzle-${isoDate}`,
  /** Another game's generated puzzle; pruned with the cryptic cache. */
  gamePuzzle: (isoDate: string, game: string) => `${PREFIX}puzzle-${isoDate}-${game}`,
  /** Finished-puzzle times for every game, keyed by game then local date. */
  solves: `${PREFIX}solves`,
  /** Clocks of puzzles still in progress, so a reload doesn't reset them. */
  timers: `${PREFIX}timers`,
  /** Board state of puzzles still in progress, keyed like `timers`. */
  progress: `${PREFIX}progress`,
  /** Games whose tutorial has been seen on this device. */
  tutorialsSeen: `${PREFIX}tutorials-seen`,
  /** When this device last sent a puzzle suggestion (cooldown). */
  suggestionAt: `${PREFIX}suggestion-at`,
  /** Past puzzles finished from the archive, keyed `game:date`. */
  archivePlays: `${PREFIX}archive-plays`,
  /** Analytics cookie choice: 'granted' | 'denied' (set by index.html). */
  consent: `${PREFIX}consent`,
  /** Chess board colours: a device preference. */
  chessBoard: `${PREFIX}chess-board`,
} as const;

const PUZZLE_KEY_RE = new RegExp(`^${PREFIX}puzzle-(\\d{4}-\\d{2}-\\d{2})(?:-[a-z-]+)?$`);

/** How many days of cached puzzles to keep. */
const PUZZLE_CACHE_DAYS = 3;

export function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeRaw(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
}

/** Parse a JSON value, falling back when absent or corrupt. */
export function readJSON<T>(key: string, fallback: T): T {
  const raw = readRaw(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Corrupt entry: drop it so it can't keep failing on every read.
    remove(key);
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): boolean {
  try {
    return writeRaw(key, JSON.stringify(value));
  } catch {
    return false;
  }
}

/** Every `tco-` key currently present. */
function appKeys(): string[] {
  try {
    return Object.keys(localStorage).filter(k => k.startsWith(PREFIX));
  } catch {
    return [];
  }
}

/**
 * Drop cached puzzles older than `PUZZLE_CACHE_DAYS`.
 * Cheap enough to call on every puzzle load.
 */
export function prunePuzzleCache(today = new Date()): number {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - PUZZLE_CACHE_DAYS);
  const cutoffIso = cutoff.toISOString().slice(0, 10);

  let removed = 0;
  for (const key of appKeys()) {
    const match = PUZZLE_KEY_RE.exec(key);
    if (match && match[1] < cutoffIso) {
      remove(key);
      removed++;
    }
  }
  return removed;
}

/**
 * Clear everything belonging to the signed-in user, plus Supabase's own
 * session keys. Called on sign-out.
 *
 * `tco-dark-mode`, `tco-tutorials-seen` and the cookie choice are deliberately
 * kept: they are device preferences, not user data. Resetting the theme, or replaying every
 * game's tutorial, on sign-out would be jarring.
 */
export function clearUserData(): void {
  const keep = new Set<string>([
    StoreKeys.darkMode,
    StoreKeys.tutorialsSeen,
    StoreKeys.chessBoard,
    StoreKeys.consent,
  ]);
  for (const key of appKeys()) {
    if (!keep.has(key)) remove(key);
  }
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith('sb-'))
      .forEach(k => remove(k));
  } catch {
    /* storage unavailable */
  }
}
