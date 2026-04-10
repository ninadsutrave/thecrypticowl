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
  author           TEXT,
  tags             TEXT[]             NOT NULL DEFAULT '{}',
  notes            TEXT,  -- internal only, never sent to the frontend

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

  -- Only populated when role = 'indicator'; NULL for all other roles.
  -- CHECK enforces the coupling so the data is always self-consistent.
  indicator_type TEXT REFERENCES clue_indicator_types(id),
  CHECK (
    (role = 'indicator' AND indicator_type IS NOT NULL)
    OR
    (role <> 'indicator' AND indicator_type IS NULL)
  ),

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
  c.author,

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
LEFT JOIN daily_puzzles        dp ON dp.clue_id = c.id
LEFT JOIN solve_history        sh ON sh.clue_id = c.id
LEFT JOIN clue_reaction_counts rc ON rc.clue_id = c.id
GROUP BY
  c.id, dp.date, c.primary_type, c.difficulty, c.author,
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
  -- Client's local date (ISO "YYYY-MM-DD"). Prefer this over CURRENT_DATE so that users
  -- in timezones ahead of UTC (e.g. IST = UTC+5:30) don't have their streak broken because
  -- the DB thinks it's still "yesterday". Falls back to CURRENT_DATE if omitted.
  p_client_date         DATE    DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public   -- locks the function to the public schema; prevents
                           -- search_path-based privilege escalation attacks
AS $$
DECLARE
  v_today     DATE    := COALESCE(p_client_date, CURRENT_DATE);
  v_last      DATE;
  v_streak    INTEGER;
  v_best      INTEGER;
BEGIN
  -- Insert solve record; silently skip if already solved
  INSERT INTO solve_history (
    user_id, clue_id, puzzle_number,
    hints_used, wrong_attempts, xp_earned, solve_time_seconds
  )
  VALUES (
    p_user_id, p_clue_id, p_puzzle_number,
    p_hints_used, p_wrong_attempts, p_xp_earned, p_solve_time_seconds
  )
  ON CONFLICT (user_id, clue_id) DO NOTHING;

  -- FOUND is set TRUE by INSERT when at least one row was inserted,
  -- FALSE when ON CONFLICT suppressed the insert (already solved).
  IF NOT FOUND THEN
    RETURN FALSE;  -- already recorded, nothing to update
  END IF;

  -- Ensure user_stats row exists
  INSERT INTO user_stats (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Read current streak state
  SELECT last_solved, streak_count, best_streak
  INTO   v_last, v_streak, v_best
  FROM   user_stats
  WHERE  user_id = p_user_id;

  -- Recalculate streak.
  -- NULL-safe: v_last IS NULL on a brand-new user_stats row (just inserted above).
  -- Without the IS NULL guard, CASE would fall through to ELSE anyway, but being
  -- explicit makes the intent clear and avoids any surprises if NULL comparison
  -- behaviour ever changes with future Postgres versions.
  v_streak := CASE
    WHEN v_last IS NULL        THEN 1              -- first solve ever
    WHEN v_last = v_today - 1  THEN v_streak + 1  -- consecutive day
    WHEN v_last = v_today      THEN v_streak       -- same day (idempotency edge case)
    ELSE                            1              -- streak broken
  END;

  v_best := GREATEST(v_best, v_streak);

  -- Atomic stats update
  UPDATE user_stats SET
    streak_count  = v_streak,
    best_streak   = v_best,
    last_solved   = v_today,
    total_solved  = total_solved + 1,
    xp            = xp + p_xp_earned
    -- level is intentionally omitted here: computed client-side from XP
    -- to stay in sync with the frontend formula without duplicating logic
  WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$$;

-- Allow authenticated users to call this function
GRANT EXECUTE ON FUNCTION record_solve TO authenticated;


-- ─── TRIGGERS ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
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

ALTER TABLE clues            ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_puzzles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE clue_components  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats       ENABLE ROW LEVEL SECURITY;
ALTER TABLE solve_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE clue_reactions   ENABLE ROW LEVEL SECURITY;

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
CREATE POLICY "clue_reactions_owner"
  ON clue_reactions FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "clue_reactions_authenticated_read"
  ON clue_reactions FOR SELECT USING (auth.role() = 'authenticated');

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
