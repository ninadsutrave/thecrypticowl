-- =============================================================================
-- CrypticOwl — Migration 003: multi-game play history
--
-- One row per (user, game, puzzle date): the player's first finish of that
-- day's puzzle. Written by the browser (src/app/games/playHistory.ts), read
-- back by the history page and merged into the device copy on sign-in.
--
-- Separate from solve_history on purpose. solve_history is keyed by clue,
-- feeds XP and the cryptic streak through record_solve(), and is cryptic-only;
-- this table covers every game and carries no rewards, so a fabricated row
-- can only mislead its own author.
--
-- Idempotent: safe to run more than once.
-- =============================================================================

CREATE TABLE IF NOT EXISTS game_plays (
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game          TEXT        NOT NULL CHECK (game IN (
                  'sudoku', 'cryptic', 'what-am-i', 'trivia',
                  'chronology', 'chess', 'cryptogram')),
  -- The puzzle's date on the player's own calendar (puzzles roll over at
  -- local midnight), not the server's.
  puzzle_date   DATE        NOT NULL,
  outcome       TEXT        NOT NULL CHECK (outcome IN ('solved', 'failed', 'revealed')),
  -- Active solving time; the client clock pauses while the tab is hidden.
  seconds       INTEGER     NOT NULL CHECK (seconds > 0 AND seconds < 86400),
  hints_used    SMALLINT    NOT NULL DEFAULT 0 CHECK (hints_used BETWEEN 0 AND 1000),
  mistakes      SMALLINT    NOT NULL DEFAULT 0 CHECK (mistakes BETWEEN 0 AND 1000),
  score         TEXT        CHECK (char_length(score) <= 80),
  details       JSONB       NOT NULL DEFAULT '{}'::jsonb,
  completed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- First finish wins: replays never create a second row.
  PRIMARY KEY (user_id, game, puzzle_date)
);

COMMENT ON TABLE game_plays IS
  'Per-user play history across all daily games: first finish per game per day.';

-- The history page reads one user's plays newest first.
CREATE INDEX IF NOT EXISTS game_plays_user_date_idx
  ON game_plays (user_id, puzzle_date DESC);


-- ─── RLS ─────────────────────────────────────────────────────────────────────
-- Owner read and owner insert only. No UPDATE or DELETE policy: a recorded
-- play is final, and the client inserts with ON CONFLICT DO NOTHING.
-- Account deletion still removes rows through the ON DELETE CASCADE.

ALTER TABLE game_plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_plays FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "game_plays_owner_read"   ON game_plays;
DROP POLICY IF EXISTS "game_plays_owner_insert" ON game_plays;

CREATE POLICY "game_plays_owner_read"
  ON game_plays FOR SELECT
  USING (auth.uid() = user_id);

-- The date window stops obviously fabricated rows (far past or future)
-- while still letting a first sign-in upload the device's saved history,
-- which goes back up to 400 days.
CREATE POLICY "game_plays_owner_insert"
  ON game_plays FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND puzzle_date BETWEEN CURRENT_DATE - 400 AND CURRENT_DATE + 1
  );

GRANT SELECT, INSERT ON game_plays TO authenticated;
