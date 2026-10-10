-- =============================================================================
-- 007 — Puzzle suggestions from the About page.
--
-- Anyone may suggest a puzzle, signed in or not. Nobody can read suggestions
-- through the public API: they are reviewed in the dashboard (service role).
-- No email is collected; a name is optional, and a signed-in suggester's
-- user id is kept only so their suggestions go if their account does.
--
-- Guards against abuse, since anonymous inserts are allowed:
--   - length limits on every field;
--   - a global throttle: at most 30 suggestions in any 10 minutes, so a
--     flood can't fill the free-tier database.
--
-- Idempotent: safe to run more than once.
-- =============================================================================

CREATE TABLE IF NOT EXISTS puzzle_suggestions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  idea        TEXT        NOT NULL CHECK (char_length(btrim(idea)) BETWEEN 10 AND 600),
  name        TEXT        CHECK (name IS NULL OR char_length(name) <= 60),
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  status      TEXT        NOT NULL DEFAULT 'new'
                          CHECK (status IN ('new', 'considering', 'added', 'declined')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE puzzle_suggestions IS
  'Puzzle types players would like added. Insert-only for the public; reviewed by the owner.';

CREATE INDEX IF NOT EXISTS puzzle_suggestions_created_idx
  ON puzzle_suggestions (created_at DESC);

-- ─── Throttle ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION puzzle_suggestions_throttle() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM puzzle_suggestions
      WHERE created_at > now() - interval '10 minutes') >= 30 THEN
    RAISE EXCEPTION 'Too many suggestions right now; please try again later.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS puzzle_suggestions_throttle ON puzzle_suggestions;
CREATE TRIGGER puzzle_suggestions_throttle
  BEFORE INSERT ON puzzle_suggestions
  FOR EACH ROW EXECUTE FUNCTION puzzle_suggestions_throttle();

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE puzzle_suggestions ENABLE ROW LEVEL SECURITY;

-- Insert only: new suggestions, as yourself or anonymously. No read policy,
-- so the public can't list them.
DROP POLICY IF EXISTS puzzle_suggestions_insert ON puzzle_suggestions;
CREATE POLICY puzzle_suggestions_insert ON puzzle_suggestions
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'new' AND (user_id IS NULL OR user_id = auth.uid()));

GRANT INSERT ON puzzle_suggestions TO anon, authenticated;
