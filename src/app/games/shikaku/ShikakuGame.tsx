import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { Lightbulb, RotateCcw, Trash2 } from 'lucide-react';
import { useDarkMode } from '../../context/DarkModeContext';
import { getTheme } from '../../theme';
import { GameShell, type PlayApi } from '../GameShell';
import { GameLoading } from '../GameLoading';
import { useDailyPuzzle } from '../useDailyPuzzle';
import { useGameState } from '../useGameState';
import {
  contains,
  isSolved,
  isValidRect,
  nextHint,
  place,
  rectBetween,
  removeAt,
  sameRect,
  shikakuGrid,
} from './logic';
import { parseShikaku } from './parse';
import { SAMPLE_SHIKAKU, type Rect, type ShikakuPuzzle } from './sample';
import { getShikakuTutorial } from './tutorial';

const ACCENT = '#6366F1';
/** Soft fills for finished rectangles; each keeps its colour by position. */
const FILLS = [
  '#6366F1',
  '#0EA5E9',
  '#10B981',
  '#F59E0B',
  '#EC4899',
  '#8B5CF6',
  '#14B8A6',
  '#F97316',
];

export function ShikakuGame() {
  const { puzzle, isPractice, loading } = useDailyPuzzle('shikaku', SAMPLE_SHIKAKU, parseShikaku);
  if (loading || !puzzle) return <GameLoading gameId="shikaku" />;
  return (
    <GameShell
      gameId="shikaku"
      practice={isPractice}
      puzzleId={puzzle.clues.map(k => `${k.r}.${k.c}.${k.n}`).join('|')}
      subtitle={`${puzzle.size}×${puzzle.size} · Medium`}
      tutorial={getShikakuTutorial()}
      rules={
        <>
          <p>
            Cut the whole grid into rectangles. Each rectangle holds{' '}
            <strong>exactly one number</strong>, and that number is its area: a 6 can be 2×3, 3×2,
            1×6 or 6×1.
          </p>
          <p>
            Drag from one corner to the other to draw a rectangle. Tap a rectangle to remove it.
            Drawing over others replaces them.
          </p>
          <p>
            Keyboard: arrows move, Space marks one corner and then the other, Delete removes. One
            hint reveals a rectangle of the answer; hints are counted.
          </p>
        </>
      }
    >
      {api => <ShikakuBoard puzzle={puzzle} api={api} />}
    </GameShell>
  );
}

function ShikakuBoard({ puzzle, api }: { puzzle: ShikakuPuzzle; api: PlayApi }) {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const n = puzzle.size;
  const [rects, setRects] = useGameState<Rect[]>(api, 'rects', []);
  const [hints, setHints] = useGameState(api, 'hints', 0);
  const [wrong, setWrong] = useGameState(api, 'wrong', 0);
  const [history, setHistory] = useState<Rect[][]>([]);
  const [drag, setDrag] = useState<{
    from: [number, number];
    to: [number, number];
    id: number;
  } | null>(null);
  const [cursor, setCursor] = useState<[number, number]>([0, 0]);
  const [anchor, setAnchor] = useState<[number, number] | null>(null);
  // The cursor only shows once the keyboard is in use.
  const [usingKeys, setUsingKeys] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  const clueAt = new Map(puzzle.clues.map(k => [k.r * n + k.c, k.n]));

  const commit = useCallback(
    (next: Rect[], hintsUsed: number, wrongCount: number) => {
      setHistory(h => [...h.slice(-49), rects]);
      setRects(next);
      if (isSolved(next, puzzle)) {
        api.complete({
          outcome: 'solved',
          score: hintsUsed === 0 ? 'No hints' : `${hintsUsed} hint${hintsUsed === 1 ? '' : 's'}`,
          hints: hintsUsed,
          mistakes: wrongCount,
          details: { size: puzzle.size, rectangles: puzzle.clues.length },
          grid: shikakuGrid(puzzle, hintsUsed),
        });
      }
    },
    [rects, setRects, puzzle, api]
  );

  const draw = useCallback(
    (from: [number, number], to: [number, number]) => {
      const q = rectBetween(from, to);
      // A wrong-but-valid rectangle (right area, one number, not the answer)
      // is a mistake worth counting; a plainly invalid one is just a draft.
      const counted = isValidRect(q, puzzle) && !puzzle.solution.some(s => sameRect(s, q));
      const nextWrong = wrong + (counted ? 1 : 0);
      if (counted) setWrong(nextWrong);
      commit(place(rects, q), hints, nextWrong);
    },
    [rects, puzzle, wrong, setWrong, commit, hints]
  );

  const cellAt = (e: PointerEvent): [number, number] | null => {
    const box = boardRef.current?.getBoundingClientRect();
    if (!box) return null;
    const c = Math.floor(((e.clientX - box.left) / box.width) * n);
    const r = Math.floor(((e.clientY - box.top) / box.height) * n);
    if (r < 0 || c < 0 || r >= n || c >= n) return null;
    return [r, c];
  };

  const onDown = (e: PointerEvent) => {
    if (api.finished || e.button > 0) return;
    const cell = cellAt(e);
    if (!cell) return;
    e.preventDefault();
    setUsingKeys(false);
    try {
      boardRef.current?.setPointerCapture(e.pointerId);
    } catch {
      // No live pointer to capture (synthetic events); the drag still works.
    }
    setCursor(cell);
    setAnchor(null);
    setDrag({ from: cell, to: cell, id: e.pointerId });
  };
  const onMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const cell = cellAt(e);
    if (cell && (cell[0] !== drag.to[0] || cell[1] !== drag.to[1])) setDrag({ ...drag, to: cell });
  };
  const onUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { from, to } = drag;
    setDrag(null);
    if (from[0] === to[0] && from[1] === to[1]) {
      // A tap: remove the rectangle under it, if any.
      if (rects.some(q => contains(q, from[0], from[1])))
        commit(removeAt(rects, ...from), hints, wrong);
      return;
    }
    draw(from, to);
  };

  const hint = () => {
    if (api.finished) return;
    const q = nextHint(rects, puzzle, cursor);
    if (!q) return;
    setHints(hints + 1);
    commit(place(rects, q), hints + 1, wrong);
  };

  const undo = () => {
    if (!history.length || api.finished) return;
    setRects(history[history.length - 1]);
    setHistory(h => h.slice(0, -1));
  };

  useEffect(() => {
    if (api.finished) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      if (!boardRef.current?.contains(document.activeElement)) return;
      setUsingKeys(true);
      const [r, c] = cursor;
      const move: Record<string, [number, number]> = {
        ArrowUp: [Math.max(0, r - 1), c],
        ArrowDown: [Math.min(n - 1, r + 1), c],
        ArrowLeft: [r, Math.max(0, c - 1)],
        ArrowRight: [r, Math.min(n - 1, c + 1)],
      };
      if (move[e.key]) {
        e.preventDefault();
        setCursor(move[e.key]);
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!anchor) setAnchor(cursor);
        else {
          if (anchor[0] !== r || anchor[1] !== c) draw(anchor, cursor);
          setAnchor(null);
        }
      } else if (e.key === 'Escape') {
        setAnchor(null);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        if (rects.some(q => contains(q, r, c))) commit(removeAt(rects, r, c), hints, wrong);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [api.finished, cursor, anchor, n, rects, draw, commit, hints, wrong]);

  const preview = drag
    ? rectBetween(drag.from, drag.to)
    : anchor
      ? rectBetween(anchor, cursor)
      : null;
  const pct = (v: number) => `${(v / n) * 100}%`;
  const placedCount = rects.filter(q => isValidRect(q, puzzle)).length;

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm font-extrabold m-0" style={{ color: T.textMuted }} role="status">
        {api.finished
          ? 'Every rectangle in place! ▦'
          : `${placedCount} of ${puzzle.clues.length} rectangles`}
      </p>

      <div
        ref={boardRef}
        className="relative select-none touch-none outline-none focus-visible:ring-4"
        style={{
          width: 'min(100%, 440px)',
          aspectRatio: '1',
          borderRadius: 12,
          border: `3px solid ${T.heading}`,
          background: T.cardBg,
          overflow: 'hidden',
        }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => setDrag(null)}
        tabIndex={0}
        role="grid"
        aria-label={`${n} by ${n} shikaku grid. Arrows move, Space marks corners, Delete removes.`}
      >
        {/* Grid lines and clue numbers. */}
        <div
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${n}, 1fr)`,
            gridTemplateRows: `repeat(${n}, 1fr)`,
          }}
        >
          {Array.from({ length: n * n }, (_, i) => {
            const r = Math.floor(i / n);
            const c = i % n;
            const clue = clueAt.get(i);
            const isCursor =
              usingKeys && !drag && !api.finished && cursor[0] === r && cursor[1] === c;
            return (
              <div
                key={i}
                role="gridcell"
                aria-label={`Row ${r + 1}, column ${c + 1}${clue ? `, ${clue}` : ''}${rects.some(q => contains(q, r, c)) ? ', in a rectangle' : ''}`}
                className="relative flex items-center justify-center"
                style={{
                  borderRight: c < n - 1 ? `1px solid ${T.cardBorder}` : undefined,
                  borderBottom: r < n - 1 ? `1px solid ${T.cardBorder}` : undefined,
                  boxShadow: isCursor ? `inset 0 0 0 2px ${ACCENT}66` : undefined,
                }}
              />
            );
          })}
        </div>

        {/* Drawn rectangles. */}
        {rects.map(q => {
          const ok = isValidRect(q, puzzle);
          const colour = FILLS[(q.r * n + q.c) % FILLS.length];
          return (
            <div
              key={`${q.r}-${q.c}-${q.h}-${q.w}`}
              className="absolute pointer-events-none"
              style={{
                top: pct(q.r),
                left: pct(q.c),
                width: pct(q.w),
                height: pct(q.h),
                padding: 3,
              }}
              aria-hidden
            >
              <div
                className="w-full h-full rounded-lg"
                style={{
                  background: ok ? `${colour}${isDark ? '40' : '33'}` : `${'#EF4444'}1A`,
                  border: ok ? `2px solid ${colour}` : '2px dashed #EF4444',
                  transition: 'background 150ms',
                }}
              />
            </div>
          );
        })}

        {/* Rectangle being drawn, with its size. */}
        {preview && (
          <div
            className="absolute pointer-events-none"
            style={{
              top: pct(preview.r),
              left: pct(preview.c),
              width: pct(preview.w),
              height: pct(preview.h),
              padding: 2,
            }}
            aria-hidden
          >
            <div
              className="w-full h-full rounded-lg flex items-start justify-end"
              style={{ border: `2.5px solid ${ACCENT}`, background: `${ACCENT}14` }}
            >
              <span
                className="m-1 rounded-md px-1.5 text-xs font-extrabold"
                style={{ background: ACCENT, color: 'white' }}
              >
                {preview.h * preview.w}
              </span>
            </div>
          </div>
        )}

        {/* Numbers on top of everything. */}
        {puzzle.clues.map(k => (
          <span
            key={`${k.r}-${k.c}`}
            className="absolute flex items-center justify-center pointer-events-none"
            style={{
              top: pct(k.r),
              left: pct(k.c),
              width: pct(1),
              height: pct(1),
              fontFamily: "'Outfit', sans-serif",
              fontSize: 'clamp(0.95rem, 4vw, 1.35rem)',
              color: T.heading,
            }}
            aria-hidden
          >
            {k.n}
          </span>
        ))}
      </div>

      {!api.finished && (
        <div className="w-full grid grid-cols-3 gap-2" style={{ maxWidth: 440 }}>
          <button
            onClick={undo}
            disabled={!history.length}
            className="py-2.5 rounded-2xl border-2 flex items-center justify-center gap-1.5 font-extrabold text-sm disabled:opacity-40"
            style={{ borderColor: T.cardBorder, color: T.brandText, background: T.cardBg }}
          >
            <RotateCcw size={15} /> Undo
          </button>
          <button
            onClick={() => rects.length && commit([], hints, wrong)}
            disabled={!rects.length}
            className="py-2.5 rounded-2xl border-2 flex items-center justify-center gap-1.5 font-extrabold text-sm disabled:opacity-40"
            style={{ borderColor: T.cardBorder, color: T.textMuted, background: T.cardBg }}
          >
            <Trash2 size={15} /> Clear
          </button>
          <button
            onClick={hint}
            className="py-2.5 rounded-2xl border-2 flex items-center justify-center gap-1.5 font-extrabold text-sm"
            style={{ borderColor: T.streakBorder, color: T.streakText, background: T.fodderBg }}
          >
            <Lightbulb size={15} /> Hint{hints ? ` (${hints})` : ''}
          </button>
        </div>
      )}
    </div>
  );
}
