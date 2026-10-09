import { Chess, type Move } from 'chess.js';

export function applyUci(game: Chess, move: string) {
  return game.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4] });
}

export function toUci(move: Move) {
  return `${move.from}${move.to}${move.promotion ?? ''}`;
}

/** Whether every move played so far follows the puzzle's own line. */
export function isOnLine(history: readonly string[], line: readonly string[]) {
  return history.length <= line.length && history.every((mv, i) => mv === line[i]);
}

/**
 * How many moves the solver has made. The history starts with the
 * opponent's setup move, so the solver's moves sit at the odd indices.
 */
export function solverMoveCount(history: readonly string[]) {
  return Math.floor(history.length / 2);
}

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Material from `color`'s side of the board. */
function material(game: Chess, color: 'w' | 'b') {
  let total = 0;
  for (const row of game.board()) {
    for (const cell of row) {
      if (cell) total += (cell.color === color ? 1 : -1) * VALUE[cell.type];
    }
  }
  return total;
}

/** Whether the side to move has a move that mates at once. */
function hasMateInOne(game: Chess) {
  for (const mv of game.moves({ verbose: true })) {
    game.move(mv);
    const mate = game.isCheckmate();
    game.undo();
    if (mate) return true;
  }
  return false;
}

/**
 * The defender's reply once the solver has left the puzzle's line, where
 * there's no scripted answer. A shallow, deterministic search, enough to
 * make a wrong attack fail convincingly: mate the solver if possible, never
 * walk into a mate-in-one, otherwise come out of it with the most material
 * (a check breaks ties). Returns null when the defender has no legal move.
 */
export function pickReply(fen: string): string | null {
  const game = new Chess(fen);
  const me = game.turn();
  let best: { uci: string; score: number } | null = null;
  for (const mv of game.moves({ verbose: true })) {
    game.move(mv);
    let score: number;
    if (game.isCheckmate()) score = 10_000;
    else if (hasMateInOne(game)) score = -10_000;
    else score = material(game, me) * 10 + (game.inCheck() ? 1 : 0);
    game.undo();
    if (!best || score > best.score) best = { uci: toUci(mv), score };
  }
  return best?.uci ?? null;
}
