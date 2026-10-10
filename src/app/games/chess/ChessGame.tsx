import { useCallback, useEffect, useRef, useState } from 'react';
import { Lightbulb, RotateCcw } from 'lucide-react';
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
import { applyUci, isOnLine, pickReply, solverMoveCount } from './logic';

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
    >
      {api => <ChessBoard puzzle={puzzle} api={api} />}
    </GameShell>
  );
}

function ChessBoard({ puzzle, api }: { puzzle: ChessPuzzle; api: PlayApi }) {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  // Every move played since the puzzle position, the setup move first.
  // Saved, so a reload resumes exactly where the solver was — on the
  // puzzle's line or off it.
  const [history, setHistory] = useGameState<string[]>(api, 'moves', []);
  // Restarts after running out of moves without mate.
  const [retries, setRetries] = useGameState(api, 'retries', 0);
  const [hints, setHints] = useGameState(api, 'hints', 0);
  // The history length at which the last hint was shown, so a reload keeps it.
  const [hintAt, setHintAt] = useGameState<number | null>(api, 'hintAt', null);
  const [gaveUp, setGaveUp] = useGameState(api, 'gaveUp', false);

  const game = useRef<Chess | null>(null);
  if (!game.current) {
    const g = new Chess(puzzle.fen);
    history.forEach(mv => applyUci(g, mv));
    game.current = g;
  }
  const [, setFen] = useState(() => game.current!.fen());
  const [selected, setSelected] = useState<Square | null>(null);
  const [targets, setTargets] = useState<Square[]>([]);
  const [palette, setPalette] = useState<BoardPalette>(() =>
    readRaw(StoreKeys.chessBoard) === 'owl' ? 'owl' : 'classic'
  );
  const switchPalette = (p: BoardPalette) => {
    setPalette(p);
    writeRaw(StoreKeys.chessBoard, p);
  };

  // The solver plays the side to move *after* the setup move.
  const playerColor = puzzle.fen.split(' ')[1] === 'w' ? 'b' : 'w';
  const g = game.current;
  const onLine = isOnLine(history, puzzle.moves);
  const used = solverMoveCount(history);
  const movesLeft = puzzle.mateIn - used;
  // The defender found a mate of their own.
  const solverMated = g.isCheckmate() && g.turn() === playerColor;
  // Out of moves without mate, a draw, or mated: the attempt is over.
  const outOfMoves =
    !api.finished &&
    history.length > 0 &&
    (solverMated || (!g.isCheckmate() && (g.isGameOver() || movesLeft <= 0)));
  const solverTurn = !api.finished && !outOfMoves && history.length > 0 && g.turn() === playerColor;
  const lastMove = history.length ? history[history.length - 1] : null;

  const play = useCallback(
    (uci: string) => {
      applyUci(game.current!, uci);
      setFen(game.current!.fen());
      setHistory(h => [...h, uci]);
    },
    [setHistory]
  );

  // The opponent: the setup move, then the puzzle's scripted replies while
  // the solver stays on its line, or its own best defence once they leave it.
  useEffect(() => {
    const g = game.current!;
    if (api.finished || g.isGameOver() || (history.length > 0 && g.turn() === playerColor)) return;
    if (history.length > 0 && solverMoveCount(history) >= puzzle.mateIn) return;
    const scripted = isOnLine(history, puzzle.moves) ? puzzle.moves[history.length] : undefined;
    const reply = scripted ?? pickReply(g.fen());
    if (!reply) return;
    const id = setTimeout(() => play(reply), history.length === 0 ? 900 : REPLY_DELAY_MS);
    return () => clearTimeout(id);
  }, [history, puzzle.moves, puzzle.mateIn, playerColor, play, api.finished]);

  const finish = (outcome: 'solved' | 'failed') => {
    const parts =
      outcome === 'solved'
        ? [
            retries === 0 ? 'First try' : `${retries + 1} tries`,
            hints > 0 ? `${hints} hint${hints === 1 ? '' : 's'}` : null,
          ]
        : ['Solution shown'];
    api.complete({
      outcome,
      score: parts.filter(Boolean).join(' · '),
      hints,
      mistakes: retries,
      details: { puzzleId: puzzle.source.id, mateIn: puzzle.mateIn },
      grid:
        outcome === 'solved'
          ? `${'♟️'.repeat(puzzle.mateIn)}${retries ? ` 🔁×${retries}` : ' ✨'}${hints ? ` 💡×${hints}` : ''}`
          : `${'♟️'.repeat(puzzle.mateIn)} ❌`,
    });
  };

  const tryMove = (from: Square, to: Square) => {
    const g = game.current!;
    const expected = onLine ? puzzle.moves[history.length] : undefined;
    const piece = g.get(from);
    const promoting = piece?.type === 'p' && (to[1] === '8' || to[1] === '1');
    // Promote as the solution does when this is its move; a queen otherwise.
    const promotion = promoting
      ? expected?.startsWith(`${from}${to}`) && expected[4]
        ? expected[4]
        : 'q'
      : undefined;
    setSelected(null);
    setTargets([]);
    play(`${from}${to}${promotion ?? ''}`);
    // Any mate counts, not only the puzzle's own line (the Lichess convention).
    if (g.isCheckmate()) finish('solved');
  };

  /** Back to the position after the setup move, for another go. */
  const retry = () => {
    const g = new Chess(puzzle.fen);
    applyUci(g, puzzle.moves[0]);
    game.current = g;
    setFen(g.fen());
    setHistory([puzzle.moves[0]]);
    setHintAt(null);
    setRetries(n => n + 1);
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

  /** Give up: play the puzzle's own line out on the board and end it. */
  const revealSolution = () => {
    const g = new Chess(puzzle.fen);
    puzzle.moves.forEach(mv => applyUci(g, mv));
    game.current = g;
    setFen(g.fen());
    setHistory(puzzle.moves);
    setGaveUp(true);
    finish('failed');
  };

  const showHint = () => {
    if (!solverTurn || !onLine || hintAt === history.length) return;
    setHints(n => n + 1);
    setHintAt(history.length);
  };

  const board = g.board();
  const turn = g.turn();
  const checkSquare = g.inCheck()
    ? (board.flat().find(c => c?.type === 'k' && c.color === turn)?.square ?? null)
    : null;
  const hintActive = solverTurn && onLine && hintAt === history.length;
  const hintMove = hintActive ? puzzle.moves[history.length] : null;
  const hintSan = hintMove ? applyUci(new Chess(g.fen()), hintMove).san : null;
  const side = playerColor === 'w' ? 'White' : 'Black';
  // The solution in notation, for after the puzzle ends.
  const solutionSan = (() => {
    const sg = new Chess(puzzle.fen);
    return puzzle.moves.map(mv => applyUci(sg, mv).san).slice(1);
  })();

  const status = api.finished
    ? gaveUp
      ? 'The solution, played out.'
      : 'Checkmate! ♛'
    : outOfMoves
      ? solverMated
        ? 'Checkmated! Your opponent struck first.'
        : g.isStalemate()
          ? 'Stalemate. The game is drawn, not won.'
          : `Not checkmate. You've used all ${puzzle.mateIn} move${puzzle.mateIn === 1 ? '' : 's'}.`
      : history.length === 0
        ? 'Your opponent is moving…'
        : solverTurn
          ? `Your move as ${side}: mate in ${movesLeft}.`
          : 'Opponent is replying…';

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm font-extrabold" style={{ color: T.text }} role="status">
        {status}
      </p>

      <div
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
      </div>

      {outOfMoves && (
        <div
          className="w-full max-w-[440px] rounded-2xl border px-4 py-3 text-sm font-bold"
          style={{ background: T.wrongBg, borderColor: T.wrongBorder, color: T.text }}
        >
          <p className="m-0">
            There's a forced mate in {puzzle.mateIn} from the starting position. Try another way in,
            or see the solution.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={retry}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl py-2 font-extrabold"
              style={{ background: T.brand, color: '#FFFFFF' }}
            >
              <RotateCcw size={14} aria-hidden /> Try again
            </button>
            <button
              onClick={revealSolution}
              className="flex-1 rounded-xl py-2 border font-extrabold"
              style={{ borderColor: T.cardBorder, color: T.text, background: T.cardBg }}
            >
              Show solution
            </button>
          </div>
        </div>
      )}

      {api.finished && (
        <p className="text-sm font-bold text-center" style={{ color: T.textMuted }}>
          {gaveUp ? 'Solution' : 'The puzzle line'}: {solutionSan.join(' ')}
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

      {!api.finished && !outOfMoves && history.length > 1 && !onLine && (
        <p className="text-xs font-bold text-center" style={{ color: T.textMuted }}>
          You've left the puzzle's main line, so hints are off. Any mate still counts.
        </p>
      )}
      {!api.finished && !outOfMoves && onLine && (
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
