import { useCallback, useEffect, useRef, useState } from 'react';
import { m } from 'motion/react';
import { ExternalLink, Lightbulb } from 'lucide-react';
import { Chess, type Square } from 'chess.js';
import { useDarkMode } from '../../context/DarkModeContext';
import { getTheme } from '../../theme';
import { GameShell, type PlayApi } from '../GameShell';
import { GameLoading } from '../GameLoading';
import { useDailyPuzzle } from '../useDailyPuzzle';
import { useGameState } from '../useGameState';
import { parseChess } from './parse';
import { SAMPLE_CHESS, type ChessPuzzle } from './sample';
import { getChessTutorial } from './tutorial';
import { BOARD_PALETTES, Board, type BoardCell, type BoardPalette } from './Board';
import { StoreKeys, readRaw, writeRaw } from '../../lib/localStore';

/** Delay before the computer plays its move, so the solver can follow it. */
const REPLY_DELAY_MS = 650;
export function ChessGame() {
  const { puzzle: puzzle, isPractice, loading } = useDailyPuzzle('chess', SAMPLE_CHESS, parseChess);
  if (loading || !puzzle) return <GameLoading gameId="chess" />;
  return (
    <GameShell
      gameId="chess"
      practice={isPractice}
      puzzleId={puzzle.source.id}
      subtitle={`Mate in ${puzzle.mateIn} · Medium`}
      tutorial={getChessTutorial(puzzle.mateIn)}
      rules={
        <>
          <p>
            Your opponent has just moved. Find the moves that force{' '}
            <strong>checkmate in {puzzle.mateIn}</strong>, whatever they reply. The computer plays
            their replies.
          </p>
          <p>
            Tap a piece, then a highlighted square. A wrong move is taken back and counted, but
            doesn't end the puzzle. Stuck? A hint shows you the next move.
          </p>
          <p>
            Puzzle{' '}
            <a
              href={puzzle.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline"
            >
              #{puzzle.source.id} <ExternalLink size={11} className="inline" />
            </a>{' '}
            from the Lichess puzzle database (CC0), rated {puzzle.source.rating}. Drag a piece, or
            tap it and then a highlighted square.
          </p>
          <p className="text-xs">Chess pieces: Chessnut by Alexis Luengas, Apache License 2.0.</p>
        </>
      }
    >
      {api => <ChessBoard puzzle={puzzle} api={api} />}
    </GameShell>
  );
}

function applyUci(game: Chess, move: string) {
  return game.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4] });
}

function ChessBoard({ puzzle, api }: { puzzle: ChessPuzzle; api: PlayApi }) {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  // How far through `puzzle.moves` we are. Saved, so a reload resumes the line.
  const [ply, setPly] = useGameState(api, 'ply', 0);
  const [mistakes, setMistakes] = useGameState(api, 'mistakes', 0);
  const [hints, setHints] = useGameState(api, 'hints', 0);
  // The ply whose move the last hint revealed, so a reload keeps showing it.
  const [hintPly, setHintPly] = useGameState<number | null>(api, 'hintPly', null);

  const game = useRef<Chess | null>(null);
  if (!game.current) {
    // Rebuild the saved position by replaying the line up to `ply`.
    const g = new Chess(puzzle.fen);
    puzzle.moves.slice(0, ply).forEach(mv => applyUci(g, mv));
    game.current = g;
  }
  const [, setFen] = useState(() => game.current!.fen());
  const [selected, setSelected] = useState<Square | null>(null);
  const [targets, setTargets] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<string | null>(() =>
    ply > 0 ? puzzle.moves[ply - 1] : null
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [palette, setPalette] = useState<BoardPalette>(() =>
    readRaw(StoreKeys.chessBoard) === 'owl' ? 'owl' : 'classic'
  );
  const switchPalette = (p: BoardPalette) => {
    setPalette(p);
    writeRaw(StoreKeys.chessBoard, p);
  };
  const [shake, setShake] = useState(0);

  // The solver plays the side to move *after* the setup move.
  const playerColor = puzzle.fen.split(' ')[1] === 'w' ? 'b' : 'w';
  const solverTurn = ply % 2 === 1 && ply < puzzle.moves.length && !api.finished;

  const playScripted = useCallback(
    (index: number) => {
      applyUci(game.current!, puzzle.moves[index]);
      setFen(game.current!.fen());
      setLastMove(puzzle.moves[index]);
      setPly(index + 1);
    },
    [puzzle.moves, setPly]
  );

  // Opponent moves: the setup move at ply 0, then each reply.
  useEffect(() => {
    if (api.finished || ply % 2 !== 0 || ply >= puzzle.moves.length) return;
    const id = setTimeout(() => playScripted(ply), ply === 0 ? 900 : REPLY_DELAY_MS);
    return () => clearTimeout(id);
  }, [ply, puzzle.moves.length, playScripted, api.finished]);

  const tryMove = (from: Square, to: Square) => {
    const g = game.current!;
    const expected = puzzle.moves[ply];
    const piece = g.get(from);
    const promoting = piece?.type === 'p' && (to[1] === '8' || to[1] === '1');
    const promotion = promoting ? (expected?.[4] ?? 'q') : undefined;

    g.move({ from, to, promotion });
    const finalMove = ply === puzzle.moves.length - 1;
    // Any mate on the last move counts — the Lichess convention.
    const accepted =
      `${from}${to}${promotion ?? ''}` === expected || (finalMove && g.isCheckmate());

    setSelected(null);
    setTargets([]);
    if (!accepted) {
      g.undo();
      setMistakes(n => n + 1);
      setShake(n => n + 1);
      setFeedback('Not the winning move. Look for something more forcing.');
      return;
    }
    setFeedback(null);
    setFen(g.fen());
    setLastMove(`${from}${to}`);
    setPly(ply + 1);
    if (finalMove) {
      const parts = [
        mistakes === 0 ? 'Perfect' : `${mistakes} wrong move${mistakes === 1 ? '' : 's'}`,
        hints > 0 ? `${hints} hint${hints === 1 ? '' : 's'}` : null,
      ];
      api.complete({
        outcome: 'solved',
        score: parts.filter(Boolean).join(' · '),
        hints,
        mistakes,
        details: { puzzleId: puzzle.source.id, mateIn: puzzle.mateIn },
        grid: `${'♟️'.repeat(puzzle.mateIn)}${mistakes ? ` ❌×${mistakes}` : ' ✨'}${hints ? ` 💡×${hints}` : ''}`,
      });
    }
  };

  const movable = (sq: Square) => solverTurn && game.current!.get(sq)?.color === playerColor;

  const select = (sq: Square | null) => {
    if (!sq || !movable(sq)) {
      setSelected(null);
      setTargets([]);
      return;
    }
    setSelected(sq);
    setTargets(game.current!.moves({ square: sq, verbose: true }).map(mv => mv.to));
  };

  const showHint = () => {
    if (!solverTurn || hintPly === ply) return;
    setHints(n => n + 1);
    setHintPly(ply);
  };

  const g = game.current;
  const board = g.board();
  const turn = g.turn();
  const checkSquare = g.inCheck()
    ? (board.flat().find(c => c?.type === 'k' && c.color === turn)?.square ?? null)
    : null;
  const hintActive = solverTurn && hintPly === ply;
  const hintMove = hintActive ? puzzle.moves[ply] : null;
  const hintSan = hintMove ? applyUci(new Chess(g.fen()), hintMove).san : null;
  const movesLeft = Math.ceil((puzzle.moves.length - ply) / 2);

  const side = playerColor === 'w' ? 'White' : 'Black';

  const status = api.finished
    ? 'Checkmate! ♛'
    : ply === 0
      ? 'Your opponent is moving…'
      : solverTurn
        ? `Your move as ${side}: mate in ${movesLeft}.`
        : 'Opponent is replying…';

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm font-extrabold" style={{ color: T.text }} role="status">
        {status}
      </p>

      <m.div
        key={shake}
        animate={shake ? { x: [0, -8, 8, -5, 5, 0] } : {}}
        transition={{ duration: 0.35 }}
        className="relative select-none"
        style={{
          width: 'min(100%, 440px)',
          aspectRatio: '1',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 0 0 4px rgba(76,53,128,0.35), 0 18px 40px -16px rgba(45,27,105,0.6)',
        }}
      >
        <Board
          board={board as (BoardCell | null)[][]}
          orientation={playerColor}
          interactive={solverTurn}
          movable={movable}
          selected={selected}
          targets={targets}
          lastMove={lastMove}
          checkSquare={checkSquare}
          hintSquares={
            hintMove ? [hintMove.slice(0, 2) as Square, hintMove.slice(2, 4) as Square] : []
          }
          onSelect={select}
          onMove={tryMove}
          palette={palette}
        />
      </m.div>

      {feedback && (
        <p
          className="text-sm font-bold rounded-xl px-3 py-2 border"
          style={{ background: T.wrongBg, borderColor: T.wrongBorder, color: T.text }}
        >
          {feedback}
        </p>
      )}

      {hintSan && (
        <p
          className="text-sm font-extrabold rounded-xl px-3 py-2 border"
          style={{ background: T.fodderBg, borderColor: T.streakBorder, color: T.text }}
        >
          💡 Next move: {hintSan}
        </p>
      )}

      <div
        className="flex items-center gap-1 rounded-full border p-1 text-xs font-extrabold"
        style={{ borderColor: T.cardBorder, background: T.cardBg }}
        role="radiogroup"
        aria-label="Board colours"
      >
        {(Object.keys(BOARD_PALETTES) as BoardPalette[]).map(p => (
          <button
            key={p}
            role="radio"
            aria-checked={palette === p}
            onClick={() => switchPalette(p)}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{
              background: palette === p ? T.brandSurface : 'transparent',
              color: palette === p ? T.brandText : T.textMuted,
            }}
          >
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{
                background: `linear-gradient(135deg, ${BOARD_PALETTES[p].light} 50%, ${BOARD_PALETTES[p].dark} 50%)`,
                border: `1px solid ${T.cardBorder}`,
              }}
              aria-hidden
            />
            {BOARD_PALETTES[p].label}
          </button>
        ))}
      </div>

      {!api.finished && (
        <button
          onClick={showHint}
          disabled={!solverTurn || hintActive}
          className="py-2.5 px-5 rounded-2xl border-2 flex items-center gap-2 text-sm font-extrabold disabled:opacity-40"
          style={{ borderColor: T.streakBorder, color: T.streakText, background: T.fodderBg }}
        >
          <Lightbulb size={15} />
          Hint: show the next move{hints > 0 ? ` (${hints} used)` : ''}
        </button>
      )}
    </div>
  );
}
