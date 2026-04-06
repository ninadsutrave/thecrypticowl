-- ─────────────────────────────────────────────────────────────────────────────
-- CrypticOwl — Clue reactions
-- Stores per-user like/dislike feedback on each daily puzzle clue.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clue_reactions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  puzzle_number  integer     NOT NULL,
  reaction       text        NOT NULL CHECK (reaction IN ('like', 'dislike')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT clue_reactions_unique_per_user UNIQUE (user_id, puzzle_number)
);

ALTER TABLE clue_reactions ENABLE ROW LEVEL SECURITY;

-- Users can read/write only their own reactions
CREATE POLICY "clue_reactions_owner"
  ON clue_reactions FOR ALL
  USING (auth.uid() = user_id);

-- Aggregate view for clue authors — readable by anyone authenticated
-- (counts only, no user_id exposed)
CREATE OR REPLACE VIEW clue_reaction_counts AS
  SELECT
    puzzle_number,
    COUNT(*) FILTER (WHERE reaction = 'like')    AS likes,
    COUNT(*) FILTER (WHERE reaction = 'dislike') AS dislikes,
    COUNT(*)                                      AS total
  FROM clue_reactions
  GROUP BY puzzle_number;

GRANT SELECT ON clue_reaction_counts TO authenticated;

-- Index for fast per-puzzle aggregation
CREATE INDEX IF NOT EXISTS clue_reactions_puzzle_idx ON clue_reactions (puzzle_number);
