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
 * Practice puzzle, shown when today's generated one is unavailable: a mate
 * in 4 (puzzle Sbhxq, 4,000+ plays), in the 4–6 range the daily ones use.
 * Checked by the Lambda's reviewer: the line ends in mate, and the position
 * has no mate in one or two.
 */
export const SAMPLE_CHESS: ChessPuzzle = {
  fen: '5r1k/4R1p1/Q3R2p/8/5pqP/6P1/4PPK1/1r6 w - - 0 37',
  moves: ['e6g6', 'f4f3', 'g2h2', 'b1h1', 'h2h1', 'g4h3', 'h1g1', 'h3g2'],
  mateIn: 4,
  source: { id: 'Sbhxq', rating: 1489, url: 'https://lichess.org/training/Sbhxq' },
};
