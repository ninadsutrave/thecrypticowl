import { createGameHandler } from '../../shared/runtime/gameHandler.js';
import { judgeChess } from './judge.js';
import { fetchPuzzle, pickAngle, toPuzzle } from './lichess.js';
import { reviewChess } from './reviewer.js';

/**
 * Checkmate: no AI. A forced mate in 3–5 from the Lichess puzzle API,
 * re-verified move by move with chess.js, rated for medium. A Lichess
 * puzzle id is never reused.
 */
export const spec = {
  game: 'chess',
  label: 'Checkmate',
  maxAttempts: 8,
  generate: async ctx => {
    const angle = pickAngle(ctx.rng);
    const puzzle = toPuzzle(await fetchPuzzle(angle));
    const key = `lichess:${puzzle.source.id}`;
    if (ctx.used.has(key)) throw new Error(`Lichess puzzle ${puzzle.source.id} already used`);
    const { plays, ...payload } = puzzle;
    return {
      payload,
      plays,
      sourceKeys: [key],
      summary: `#${puzzle.source.id}, mate in ${puzzle.mateIn}, rated ${puzzle.source.rating}`,
    };
  },
  review: candidate => reviewChess(candidate.payload),
  judge: candidate => judgeChess(candidate),
};

export const handler = createGameHandler(spec);
