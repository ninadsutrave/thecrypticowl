export interface ChessPuzzle {
  /** Position before the opponent's setup move (Lichess puzzle convention). */
  fen: string;
  /**
   * UCI moves. The first is the opponent's setup move; after that they
   * alternate solver move / opponent reply, ending on the mating move.
   */
  moves: string[];
  mateIn: number;
  source: { id: string; rating: number; url: string };
}

/**
 * Placeholder until the Lichess import ships: Lichess puzzle J588J (CC0),
 * rated 1380 — medium for a general audience.
 * After 25.Qxb7: 25…Qg5+ 26.f4 Qxf4+ 27.Rd2 Re1#.
 *
 * Re-checked with chess.js: the line ends in mate, and the starting position
 * has no mate in one or two.
 */
export const SAMPLE_CHESS: ChessPuzzle = {
  fen: '4r1k1/1pp2ppp/p7/q7/8/B4Q2/bPP2PPP/2KR1B1R w - - 9 25',
  moves: ['f3b7', 'a5g5', 'f2f4', 'g5f4', 'd1d2', 'e8e1'],
  mateIn: 3,
  source: { id: 'J588J', rating: 1380, url: 'https://lichess.org/training/J588J' },
};
