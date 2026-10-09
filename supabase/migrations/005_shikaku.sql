-- =============================================================================
-- 005 — Shikaku joins the lineup.
--
-- game_plays and game_puzzles restrict `game` to the known games with an
-- inline CHECK (named <table>_game_check by Postgres). Both are replaced with
-- the list including 'shikaku'.
--
-- Idempotent: safe to run more than once.
-- =============================================================================

ALTER TABLE game_plays DROP CONSTRAINT IF EXISTS game_plays_game_check;
ALTER TABLE game_plays ADD CONSTRAINT game_plays_game_check CHECK (game IN (
  'sudoku', 'cryptic', 'what-am-i', 'trivia',
  'chronology', 'chess', 'cryptogram', 'shikaku'));

ALTER TABLE game_puzzles DROP CONSTRAINT IF EXISTS game_puzzles_game_check;
ALTER TABLE game_puzzles ADD CONSTRAINT game_puzzles_game_check CHECK (game IN (
  'sudoku', 'what-am-i', 'trivia', 'chronology', 'chess', 'cryptogram', 'shikaku'));
