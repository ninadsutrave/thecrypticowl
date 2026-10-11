-- ═══════════════════════════════════════════════════════════════════════════
-- 009 — Past puzzles are for members, in the database too
--
-- The archive page asked visitors to sign in, but the API served every past
-- puzzle to anyone with the public key. Now:
--
--   signed out → only puzzles whose date is "today" somewhere on Earth
--                (UTC−12 through UTC+14), so every visitor gets the day's
--                puzzle whatever their time zone
--   signed in  → every past puzzle too (the archive)
--   everyone   → nothing in the future (puzzle_unlocked_through, 008)
--
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- The earliest date that is still "today" somewhere: UTC−12. (POSIX zone
-- names flip the sign: Etc/GMT+12 is twelve hours behind UTC.)
CREATE OR REPLACE FUNCTION puzzle_open_from() RETURNS date
  LANGUAGE sql STABLE AS $$
  SELECT (now() AT TIME ZONE 'Etc/GMT+12')::date
$$;
GRANT EXECUTE ON FUNCTION puzzle_open_from() TO anon, authenticated, service_role;

-- Whether a puzzle dated `d` may be read by the caller.
CREATE OR REPLACE FUNCTION puzzle_readable(d date) RETURNS boolean
  LANGUAGE sql STABLE AS $$
  SELECT d <= puzzle_unlocked_through()
     AND (d >= puzzle_open_from() OR auth.uid() IS NOT NULL)
$$;
GRANT EXECUTE ON FUNCTION puzzle_readable(date) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "daily_puzzles_public_read" ON daily_puzzles;
CREATE POLICY "daily_puzzles_public_read"
  ON daily_puzzles FOR SELECT
  USING (published = true AND puzzle_readable(date));

DROP POLICY IF EXISTS "clues_public_read" ON clues;
CREATE POLICY "clues_public_read"
  ON clues FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM daily_puzzles
      WHERE clue_id = clues.id AND published = true AND puzzle_readable(date)
    )
  );

DROP POLICY IF EXISTS "clue_components_public_read" ON clue_components;
CREATE POLICY "clue_components_public_read"
  ON clue_components FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM daily_puzzles
      WHERE clue_id = clue_components.clue_id
        AND published = true
        AND puzzle_readable(date)
    )
  );

DROP POLICY IF EXISTS "game_puzzles_public_read" ON game_puzzles;
CREATE POLICY "game_puzzles_public_read"
  ON game_puzzles FOR SELECT
  USING (puzzle_readable(puzzle_date));
