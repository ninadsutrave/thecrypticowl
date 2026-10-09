import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { applyUci, isOnLine, pickReply, solverMoveCount } from './logic';
import { SAMPLE_CHESS } from './sample';

describe('isOnLine', () => {
  const line = ['a', 'b', 'c'];
  it('accepts any prefix of the line', () => {
    expect(isOnLine([], line)).toBe(true);
    expect(isOnLine(['a', 'b'], line)).toBe(true);
  });
  it('rejects a deviation or overrun', () => {
    expect(isOnLine(['a', 'x'], line)).toBe(false);
    expect(isOnLine(['a', 'b', 'c', 'd'], line)).toBe(false);
  });
});

describe('solverMoveCount', () => {
  it('skips the setup move and counts the solver moves', () => {
    expect(solverMoveCount(['setup'])).toBe(0);
    expect(solverMoveCount(['setup', 's1'])).toBe(1);
    expect(solverMoveCount(['setup', 's1', 'r1'])).toBe(1);
    expect(solverMoveCount(['setup', 's1', 'r1', 's2'])).toBe(2);
  });
});

describe('pickReply', () => {
  it('delivers mate when the defender has one', () => {
    // Black to move: Qh4 is mate (fool's mate).
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2';
    expect(pickReply(fen)).toBe('d8h4');
  });

  it('steps out of a mate in one rather than grabbing material', () => {
    // White to move. Black threatens ...Qxf2# (bishop c5 covers f2);
    // capturing on a6 would allow it, so the reply must defend.
    const fen = 'r1b1k1nr/pppp1ppp/b1n5/2b1p3/2B1P2q/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1';
    const reply = pickReply(fen)!;
    const game = new Chess(fen);
    applyUci(game, reply);
    const mates = game.moves({ verbose: true }).some(mv => {
      game.move(mv);
      const mate = game.isCheckmate();
      game.undo();
      return mate;
    });
    expect(mates).toBe(false);
  });

  it('wins a hanging queen when nothing is threatened', () => {
    const fen = '4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1';
    expect(pickReply(fen)).toBe('d1d5');
  });

  it('returns null when the side to move has no legal move', () => {
    const game = new Chess(SAMPLE_CHESS.fen);
    SAMPLE_CHESS.moves.forEach(mv => applyUci(game, mv));
    expect(pickReply(game.fen())).toBeNull();
  });
});
