import { getDBClient } from '../clients/dbClient.js';

/**
 * Persistence for every non-cryptic game: one row per (game, puzzle_date)
 * in `game_puzzles` (migration 004). The cryptic clue keeps its own tables.
 */

const TABLE = 'game_puzzles';

/** Postgres unique-violation SQLSTATE. */
const PG_UNIQUE_VIOLATION = '23505';

/** Which of `dates` already have a puzzle for `game`. */
export async function existingDates(game, dates, dbProvider = 'supabase') {
  const db = getDBClient(dbProvider);
  const { data, error } = await db
    .from(TABLE)
    .select('puzzle_date')
    .eq('game', game)
    .in('puzzle_date', dates);
  if (error) throw new Error(`existingDates(${game}): ${error.message}`);
  return new Set((data ?? []).map(r => r.puzzle_date));
}

/**
 * Source keys (Lichess ids, quote ids, Wikipedia titles…) used by `game`
 * since `sinceDate` (inclusive), or ever when it is null. Generators use
 * these to avoid repeating a puzzle.
 */
export async function usedSourceKeys(game, sinceDate = null, dbProvider = 'supabase') {
  const db = getDBClient(dbProvider);
  let query = db.from(TABLE).select('source_keys').eq('game', game);
  if (sinceDate) query = query.gte('puzzle_date', sinceDate);
  const { data, error } = await query;
  if (error) throw new Error(`usedSourceKeys(${game}): ${error.message}`);
  return new Set((data ?? []).flatMap(r => r.source_keys ?? []));
}

/**
 * Insert one day's puzzle. Returns { inserted: false } when another run won
 * the race for that date — not an error, the day is covered either way.
 */
export async function insertPuzzle(row, dbProvider = 'supabase') {
  const db = getDBClient(dbProvider);
  const { error } = await db.from(TABLE).insert(row);
  if (error) {
    if (error.code === PG_UNIQUE_VIOLATION) return { inserted: false };
    throw new Error(`insertPuzzle(${row.game} ${row.puzzle_date}): ${error.message}`);
  }
  return { inserted: true };
}
