import type { PlayRecord, SolveRecord } from './solveRecords';

/**
 * XP for one finished puzzle, the same in every game: the cryptic clue's
 * scale (100 clean, 25 off per hint, 10 at the floor), a token 10 for
 * finishing without solving, and nothing for a revealed answer.
 * Archive puzzles and Play again runs aren't recorded, so earn nothing.
 */
export function xpForPlay(play: Pick<SolveRecord, 'outcome' | 'hints'>): number {
  if (play.outcome === 'revealed') return 0;
  if (play.outcome === 'failed') return 10;
  return Math.max(10, 100 - 25 * (play.hints ?? 0));
}

export function totalXP(plays: Pick<PlayRecord, 'outcome' | 'hints'>[]): number {
  return plays.reduce((sum, p) => sum + xpForPlay(p), 0);
}

/** Level 1 at 0 XP, then each level takes a little longer: 50, 200, 450 … */
export function levelForXP(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1;
}
