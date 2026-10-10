import { Chess } from 'chess.js';
import { fetchJson } from '../../shared/runtime/http.js';

/**
 * Lichess puzzles (CC0, engine-verified by Stockfish). The public puzzle API
 * serves one puzzle per request filtered by theme, so the Lambda needs no
 * database import. One or two requests a day is far inside Lichess's limits.
 */

const API = 'https://lichess.org/api/puzzle';

/**
 * Mate lengths for medium-hard: 4 to 6 moves. The puzzle API has themes up
 * to mateIn5; longer mates only come from the general "mate" theme, so a
 * mate in 6 is drawn from there and anything shorter is rejected in review.
 */
const ANGLES = [
  ['mateIn4', 0.5],
  ['mateIn5', 0.35],
  ['mate', 0.15],
];

export function pickAngle(rng) {
  let r = rng.next();
  for (const [angle, w] of ANGLES) {
    if ((r -= w) <= 0) return angle;
  }
  return 'mateIn4';
}

export async function fetchPuzzle(angle, { fetcher = fetchJson } = {}) {
  return fetcher(`${API}/next?angle=${angle}&difficulty=normal`);
}

/**
 * Lichess API puzzle → the frontend's shape: the FEN before the opponent's
 * setup move, then [setup, solver, reply, …, mating move] in UCI.
 */
export function toPuzzle(api) {
  const sans = String(api?.game?.pgn ?? '')
    .split(/\s+/)
    .filter(Boolean);
  const ply = api?.puzzle?.initialPly;
  if (!sans.length || !Number.isInteger(ply) || ply >= sans.length) {
    throw new Error('Lichess response has no usable game');
  }
  const game = new Chess();
  for (let i = 0; i < ply; i++) game.move(sans[i]);
  const fen = game.fen();
  const setup = game.move(sans[ply]);
  const themes = api.puzzle.themes ?? [];
  const mateTheme = themes.find(t => /^mateIn\d$/.test(t));
  return {
    fen,
    moves: [`${setup.from}${setup.to}${setup.promotion ?? ''}`, ...api.puzzle.solution],
    mateIn: mateTheme ? Number(mateTheme.slice(6)) : Math.ceil(api.puzzle.solution.length / 2),
    source: {
      id: api.puzzle.id,
      rating: api.puzzle.rating,
      url: `https://lichess.org/training/${api.puzzle.id}`,
    },
    plays: api.puzzle.plays ?? 0,
  };
}
