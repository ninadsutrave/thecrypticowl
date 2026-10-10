import { StoreKeys, readJSON, writeJSON } from '../lib/localStore';
import type { SolveOutcome } from './solveRecords';
import { localDateKey } from './solveRecords';

/** A past puzzle finished from the archive. Never part of streaks or stats. */
export interface ArchivePlay {
  outcome: SolveOutcome;
  seconds: number;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The archive date in a game URL (`?date=2026-10-03`), or null for today's
 * puzzle. Only real dates before today count: today and the future are the
 * normal daily puzzle.
 */
export function archiveDateFrom(params: URLSearchParams, today = localDateKey()): string | null {
  const date = params.get('date');
  if (!date || !ISO_DATE.test(date) || date >= today) return null;
  const [y, m, d] = date.split('-').map(Number);
  const parsed = new Date(y, m - 1, d);
  if (parsed.getFullYear() !== y || parsed.getMonth() !== m - 1 || parsed.getDate() !== d) {
    return null;
  }
  return date;
}

export function getArchivePlays(): Record<string, ArchivePlay> {
  return readJSON<Record<string, ArchivePlay>>(StoreKeys.archivePlays, {});
}

export function getArchivePlay(game: string, date: string): ArchivePlay | null {
  return getArchivePlays()[`${game}:${date}`] ?? null;
}

/** Remember a finished archive puzzle. A solve is never downgraded by a later fail. */
export function recordArchivePlay(game: string, date: string, play: ArchivePlay): void {
  const all = getArchivePlays();
  const key = `${game}:${date}`;
  if (all[key]?.outcome === 'solved' && play.outcome !== 'solved') return;
  all[key] = play;
  writeJSON(StoreKeys.archivePlays, all);
}

/** "3 October 2026" for an ISO date, in local time. */
export function longDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** The archive page for a game. */
export function archivePath(game: string): string {
  return `/archive?game=${game}`;
}
