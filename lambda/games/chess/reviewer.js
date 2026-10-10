import { Chess } from 'chess.js';

/** Medium-hard: mate in 4 to 6. */
export const MATE_RANGE = [4, 6];

function play(game, uci) {
  return game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
}

function hasMateIn1(game) {
  return game.moves({ verbose: true }).some(m => {
    game.move(m);
    const mate = game.isCheckmate();
    game.undo();
    return mate;
  });
}

function hasMateIn2(game) {
  return game.moves({ verbose: true }).some(k => {
    game.move(k);
    if (game.isCheckmate()) {
      game.undo();
      return true;
    }
    const replies = game.moves({ verbose: true });
    const forced =
      replies.length > 0 &&
      replies.every(r => {
        game.move(r);
        const m = hasMateIn1(game);
        game.undo();
        return m;
      });
    game.undo();
    return forced;
  });
}

/**
 * Replay the line move by move: every move legal, it ends in checkmate, its
 * length matches the mate count, and there is no shorter mate the solver
 * could stumble on (a "mate in 3" with a mate in 2 is a broken puzzle).
 */
export function reviewChess(p) {
  const errors = [];
  if (p.mateIn < MATE_RANGE[0] || p.mateIn > MATE_RANGE[1]) {
    errors.push(`mate in ${p.mateIn} is outside ${MATE_RANGE.join('–')}`);
  }
  if (p.moves.length !== p.mateIn * 2) {
    errors.push(`line has ${p.moves.length} moves, expected ${p.mateIn * 2}`);
  }
  let game;
  try {
    game = new Chess(p.fen);
  } catch (err) {
    return { ok: false, errors: [`bad FEN: ${err.message}`] };
  }
  try {
    play(game, p.moves[0]);
    if (hasMateIn1(game) || hasMateIn2(game)) errors.push('position has a shorter mate');
    for (const mv of p.moves.slice(1)) play(game, mv);
    if (!game.isCheckmate()) errors.push('line does not end in checkmate');
  } catch (err) {
    errors.push(`illegal move in line: ${err.message}`);
  }
  return { ok: errors.length === 0, errors, checks: { mateIn: p.mateIn } };
}
