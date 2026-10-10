-- ═══════════════════════════════════════════════════════════════════════════
-- 008 · Hardening
--
-- 1. Future puzzles stay hidden. Puzzles are generated up to a week ahead,
--    and the cryptic one was readable (answer included) the moment it was
--    written. Now a puzzle unlocks when its date has begun anywhere on Earth:
--    the earliest time zone is UTC+14 (Kiritimati), so nobody waits past
--    their own midnight and nobody sees a day before it has started.
-- 2. Clue ratings actually save. clue_reactions only allowed service_role
--    writes, so every 👍/👎 was denied while the widget said "Thanks!".
-- 3. record_solve checks what the browser sends: the date must be within a
--    day of the server's (every real time zone is), the clue must be that
--    day's puzzle, and hint and attempt counts must be sane.
-- 4. app_likes can't be flooded: a global throttle, and the server sets the
--    timestamp.
-- 5. clues.notes is internal: column privileges now keep it out of the API.
-- 6. clue_solve_stats (per-clue dates and types, future ones included) is
--    for the owner in the dashboard, not every signed-in user.
--
-- Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- The latest date that has begun somewhere: UTC+14.
CREATE OR REPLACE FUNCTION puzzle_unlocked_through() RETURNS date
  LANGUAGE sql STABLE AS $$
  SELECT (now() AT TIME ZONE 'Pacific/Kiritimati')::date
$$;
GRANT EXECUTE ON FUNCTION puzzle_unlocked_through() TO anon, authenticated, service_role;

-- ─── 1. Future puzzles ───────────────────────────────────────────────────────

DROP POLICY IF EXISTS "daily_puzzles_public_read" ON daily_puzzles;
CREATE POLICY "daily_puzzles_public_read"
  ON daily_puzzles FOR SELECT
  USING (published = true AND date <= puzzle_unlocked_through());

DROP POLICY IF EXISTS "clues_public_read" ON clues;
CREATE POLICY "clues_public_read"
  ON clues FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM daily_puzzles
      WHERE clue_id = clues.id AND published = true AND date <= puzzle_unlocked_through()
    )
  );

DROP POLICY IF EXISTS "clue_components_public_read" ON clue_components;
CREATE POLICY "clue_components_public_read"
  ON clue_components FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM daily_puzzles
      WHERE clue_id = clue_components.clue_id
        AND published = true
        AND date <= puzzle_unlocked_through()
    )
  );

DROP POLICY IF EXISTS "game_puzzles_public_read" ON game_puzzles;
CREATE POLICY "game_puzzles_public_read"
  ON game_puzzles FOR SELECT
  USING (puzzle_date <= puzzle_unlocked_through());

-- ─── 2. Clue ratings ─────────────────────────────────────────────────────────

-- Own rows, on clues that are out.
DROP POLICY IF EXISTS "clue_reactions_owner_write" ON clue_reactions;
CREATE POLICY "clue_reactions_owner_write"
  ON clue_reactions FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM daily_puzzles
      WHERE clue_id = clue_reactions.clue_id
        AND published = true
        AND date <= puzzle_unlocked_through()
    )
  );
GRANT SELECT, INSERT, UPDATE, DELETE ON clue_reactions TO authenticated;

-- ─── 3. record_solve ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION record_solve(
  p_user_id             UUID,
  p_clue_id             UUID,
  p_puzzle_number       INTEGER,
  p_hints_used          SMALLINT,
  p_wrong_attempts      INTEGER,
  p_xp_earned           INTEGER,
  p_solve_time_seconds  INTEGER DEFAULT NULL,
  p_client_date         DATE    DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today     DATE    := COALESCE(p_client_date, CURRENT_DATE);
  v_last      DATE;
  v_streak    INTEGER;
  v_best      INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_xp_earned < 0 OR p_xp_earned > 100 THEN
    RAISE EXCEPTION 'invalid xp';
  END IF;

  -- Every real time zone is within a day of UTC.
  IF abs(v_today - CURRENT_DATE) > 1 THEN
    RAISE EXCEPTION 'invalid date';
  END IF;

  IF p_hints_used NOT BETWEEN 0 AND 10
     OR p_wrong_attempts < 0
     OR p_solve_time_seconds < 0 THEN
    RAISE EXCEPTION 'invalid counts';
  END IF;

  -- Only that day's puzzle counts towards a streak (not an archive clue).
  IF NOT EXISTS (
    SELECT 1 FROM daily_puzzles
    WHERE clue_id = p_clue_id
      AND puzzle_number = p_puzzle_number
      AND published = true
      AND abs(date - v_today) <= 1
  ) THEN
    RAISE EXCEPTION 'not the day''s puzzle';
  END IF;

  INSERT INTO solve_history (
    user_id, clue_id, puzzle_number,
    hints_used, wrong_attempts, xp_earned, solve_time_seconds, solved_at
  )
  VALUES (
    p_user_id, p_clue_id, p_puzzle_number,
    p_hints_used, p_wrong_attempts, p_xp_earned, p_solve_time_seconds,
    CASE WHEN p_client_date IS NOT NULL THEN p_client_date::timestamptz ELSE now() END
  )
  ON CONFLICT (user_id, clue_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  INSERT INTO user_stats (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT last_solved, streak_count, best_streak
  INTO   v_last, v_streak, v_best
  FROM   user_stats
  WHERE  user_id = p_user_id;

  v_streak := CASE
    WHEN v_last IS NULL        THEN 1
    WHEN v_last = v_today - 1  THEN v_streak + 1
    WHEN v_last = v_today      THEN v_streak
    ELSE                            1
  END;

  v_best := GREATEST(v_best, v_streak);

  UPDATE user_stats SET
    streak_count  = v_streak,
    best_streak   = v_best,
    last_solved   = v_today,
    total_solved  = total_solved + 1,
    xp            = xp + p_xp_earned
  WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION record_solve FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_solve TO authenticated;

-- ─── 4. app_likes ────────────────────────────────────────────────────────────

-- The server stamps the time, and a burst past 30 likes a minute (from
-- everyone together, far above real use) is refused.
CREATE OR REPLACE FUNCTION app_likes_throttle() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.created_at := now();
  IF (SELECT count(*) FROM app_likes WHERE created_at > now() - interval '1 minute') >= 30 THEN
    RAISE EXCEPTION 'too many likes right now' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS app_likes_throttle ON app_likes;
CREATE TRIGGER app_likes_throttle
  BEFORE INSERT ON app_likes
  FOR EACH ROW EXECUTE FUNCTION app_likes_throttle();

CREATE INDEX IF NOT EXISTS app_likes_created_at_idx ON app_likes (created_at);

-- ─── 5. clues.notes ──────────────────────────────────────────────────────────

-- Table-level SELECT covers every column; swap it for every column but notes.
REVOKE SELECT ON clues FROM anon, authenticated;
DO $$
DECLARE cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
  INTO cols
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'clues' AND column_name <> 'notes';
  EXECUTE format('GRANT SELECT (%s) ON clues TO anon, authenticated', cols);
END;
$$;

-- ─── 6. clue_solve_stats ─────────────────────────────────────────────────────

REVOKE SELECT ON clue_solve_stats FROM authenticated;
