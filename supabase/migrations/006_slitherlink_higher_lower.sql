-- =============================================================================
-- 006 — Slitherlink and Higher or Lower join the lineup.
--
-- Shikaku left it again, but stays allowed: plays already recorded for it
-- must remain valid rows.
--
-- Idempotent: safe to run more than once.
-- =============================================================================

ALTER TABLE game_plays DROP CONSTRAINT IF EXISTS game_plays_game_check;
ALTER TABLE game_plays ADD CONSTRAINT game_plays_game_check CHECK (game IN (
  'sudoku', 'cryptic', 'what-am-i', 'trivia', 'chronology', 'chess', 'cryptogram',
  'shikaku', 'slitherlink', 'higher-lower'));

ALTER TABLE game_puzzles DROP CONSTRAINT IF EXISTS game_puzzles_game_check;
ALTER TABLE game_puzzles ADD CONSTRAINT game_puzzles_game_check CHECK (game IN (
  'sudoku', 'what-am-i', 'trivia', 'chronology', 'chess', 'cryptogram',
  'shikaku', 'slitherlink', 'higher-lower'));
