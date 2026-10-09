import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { SAMPLE_CHESS } from './sample';

describe('the sample chess puzzle', () => {
  it('is a legal line that ends in checkmate', () => {
    const game = new Chess(SAMPLE_CHESS.fen);
    for (const mv of SAMPLE_CHESS.moves) {
      game.move({ from: mv.slice(0, 2), to: mv.slice(2, 4), promotion: mv[4] });
    }
    expect(game.isCheckmate()).toBe(true);
  });

  it('has one setup move plus two moves per mate step, less the last reply', () => {
    expect(SAMPLE_CHESS.moves).toHaveLength(1 + SAMPLE_CHESS.mateIn * 2 - 1);
  });
});
