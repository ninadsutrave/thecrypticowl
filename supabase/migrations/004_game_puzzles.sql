-- =============================================================================
-- CrypticOwl — Migration 004: daily puzzles for every non-cryptic game
--
-- One row per (game, puzzle_date), written by that game's Lambda
-- (lambda/games/<game>/) with the service-role key, read by the browser with
-- the anon key. The cryptic clue keeps its own tables (clues, daily_puzzles).
--
-- Idempotent: safe to run more than once.
-- =============================================================================

CREATE TABLE IF NOT EXISTS game_puzzles (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  game         TEXT        NOT NULL CHECK (game IN (
                 'sudoku', 'what-am-i', 'trivia', 'chronology', 'chess', 'cryptogram')),
  puzzle_date  DATE        NOT NULL,
  -- The puzzle exactly as the frontend renders it (src/app/games/<game>/sample.ts
  -- documents each shape). Includes the solution: like the cryptic answer, it
  -- is visible to a determined solver, an accepted trade for an offline-capable
  -- casual game.
  payload      JSONB       NOT NULL,
  -- What the puzzle was built from (Lichess id, quote id, Wikipedia titles…),
  -- so generators never repeat a source.
  source_keys  TEXT[]      NOT NULL DEFAULT '{}',
  difficulty   TEXT        NOT NULL DEFAULT 'medium'
                 CHECK (difficulty IN ('easy', 'medium', 'hard')),
  -- 'algorithm', or '<generator provider> / judged by <judge provider>'.
  generator    TEXT,
  -- Reviewer checks and judge verdict, kept for auditing quality over time.
  review       JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (game, puzzle_date)
);

COMMENT ON TABLE game_puzzles IS
  'Daily puzzle per game and date, generated ahead by the per-game Lambdas.';

CREATE INDEX IF NOT EXISTS game_puzzles_game_date_idx
  ON game_puzzles (game, puzzle_date DESC);

-- "Has this Lichess puzzle / quote / article been used?"
CREATE INDEX IF NOT EXISTS game_puzzles_source_keys_idx
  ON game_puzzles USING GIN (source_keys);


-- ─── RLS ─────────────────────────────────────────────────────────────────────
-- Puzzles are generated days ahead. Readers may see up to tomorrow (UTC) —
-- enough for the furthest-ahead time zone's "today" — but not the buffer
-- beyond it, so the coming week's answers aren't a query away.

ALTER TABLE game_puzzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_puzzles FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "game_puzzles_public_read"   ON game_puzzles;
DROP POLICY IF EXISTS "game_puzzles_service_write" ON game_puzzles;

CREATE POLICY "game_puzzles_public_read"
  ON game_puzzles FOR SELECT
  USING (puzzle_date <= (now() AT TIME ZONE 'UTC')::date + 1);

CREATE POLICY "game_puzzles_service_write"
  ON game_puzzles FOR ALL
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

GRANT SELECT ON game_puzzles TO anon, authenticated;
GRANT ALL    ON game_puzzles TO service_role;
