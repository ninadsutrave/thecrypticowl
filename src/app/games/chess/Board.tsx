import { useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { Square } from 'chess.js';
import { pieceSrc } from './pieces';

/**
 * The chessboard: drag-and-drop or tap-tap, for mouse and touch alike.
 *
 * Pointer events cover both input types, so there is one code path. A press
 * on one of the solver's pieces selects it; moving more than a few pixels
 * turns the press into a drag, with the piece following the pointer and the
 * square under it outlined; releasing over a legal square plays the move.
 * A press without movement is a tap, and a second tap on a target moves.
 *
 * Pieces are the Chessnut set by Alexis Luengas (Apache 2.0, see
 * public/pieces/LICENSE.txt).
 */

export interface BoardCell {
  square: Square;
  type: string;
  color: 'w' | 'b';
}

const FILES = 'abcdefgh';
/** Pixels of movement before a press becomes a drag (taps jitter a little). */
const DRAG_THRESHOLD = 6;

/**
 * Board palettes. Each carries its own move highlights: one amber tint read
 * as muddy brown on the purple squares, so the Owl board lifts its
 * highlights towards white instead.
 */
export const BOARD_PALETTES = {
  classic: {
    label: 'Classic',
    light: '#F0D9B5',
    dark: '#B58863',
    last: 'rgba(205, 210, 106, 0.75)',
    selected: 'rgba(20, 85, 30, 0.45)',
  },
  owl: {
    label: 'Owl',
    light: '#EEE9F7',
    dark: '#8F7CC9',
    last: 'rgba(255, 236, 153, 0.62)',
    selected: 'rgba(255, 221, 87, 0.78)',
  },
} as const;
export type BoardPalette = keyof typeof BOARD_PALETTES;

const HINT = 'rgba(16, 185, 129, 0.6)';
const NAME: Record<string, string> = {
  k: 'king',
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
  p: 'pawn',
};

interface Drag {
  from: Square;
  piece: BoardCell;
  pointerId: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  active: boolean;
}

export function Board({
  board,
  orientation,
  interactive,
  movable,
  selected,
  targets,
  lastMove,
  checkSquare,
  hintSquares,
  onSelect,
  onMove,
  palette = 'classic',
}: {
  palette?: BoardPalette;
  /** chess.js board(): row 0 is rank 8. */
  board: (BoardCell | null)[][];
  orientation: 'w' | 'b';
  interactive: boolean;
  /** Whether a piece on this square may be picked up. */
  movable: (square: Square) => boolean;
  selected: Square | null;
  targets: Square[];
  /** UCI of the last move played, animated when it changes. */
  lastMove: string | null;
  checkSquare: Square | null;
  hintSquares: Square[];
  onSelect: (square: Square | null) => void;
  onMove: (from: Square, to: Square) => void;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const SQUARE = BOARD_PALETTES[palette];
  const [drag, setDrag] = useState<Drag | null>(null);
  // The move that just landed by drag shouldn't also slide in.
  const [droppedMove, setDroppedMove] = useState<string | null>(null);

  const ranks = orientation === 'w' ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const files = orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];

  /** Board coordinates of a square, in grid steps from the top-left. */
  const gridPos = (sq: string) => ({
    col: files.indexOf(FILES.indexOf(sq[0])),
    row: ranks.indexOf(Number(sq[1]) - 1),
  });

  const squareAt = (clientX: number, clientY: number): Square | null => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const col = Math.floor(((clientX - rect.left) / rect.width) * 8);
    const row = Math.floor(((clientY - rect.top) / rect.height) * 8);
    if (col < 0 || col > 7 || row < 0 || row > 7) return null;
    return `${FILES[files[col]]}${ranks[row] + 1}` as Square;
  };

  const onPointerDown = (e: PointerEvent, sq: Square, cell: BoardCell | null) => {
    if (!interactive || e.button > 0) return;
    if (!cell || !movable(sq)) return;
    e.preventDefault();
    boardRef.current?.setPointerCapture(e.pointerId);
    onSelect(sq);
    setDrag({
      from: sq,
      piece: cell,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      active: false,
    });
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const moved = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);
    setDrag({ ...drag, x: e.clientX, y: e.clientY, active: drag.active || moved > DRAG_THRESHOLD });
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const target = squareAt(e.clientX, e.clientY);
    const wasDrag = drag.active;
    setDrag(null);
    if (wasDrag) {
      if (target && targets.includes(target)) {
        setDroppedMove(`${drag.from}${target}`);
        onMove(drag.from, target);
      } else if (target !== drag.from) {
        onSelect(null);
      }
    }
    // A tap leaves the piece selected for a second tap on a target.
  };

  // Also the keyboard path: Enter/Space on a square fires click without any
  // pointer events, so selection must happen here too, not only on press.
  const onSquareClick = (sq: Square) => {
    if (!interactive || drag) return;
    if (selected && targets.includes(sq)) {
      setDroppedMove(null);
      onMove(selected, sq);
    } else if (movable(sq)) {
      onSelect(sq);
    } else {
      onSelect(null);
    }
  };

  const hovered = drag?.active ? squareAt(drag.x, drag.y) : null;
  const rect = boardRef.current?.getBoundingClientRect();
  const squarePx = rect ? rect.width / 8 : 0;

  // Slide the last-moved piece in from its origin, unless it was dropped there.
  const slide =
    lastMove && lastMove.slice(0, 4) !== droppedMove
      ? (() => {
          const from = gridPos(lastMove.slice(0, 2));
          const to = gridPos(lastMove.slice(2, 4));
          return { square: lastMove.slice(2, 4), dc: from.col - to.col, dr: from.row - to.row };
        })()
      : null;

  return (
    <div
      ref={boardRef}
      className="relative grid grid-cols-8 grid-rows-8 w-full h-full touch-none"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setDrag(null)}
      role="grid"
      aria-label={`Chessboard, ${orientation === 'w' ? 'White' : 'Black'} at the bottom`}
    >
      {ranks.map((r, ri) =>
        files.map((f, fi) => {
          const cell = board[7 - r][f];
          const sq = `${FILES[f]}${r + 1}` as Square;
          const light = (r + f) % 2 === 1;
          const isTarget = targets.includes(sq);
          const isLast = lastMove?.slice(0, 2) === sq || lastMove?.slice(2, 4) === sq;
          const isDragOrigin = drag?.active && drag.from === sq;
          const overlays: CSSProperties[] = [];
          if (isLast) overlays.push({ background: SQUARE.last });
          if (sq === selected) overlays.push({ background: SQUARE.selected });
          if (hintSquares.includes(sq)) overlays.push({ boxShadow: `inset 0 0 0 4px ${HINT}` });
          if (sq === checkSquare) {
            overlays.push({
              background:
                'radial-gradient(circle, rgba(239,68,68,0.95) 0%, rgba(239,68,68,0.55) 35%, rgba(239,68,68,0) 72%)',
            });
          }
          if (hovered === sq && isTarget)
            overlays.push({ boxShadow: 'inset 0 0 0 4px rgba(255,255,255,0.85)' });
          const slideHere = slide && slide.square === sq && cell && !isDragOrigin;

          return (
            <button
              key={sq}
              type="button"
              role="gridcell"
              onPointerDown={e => onPointerDown(e, sq, cell)}
              onClick={() => onSquareClick(sq)}
              aria-label={`${sq}${cell ? `, ${cell.color === 'w' ? 'white' : 'black'} ${NAME[cell.type]}` : ''}${isTarget ? ', legal move' : ''}`}
              aria-selected={sq === selected}
              className="relative flex items-center justify-center p-0 border-0"
              style={{
                background: light ? SQUARE.light : SQUARE.dark,
                cursor: !interactive
                  ? 'default'
                  : cell && movable(sq)
                    ? 'grab'
                    : isTarget
                      ? 'pointer'
                      : 'default',
              }}
            >
              {overlays.map((o, i) => (
                <span
                  key={i}
                  className="absolute inset-0 pointer-events-none"
                  style={o}
                  aria-hidden
                />
              ))}
              {cell && (
                <img
                  key={slideHere ? `slide-${lastMove}` : 'still'}
                  src={pieceSrc(cell)}
                  alt=""
                  draggable={false}
                  className="relative w-[88%] h-[88%] pointer-events-none select-none"
                  style={{
                    opacity: isDragOrigin ? 0.25 : 1,
                    ...(slideHere
                      ? ({
                          animation: 'chessSlide 200ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                          '--dx': `${slide!.dc * 113.6}%`,
                          '--dy': `${slide!.dr * 113.6}%`,
                        } as CSSProperties)
                      : {}),
                  }}
                />
              )}
              {isTarget && (
                <span
                  className="absolute rounded-full pointer-events-none"
                  style={
                    cell
                      ? { inset: '4%', border: '5px solid rgba(30,27,75,0.32)' }
                      : { width: '30%', height: '30%', background: 'rgba(30,27,75,0.3)' }
                  }
                  aria-hidden
                />
              )}
              {fi === 0 && (
                <span
                  className="absolute top-0.5 left-1 text-[0.62rem] font-extrabold pointer-events-none"
                  style={{ color: light ? SQUARE.dark : SQUARE.light }}
                  aria-hidden
                >
                  {r + 1}
                </span>
              )}
              {ri === 7 && (
                <span
                  className="absolute bottom-0 right-1 text-[0.62rem] font-extrabold pointer-events-none"
                  style={{ color: light ? SQUARE.dark : SQUARE.light }}
                  aria-hidden
                >
                  {FILES[f]}
                </span>
              )}
            </button>
          );
        })
      )}

      {/* The dragged piece, following the pointer above everything else. */}
      {drag?.active && rect && (
        <img
          src={pieceSrc(drag.piece)}
          alt=""
          draggable={false}
          className="absolute pointer-events-none select-none z-10"
          style={{
            width: squarePx * 1.1,
            height: squarePx * 1.1,
            left: drag.x - rect.left - (squarePx * 1.1) / 2,
            top: drag.y - rect.top - (squarePx * 1.1) / 2,
            filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.35))',
          }}
          aria-hidden
        />
      )}
    </div>
  );
}
