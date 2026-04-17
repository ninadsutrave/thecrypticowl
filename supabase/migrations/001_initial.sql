-- =============================================================================
-- CrypticOwl — Initial Schema
-- Run once on a fresh Supabase project:
--   supabase db push
--   — or paste into the Supabase SQL editor.
--
-- Table naming rationale:
--   clues         — the core clue entity (what ChatGPT calls "clues", not "puzzles")
--   daily_puzzles — maps a calendar date → one or more clues.
--                   Currently 1:1 (one clue per day), but the join table means
--                   adding multi-clue crossword sets later requires zero schema
--                   changes to the clues table itself.
-- =============================================================================


-- ─── LOOKUP TABLES (replace evolving enums) ──────────────────────────────────
-- TEXT lookup tables are easier to extend than PostgreSQL ENUMs.
-- Adding a new value = INSERT a row. No ALTER TYPE, no migration headache.

CREATE TABLE clue_wordplay_types (
  id          TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  description TEXT
);

INSERT INTO clue_wordplay_types (id, label, description) VALUES
  ('anagram',            'Anagram',            'Letters of the fodder rearranged'),
  ('reversal',           'Reversal',            'Word or phrase written backwards'),
  ('container',          'Container',           'One word placed inside another'),
  ('hidden',             'Hidden Word',         'Answer concealed within the clue text'),
  ('deletion',           'Deletion',            'Letters removed from a word'),
  ('initial_letters',    'Initial Letters',     'Answer spelled by the first letters of consecutive words'),
  ('final_letters',      'Final Letters',       'Answer spelled by the last letters of consecutive words'),
  ('alternating_letters','Alternating Letters', 'Answer spelled by odd- or even-indexed letters of a word or phrase'),
  ('spoonerism',         'Spoonerism',          'Initial sounds of two words swapped, Reverend-Spooner style'),
  ('charade',            'Charade',             'Parts read consecutively without a join indicator'),
  ('homophone',          'Homophone',           'Answer sounds like another word'),
  ('double_definition',  'Double Definition',   'Two separate definitions, no wordplay'),
  ('cryptic_definition', 'Cryptic Definition',  'Whole clue is a misleading definition'),
  ('andlit',             '& Lit',               'Whole clue is simultaneously wordplay and definition'),
  ('compound',           'Compound',            'Two or more wordplay types used together');


CREATE TABLE clue_indicator_types (
  id          TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  description TEXT
);

INSERT INTO clue_indicator_types (id, label, description) VALUES
  ('anagram',              'Anagram',              'Signals letters to rearrange (e.g. "mixed up", "broken")'),
  ('reversal',             'Reversal',             'Signals reading backwards (e.g. "back", "returning")'),
  ('container',            'Container',            'Signals insertion (e.g. "holding", "around", "outside")'),
  ('hidden',               'Hidden',               'Signals concealment (e.g. "in", "some of", "part of")'),
  ('deletion',             'Deletion',             'Signals letter removal (e.g. "mostly", "beheaded", "heartless")'),
  ('homophone',            'Homophone',            'Signals sounds-like (e.g. "we hear", "reportedly", "in speech")'),
  ('initial_letters',      'Initial Letters',      'Signals first letters (e.g. "initially", "leaders of")'),
  ('final_letters',        'Final Letters',        'Signals last letters (e.g. "ultimately", "ends of")'),
  ('alternating_letters',  'Alternating Letters',  'Signals odd/even letters (e.g. "regularly", "alternatively")'),
  ('spoonerism',           'Spoonerism',           'Signals swapped initial consonants');


-- Lookup tables are read-only reference data — publicly readable, never writable
-- by regular users. RLS is enabled for consistency; service_role handles writes.
ALTER TABLE clue_wordplay_types  ENABLE ROW LEVEL SECURITY;
ALTER TABLE clue_indicator_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clue_wordplay_types_public_read"
  ON clue_wordplay_types FOR SELECT USING (true);
CREATE POLICY "clue_wordplay_types_service_write"
  ON clue_wordplay_types FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "clue_indicator_types_public_read"
  ON clue_indicator_types FOR SELECT USING (true);
CREATE POLICY "clue_indicator_types_service_write"
  ON clue_indicator_types FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');


-- ─── STABLE ENUMS ────────────────────────────────────────────────────────────
-- These are closed sets unlikely to change. ENUMs are fine here.

CREATE TYPE clue_component_role AS ENUM (
  'definition',       -- the plain-English definition (exactly once per clue)
  'indicator',        -- signal word/phrase
  'fodder',           -- raw letters to be manipulated
  'container_outer',  -- outer wrapper in a container clue
  'container_inner',  -- word inserted inside in a container clue
  'link_word',        -- connecting filler (e.g. "to form", "giving", "makes")
  'result'            -- intermediate derived form (for multi-step explanations)
);

CREATE TYPE puzzle_difficulty AS ENUM ('easy', 'medium', 'hard', 'expert');

CREATE TYPE clue_reaction     AS ENUM ('like', 'dislike');


-- ─── AUTHORS ──────────────────────────────────────────────────────────────────
-- Table for storing clue authors (LLMs or humans).

CREATE TABLE authors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  email       TEXT UNIQUE,
  social_link TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authors_public_read" ON authors
  FOR SELECT USING (true);

CREATE POLICY "authors_service_all" ON authors
  FOR ALL USING (auth.role() = 'service_role');

GRANT SELECT ON authors TO anon, authenticated;

-- Seed authors
INSERT INTO authors (id, name, email, social_link) VALUES
  ('7211516e-e61b-410a-b31c-6a1651515151', 'Gemini',      'gemini@google.com',  'https://deepmind.google/technologies/gemini/'),
  ('0921516e-e61b-410a-b31c-6a1651515151', 'OpenAI',      'gpt@openai.com',    'https://openai.com/'),
  ('1211516e-e61b-410a-b31c-6a1651515151', 'Claude',      'claude@anthropic.com', 'https://anthropic.com/'),
  ('5211516e-e61b-410a-b31c-6a1651515151', 'Hugging Face', 'hf@huggingface.co', 'https://huggingface.co/')
ON CONFLICT (name) DO NOTHING;


-- ─── CLUES ───────────────────────────────────────────────────────────────────
-- One row = one cryptic clue.
-- All display data is denormalised here so the frontend never needs a join.
-- The structural breakdown lives in clue_components (the authoritative source).

CREATE TABLE clues (
  -- Identity
  id               UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  -- No published flag here — daily_puzzles.published controls visibility exclusively.
  -- A clue is live if and only if it has a published row in daily_puzzles.

  -- Core clue fields
  --
  -- clue_text is UNIQUE so cron/Lambda inserts can use ON CONFLICT (clue_text) DO NOTHING
  -- and never accidentally duplicate the same clue.
  clue_text        TEXT               NOT NULL UNIQUE,

  -- answer must be uppercase letters only, no spaces or hyphens.
  -- For multi-word answers, concatenate without spaces (e.g. "ROSEWATER").
  -- Use answer_pattern for the display form (e.g. "4,5").
  answer           TEXT               NOT NULL
                     CHECK (answer = upper(answer))
                     CHECK (answer ~ '^[A-Z]+$'),

  -- Total letter count across all words (derived, always correct for single and multi-word).
  answer_length    INTEGER            NOT NULL GENERATED ALWAYS AS (length(answer)) STORED,

  -- Display letter-count pattern shown at end of clue: "5", "3,4", "2-3", "4,4,4".
  -- For single-word answers this is just answer_length::text.
  -- Only digits, commas, and hyphens are valid — enforced by CHECK.
  answer_pattern   TEXT               NOT NULL
                     CHECK (answer_pattern ~ '^[0-9][0-9,\-]*$'),

  -- Wordplay metadata
  primary_type     TEXT               NOT NULL REFERENCES clue_wordplay_types(id),
  definition_text  TEXT               NOT NULL,  -- the plain definition portion
  wordplay_summary TEXT               NOT NULL,  -- one-liner shown after solve
                                                  -- e.g. "PEARS is an anagram of SPEAR"

  -- Frontend display data (denormalised for zero-join page loads)
  --
  -- clue_parts is the *display* representation — colour-coded segments.
  --   [{text, type: "definition"|"indicator"|"fodder"|"link"|null}]
  --   null = structural text (letter count, filler).
  --   ⚠ Treat as derived / cache of clue_components. clue_components is authoritative.
  --
  -- hints is the *pedagogical* representation — progressive hint cards shown to users.
  --   [{id, title, text, highlight, mascot_comment, color, bg, bg_dark, border}]
  clue_parts       JSONB              NOT NULL DEFAULT '[]'
                     CHECK (jsonb_typeof(clue_parts) = 'array'),
  hints            JSONB              NOT NULL DEFAULT '[]'
                     CHECK (jsonb_typeof(hints) = 'array'),

  -- Editorial
  difficulty       puzzle_difficulty  NOT NULL DEFAULT 'medium',
  author_id        UUID               REFERENCES authors(id),
  author           TEXT,              -- Legacy: stored author name if not in authors table
  tags             TEXT[]             NOT NULL DEFAULT '{}',
  notes            TEXT,  -- internal only, never sent to the frontend
  author_social    TEXT,  -- Legacy: Link to contributor's profile

  -- AI judge quality scores (populated by lambda at generation time)
  judge_score            SMALLINT,  -- overall 1–10 (9–10 = publishable in The Times)
  judge_surface_quality  SMALLINT,  -- surface reading score 1–5
  judge_wordplay_correct BOOLEAN,   -- wordplay is mechanically correct
  judge_indicator_fair   BOOLEAN,   -- indicator is a legitimate British cryptic signal

  created_at       TIMESTAMPTZ        NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ        NOT NULL DEFAULT now()
);

CREATE INDEX clues_type_idx       ON clues (primary_type);
CREATE INDEX clues_difficulty_idx ON clues (difficulty);
-- Prevents the same answer appearing twice with the same letter-count display.
-- Allows the same answer with a different pattern (e.g. "ROSEWATER (9)" vs "ROSE WATER (4,5)")
-- only if they are genuinely different clues.
CREATE UNIQUE INDEX clues_answer_pattern_idx ON clues (answer, answer_pattern);


-- ─── DAILY PUZZLES ───────────────────────────────────────────────────────────
-- Maps a calendar date to one or more clues.
-- Currently 1:1 (one clue per day = the daily cryptic clue game).
-- The join table exists so expanding to full crosswords (many clues per day)
-- later requires no changes to the clues table schema.
--
-- Frontend primary query path:
--   SELECT c.* FROM daily_puzzles dp JOIN clues c ON c.id = dp.clue_id
--   WHERE dp.date = CURRENT_DATE AND dp.published = true

CREATE TABLE daily_puzzles (
  id        UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  date      DATE     NOT NULL,
  clue_id   UUID     NOT NULL REFERENCES clues(id) ON DELETE CASCADE,
  published BOOLEAN  NOT NULL DEFAULT false,

  -- sequence_number supports ordered multi-clue sets (1 Across, 2 Down …)
  -- always 1 for the current single-clue-per-day format
  sequence_number SMALLINT NOT NULL DEFAULT 1,

  -- Global sequential puzzle number shown to users ("Puzzle #42").
  -- GENERATED BY DEFAULT AS IDENTITY: auto-increments when omitted, but accepts an explicit
  -- value when provided (useful for seeding historical data or the first puzzle).
  -- UNIQUE enforced separately so the constraint name is predictable.
  puzzle_number   INTEGER  GENERATED BY DEFAULT AS IDENTITY NOT NULL,

  UNIQUE (date, clue_id),
  UNIQUE (date, sequence_number),  -- prevents two clues with the same position on the same day
  UNIQUE (puzzle_number)           -- each puzzle number is issued exactly once
);

CREATE INDEX dp_date_published_idx  ON daily_puzzles (date)    WHERE published = true;
-- Supports the EXISTS subquery in clues/clue_components RLS policies.
-- Without this, every SELECT on clues scans daily_puzzles sequentially per row.
CREATE INDEX dp_clue_published_idx  ON daily_puzzles (clue_id) WHERE published = true;


-- ─── CLUE COMPONENTS ─────────────────────────────────────────────────────────
-- Normalised, one-row-per-ingredient breakdown of every clue.
-- This is the authoritative structural record. clue_parts JSONB is the display cache.
--
-- One clue can have:
--   MULTIPLE indicators (compound clues using two mechanisms)
--   MULTIPLE fodder pieces (charade: ROSE + SHIRE)
--   MULTIPLE container halves (container_outer + container_inner)

CREATE TABLE clue_components (
  id             UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  clue_id        UUID                NOT NULL REFERENCES clues(id) ON DELETE CASCADE,

  -- 1-based. Defines left-to-right reading order for charades and compound clues.
  step_order     SMALLINT            NOT NULL,

  role           clue_component_role NOT NULL,

  -- Text as it literally appears in the clue string
  clue_text      TEXT                NOT NULL,

  -- What this component evaluates to after manipulation (null for indicators / link words)
  -- e.g. fodder "PEARS" → derived_text "SPEAR" after applying the anagram indicator
  derived_text   TEXT,

  -- Populated for indicator components when the sub-type is known.
  -- Non-indicator components must leave this NULL.
  -- Note: indicator_type is optional even for indicators — charade, double_definition,
  -- cryptic_definition, andlit, and compound clues may have no classified indicator type.
  indicator_type TEXT REFERENCES clue_indicator_types(id),
  CHECK (role = 'indicator' OR indicator_type IS NULL),

  -- Plain-English explanation shown in the admin / clue-authoring UI
  explanation    TEXT,

  created_at     TIMESTAMPTZ         NOT NULL DEFAULT now(),

  -- Prevents duplicate steps for the same clue
  UNIQUE (clue_id, step_order)
);

CREATE INDEX cc_clue_order_idx ON clue_components (clue_id, step_order);


-- ─── USER STATS ──────────────────────────────────────────────────────────────
-- One row per authenticated user. Written only via record_solve() below
-- to stay consistent with solve_history.

CREATE TABLE user_stats (
  user_id        UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  streak_count   INTEGER     NOT NULL DEFAULT 0,
  best_streak    INTEGER     NOT NULL DEFAULT 0,
  last_solved    DATE,
  total_solved   INTEGER     NOT NULL DEFAULT 0,
  xp             INTEGER     NOT NULL DEFAULT 0,
  level          SMALLINT    NOT NULL DEFAULT 1,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ─── SOLVE HISTORY ───────────────────────────────────────────────────────────
-- One row per (user, clue). Written only via record_solve() to stay
-- consistent with user_stats.

CREATE TABLE solve_history (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES auth.users(id)  ON DELETE CASCADE,
  clue_id             UUID        NOT NULL REFERENCES clues(id)       ON DELETE CASCADE,
  puzzle_number       INTEGER     NOT NULL,  -- denormalised: avoids joining clues just to display "#42"
  hints_used          SMALLINT    NOT NULL DEFAULT 0 CHECK (hints_used >= 0),
  wrong_attempts      INTEGER     NOT NULL DEFAULT 0 CHECK (wrong_attempts >= 0),
  xp_earned           INTEGER     NOT NULL DEFAULT 0,
  solve_time_seconds  INTEGER     CHECK (solve_time_seconds > 0),

  solved_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, clue_id)
);

CREATE INDEX sh_user_solved_at_idx ON solve_history (user_id, solved_at DESC);
CREATE INDEX sh_clue_hints_idx     ON solve_history (clue_id, hints_used);
-- Dedicated FK index for ON DELETE CASCADE and join performance.
-- sh_clue_hints_idx covers clue_id as its leading column but is wider;
-- this smaller index is faster for pure clue_id lookups (e.g. cascade deletes).
CREATE INDEX sh_clue_idx           ON solve_history (clue_id);


-- ─── CLUE REACTIONS ──────────────────────────────────────────────────────────

CREATE TABLE clue_reactions (
  user_id     UUID           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clue_id     UUID           NOT NULL REFERENCES clues(id)      ON DELETE CASCADE,
  reaction    clue_reaction  NOT NULL,
  updated_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),

  PRIMARY KEY (user_id, clue_id)
);

CREATE INDEX cr_clue_reaction_idx ON clue_reactions (clue_id, reaction);


-- ─── APP LIKES ───────────────────────────────────────────────────────────────
-- Global "Like" counter for the entire application.
-- These are purely anonymous. We use row count to track total appreciation.

CREATE TABLE app_likes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE app_likes ENABLE ROW LEVEL SECURITY;

-- Anyone can insert an anonymous like
CREATE POLICY "app_likes_insert" ON app_likes
  FOR INSERT WITH CHECK (true);

-- Anyone can read the total count
CREATE POLICY "app_likes_public_read" ON app_likes
  FOR SELECT USING (true);

-- Grant access to anon and authenticated
GRANT SELECT, INSERT ON app_likes TO anon, authenticated;

-- Helper view for total count
CREATE OR REPLACE VIEW app_likes_count AS
  SELECT count(*) as total_likes FROM app_likes;

GRANT SELECT ON app_likes_count TO anon, authenticated;


-- ─── CLUE SUBMISSIONS ────────────────────────────────────────────────────────
-- Clues submitted by users for review.

CREATE TYPE submission_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE clue_submissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clue_text         TEXT NOT NULL,
  answer            TEXT NOT NULL,
  answer_pattern    TEXT NOT NULL,
  primary_type      TEXT REFERENCES clue_wordplay_types(id),
  definition_text   TEXT NOT NULL,
  wordplay_summary  TEXT NOT NULL,
  fodder            TEXT,
  indicator         TEXT,
  explanation       TEXT NOT NULL,
  
  -- Contributor info
  author_name       TEXT NOT NULL,
  author_email      TEXT NOT NULL,
  author_social     TEXT, -- Link to Twitter/X, Website, etc.

  status            submission_status NOT NULL DEFAULT 'pending',
  admin_notes       TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE clue_submissions ENABLE ROW LEVEL SECURITY;

-- Users can insert their own submissions
CREATE POLICY "clue_submissions_insert" ON clue_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can see their own submissions
CREATE POLICY "clue_submissions_owner_read" ON clue_submissions
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can do everything (for admin functions)
CREATE POLICY "clue_submissions_service_all" ON clue_submissions
  FOR ALL USING (auth.role() = 'service_role');

GRANT SELECT, INSERT ON clue_submissions TO authenticated;


-- ─── ADMIN FUNCTIONS ─────────────────────────────────────────────────────────

-- Approves a submission and schedules it as a daily puzzle.
-- Must be called by a superuser/service_role or a designated admin.
CREATE OR REPLACE FUNCTION approve_clue_submission(
  p_submission_id   UUID,
  p_publish_date    DATE,
  p_puzzle_number   INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clue_id UUID;
  v_sub RECORD;
BEGIN
  -- Load submission data
  SELECT * INTO v_sub FROM clue_submissions WHERE id = p_submission_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;
  IF v_sub.status <> 'pending' THEN RAISE EXCEPTION 'Submission already processed'; END IF;

  -- 1. Insert into main clues table
  INSERT INTO clues (
    clue_text, answer, answer_pattern,
    primary_type, definition_text, wordplay_summary,
    difficulty, author, author_social
  ) VALUES (
    v_sub.clue_text, v_sub.answer, v_sub.answer_pattern,
    v_sub.primary_type, v_sub.definition_text, v_sub.wordplay_summary,
    'medium', v_sub.author_name, v_sub.author_social
  ) RETURNING id INTO v_clue_id;

  -- 2. Schedule in daily_puzzles
  INSERT INTO daily_puzzles (date, clue_id, puzzle_number, published)
  VALUES (p_publish_date, v_clue_id, p_puzzle_number, true);

  -- 3. Update submission status
  UPDATE clue_submissions SET status = 'approved' WHERE id = p_submission_id;

  RETURN v_clue_id;
END;
$$;


-- ─── PERMISSIONS ─────────────────────────────────────────────────────────────

-- Grant usage on public schema to all roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Ensure all tables are readable by anon (via RLS)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

-- Ensure authenticated users and service_role can insert/update where allowed by RLS
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;

-- Ensure sequences are usable
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon, service_role;


-- ─── VIEWS ───────────────────────────────────────────────────────────────────

-- Aggregate reaction counts per clue (no user_id exposed)
CREATE VIEW clue_reaction_counts AS
SELECT
  clue_id,
  COUNT(*) FILTER (WHERE reaction = 'like')    AS likes,
  COUNT(*) FILTER (WHERE reaction = 'dislike') AS dislikes,
  COUNT(*)                                      AS total
FROM clue_reactions
GROUP BY clue_id;

-- anon can read aggregate counts (no user_id exposed); authenticated inherits
GRANT SELECT ON clue_reaction_counts TO anon, authenticated;


-- Per-clue solve analytics for clue authors and an admin dashboard.
CREATE VIEW clue_solve_stats AS
SELECT
  c.id                                                      AS clue_id,
  dp.date,
  c.primary_type,
  c.difficulty,
  COALESCE(a.name, c.author)                                AS author,

  COUNT(DISTINCT sh.user_id)                                AS total_solves,

  -- Hint funnel
  COUNT(*) FILTER (WHERE sh.hints_used >= 1)               AS hint_1_opens,
  COUNT(*) FILTER (WHERE sh.hints_used >= 2)               AS hint_2_opens,
  COUNT(*) FILTER (WHERE sh.hints_used >= 3)               AS hint_3_opens,
  COUNT(*) FILTER (WHERE sh.hints_used >= 4)               AS hint_4_opens,

  -- Difficulty signals
  ROUND(AVG(sh.hints_used)::NUMERIC,            2)         AS avg_hints_used,
  ROUND(AVG(sh.solve_time_seconds)::NUMERIC,    0)         AS avg_solve_seconds,
  ROUND(AVG(sh.wrong_attempts)::NUMERIC,        2)         AS avg_wrong_attempts,
  COUNT(*) FILTER (WHERE sh.hints_used = 0)                AS zero_hint_solves,

  -- Quality signals
  COALESCE(rc.likes,    0)                                  AS likes,
  COALESCE(rc.dislikes, 0)                                  AS dislikes,
  CASE
    WHEN COALESCE(rc.total, 0) = 0 THEN NULL
    ELSE ROUND(rc.likes * 100.0 / rc.total, 1)
  END                                                       AS like_pct

FROM clues c
LEFT JOIN authors              a  ON a.id = c.author_id
LEFT JOIN daily_puzzles        dp ON dp.clue_id = c.id
LEFT JOIN solve_history        sh ON sh.clue_id = c.id
LEFT JOIN clue_reaction_counts rc ON rc.clue_id = c.id
GROUP BY
  c.id, dp.date, c.primary_type, c.difficulty, a.name, c.author,
  rc.likes, rc.dislikes, rc.total;

GRANT SELECT ON clue_solve_stats TO authenticated;


-- ─── TRANSACTIONAL SOLVE FUNCTION ────────────────────────────────────────────
-- Atomically inserts a solve record and updates user_stats in one transaction.
-- Call this from the frontend via supabase.rpc('record_solve', {...})
-- instead of making two separate upserts — prevents stats drift.
--
-- Returns TRUE if this was a new solve, FALSE if already solved (idempotent).

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
  -- 🔐 NEW: enforce caller identity (critical)
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_xp_earned < 0 OR p_xp_earned > 100 THEN
    RAISE EXCEPTION 'invalid xp';
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

-- 🔐 CRITICAL: remove public access, then re-grant
REVOKE ALL ON FUNCTION record_solve FROM PUBLIC;
REVOKE ALL ON clues            FROM PUBLIC;
REVOKE ALL ON daily_puzzles    FROM PUBLIC;
REVOKE ALL ON clue_components  FROM PUBLIC;
REVOKE ALL ON user_stats       FROM PUBLIC;
REVOKE ALL ON solve_history    FROM PUBLIC;
REVOKE ALL ON clue_reactions   FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_solve TO authenticated;

REVOKE ALL ON clue_reaction_counts FROM PUBLIC;
GRANT SELECT ON clue_reaction_counts TO anon, authenticated;

REVOKE ALL ON clue_solve_stats FROM PUBLIC;
GRANT SELECT ON clue_solve_stats TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- ─── TRIGGERS ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public   -- 🔐 added
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER clues_set_updated_at
  BEFORE UPDATE ON clues
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER user_stats_set_updated_at
  BEFORE UPDATE ON user_stats
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────────

-- ENABLE activates RLS for anon/authenticated roles (policies become enforced).
-- FORCE additionally prevents the table owner / service_role from bypassing RLS.
-- Both are required: FORCE alone does not activate RLS for regular roles.
ALTER TABLE clues            ENABLE ROW LEVEL SECURITY;
ALTER TABLE clues            FORCE  ROW LEVEL SECURITY;

ALTER TABLE daily_puzzles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_puzzles    FORCE  ROW LEVEL SECURITY;

ALTER TABLE clue_components  ENABLE ROW LEVEL SECURITY;
ALTER TABLE clue_components  FORCE  ROW LEVEL SECURITY;

ALTER TABLE user_stats       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats       FORCE  ROW LEVEL SECURITY;

ALTER TABLE solve_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE solve_history    FORCE  ROW LEVEL SECURITY;

ALTER TABLE clue_reactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE clue_reactions   FORCE  ROW LEVEL SECURITY;

-- clues: readable only when the clue is scheduled in a published daily_puzzle.
-- daily_puzzles.published is the single source of truth for visibility.
CREATE POLICY "clues_public_read"
  ON clues FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM daily_puzzles
      WHERE clue_id = clues.id AND published = true
    )
  );

-- WITH CHECK mirrors USING for write operations (INSERT/UPDATE).
-- Without it, USING only gates reads — a write could bypass the predicate entirely.
CREATE POLICY "clues_service_write"
  ON clues FOR ALL
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- daily_puzzles: published rows are publicly readable
CREATE POLICY "daily_puzzles_public_read"
  ON daily_puzzles FOR SELECT USING (published = true);

CREATE POLICY "daily_puzzles_service_write"
  ON daily_puzzles FOR ALL
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- clue_components: readable when the parent clue is visible (i.e. scheduled + published)
CREATE POLICY "clue_components_public_read"
  ON clue_components FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM daily_puzzles
      WHERE clue_id = clue_components.clue_id AND published = true
    )
  );

CREATE POLICY "clue_components_service_write"
  ON clue_components FOR ALL
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- user_stats: own row only.
-- WITH CHECK prevents a user from inserting/updating a row belonging to another user_id.
CREATE POLICY "user_stats_owner"
  ON user_stats FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- solve_history: own rows only.
-- WITH CHECK prevents fabricating solve records for other users.
CREATE POLICY "solve_history_owner"
  ON solve_history FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- clue_reactions: own row; any authenticated user can read (for aggregate counts).
-- WITH CHECK prevents reacting on behalf of another user.
DROP POLICY IF EXISTS "clue_reactions_authenticated_read" ON clue_reactions;

CREATE POLICY "clue_reactions_owner_read"
  ON clue_reactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "clue_reactions_service_write"
  ON clue_reactions FOR ALL
  USING     (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ─── SEED: PUZZLE #1 ─────────────────────────────────────────────────────────

INSERT INTO clues (
  clue_text, answer, answer_pattern,
  primary_type, definition_text, wordplay_summary,
  difficulty, clue_parts, hints
) VALUES (
  'Stone broken becomes musical sounds (5)',
  'TONES',
  '5',
  'anagram',
  'musical sounds',
  'STONE is an anagram of TONES',
  'easy',
  '[
    {"text": "Stone",            "type": "fodder"},
    {"text": " broken ",        "type": "indicator"},
    {"text": "becomes ",        "type": "link"},
    {"text": "musical sounds",  "type": "definition"},
    {"text": " (5)",            "type": null}
  ]',
  '[
    {
      "id": 1,
      "title": "Definition Location",
      "text": "The definition is at the end of the clue: ''musical sounds''.",
      "highlight": "musical sounds",
      "mascot_comment": "The definition is always at the start or end of a cryptic clue. It''s at the end here! 👀",
      "color": "#3B82F6", "bg": "#EFF6FF", "bg_dark": "#0D1F35", "border": "#93C5FD"
    },
    {
      "id": 2,
      "title": "Spot the Indicator",
      "text": "\"Broken\" is an anagram indicator — it tells you the letters need rearranging.",
      "highlight": "broken",
      "mascot_comment": "\"Broken\" signals an anagram — the letters are being scrambled! 🔀",
      "color": "#7C3AED", "bg": "#F5F3FF", "bg_dark": "#1A0F35", "border": "#C4B5FD"
    },
    {
      "id": 3,
      "title": "Find the Fodder",
      "text": "\"Stone\" is the fodder — these 5 letters need to be rearranged!",
      "highlight": "Stone",
      "mascot_comment": "S-T-O-N-E... shuffle these letters to find a musical word! ✨",
      "color": "#F97316", "bg": "#FFF7ED", "bg_dark": "#2A1505", "border": "#FED7AA"
    },
    {
      "id": 4,
      "title": "Full Breakdown",
      "text": "Rearrange the letters of STONE to get a 5-letter word meaning musical sounds. Think notes, pitches...",
      "highlight": null,
      "mascot_comment": "S-T-O-N-E → _ _ _ _ _ 🎯 You''ve got all the pieces!",
      "color": "#059669", "bg": "#ECFDF5", "bg_dark": "#062010", "border": "#6EE7B7"
    }
  ]'
) ON CONFLICT (clue_text) DO NOTHING;

-- Daily puzzle entry for #1
INSERT INTO daily_puzzles (date, clue_id, published, sequence_number, puzzle_number)
SELECT '2026-04-09', id, true, 1, 1
FROM   clues
WHERE  clue_text = 'Stone broken becomes musical sounds (5)'
ON CONFLICT (date, sequence_number) DO NOTHING;

-- Clue components for #1
INSERT INTO clue_components (clue_id, step_order, role, clue_text, derived_text, indicator_type, explanation)
SELECT
  c.id,
  v.step_order,
  v.role::clue_component_role,
  v.clue_text,
  v.derived_text,
  v.indicator_type,
  v.explanation
FROM clues c
CROSS JOIN (
  VALUES
    (1, 'definition', 'musical sounds', 'TONES', NULL,      'TONES = musical sounds (plain definition)'),
    (2, 'indicator',  'broken',          NULL,   'anagram',  '"broken" signals an anagram'),
    (3, 'fodder',     'Stone',           'TONES', NULL,      'STONE → rearrange all 5 letters → TONES')
) AS v(step_order, role, clue_text, derived_text, indicator_type, explanation)
WHERE c.clue_text = 'Stone broken becomes musical sounds (5)'
ON CONFLICT (clue_id, step_order) DO NOTHING;
