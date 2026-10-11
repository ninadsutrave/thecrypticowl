-- ═══════════════════════════════════════════════════════════════════════════
-- 010 — Thumbs up / down for every game's puzzle
--
-- clue_reactions rates cryptic clues. This does the same for the other
-- games, whose puzzles live in game_puzzles keyed by (game, puzzle_date).
-- One vote per player per puzzle; a player reads and writes only their own
-- votes, and only on puzzles they can see (puzzle_readable, 009). Totals are
-- for the owner, read in the dashboard.
--
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS puzzle_reactions (
  user_id      UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game         TEXT          NOT NULL,
  puzzle_date  DATE          NOT NULL,
  reaction     clue_reaction NOT NULL,
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, game, puzzle_date),
  FOREIGN KEY (game, puzzle_date) REFERENCES game_puzzles (game, puzzle_date) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS pr_puzzle_idx ON puzzle_reactions (game, puzzle_date, reaction);

ALTER TABLE puzzle_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "puzzle_reactions_owner" ON puzzle_reactions;
CREATE POLICY "puzzle_reactions_owner"
  ON puzzle_reactions FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND puzzle_readable(puzzle_date));

REVOKE ALL ON puzzle_reactions FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON puzzle_reactions TO authenticated;

-- Likes and dislikes per puzzle, for the owner (service role / dashboard).
CREATE OR REPLACE VIEW puzzle_reaction_counts AS
SELECT
  game,
  puzzle_date,
  count(*) FILTER (WHERE reaction = 'like')    AS likes,
  count(*) FILTER (WHERE reaction = 'dislike') AS dislikes
FROM puzzle_reactions
GROUP BY game, puzzle_date;

REVOKE ALL ON puzzle_reaction_counts FROM anon, authenticated;
