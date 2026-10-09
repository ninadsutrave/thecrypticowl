import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { Lightbulb, RotateCcw, Trash2 } from 'lucide-react';
import { useDarkMode } from '../../context/DarkModeContext';
import { getTheme } from '../../theme';
import { GameShell, type PlayApi } from '../GameShell';
import { GameLoading } from '../GameLoading';
import { useDailyPuzzle } from '../useDailyPuzzle';
import { useGameState } from '../useGameState';
import {
  dotDegrees,
  edgeBetween,
  EMPTY,
  emptyMarks,
  isSolved,
  LINE,
  lineCount,
  makeGrid,
  nearestEdge,
  nextHint,
  slitherGrid,
  type Mark,
} from './logic';
import { parseSlitherlink } from './parse';
import { SAMPLE_SLITHERLINK, type SlitherlinkPuzzle } from './sample';
import { getSlitherlinkTutorial } from './tutorial';

const ACCENT = '#6366F1';
/** SVG units: one cell, and the margin around the dots. */
const S = 40;
const M = 14;

export function SlitherlinkGame() {
  const { puzzle, isPractice, loading } = useDailyPuzzle(
    'slitherlink',
    SAMPLE_SLITHERLINK,
    parseSlitherlink
  );
  if (loading || !puzzle) return <GameLoading gameId="slitherlink" />;
  return (
    <GameShell
      gameId="slitherlink"
      practice={isPractice}
      puzzleId={puzzle.clues}
      subtitle={`${puzzle.rows}×${puzzle.cols} · Medium`}
      tutorial={getSlitherlinkTutorial()}
      rules={
        <>
          <p>
            Draw <strong>one closed loop</strong> along the dotted lines. It never crosses or
            touches itself, and every number says how many of its cell's four sides the loop uses.
            Cells without numbers can have any count.
          </p>
          <p>
            Drag through the dots to draw; drag back to undo a stretch. Tap a side to cycle line →
            cross (a reminder it's empty) → nothing.
          </p>
          <p>
            Keyboard: arrows move, Shift + arrow draws or erases. A hint fixes a wrong line, or
            draws a missing piece of the loop; hints are counted.
          </p>
        </>
      }
    >
      {api => <SlitherBoard puzzle={puzzle} api={api} />}
    </GameShell>
  );
}

function SlitherBoard({ puzzle, api }: { puzzle: SlitherlinkPuzzle; api: PlayApi }) {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const grid = useMemo(() => makeGrid(puzzle.rows, puzzle.cols), [puzzle.rows, puzzle.cols]);
  const [marks, setMarks] = useGameState<Mark[]>(api, 'marks', () => emptyMarks(puzzle));
  const [hints, setHints] = useGameState(api, 'hints', 0);
  const [history, setHistory] = useState<Mark[][]>([]);
  const [cursor, setCursor] = useState<[number, number] | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gesture = useRef<{
    id: number;
    start: { x: number; y: number };
    last: [number, number];
    dragging: boolean;
    drawn: number[];
    before: Mark[];
    marks: Mark[];
  } | null>(null);
  // A live copy for the gesture, so a fast drag never reads stale marks.
  const [, redraw] = useState(0);

  const W = puzzle.cols * S + 2 * M;
  const H = puzzle.rows * S + 2 * M;

  const finishWith = (next: Mark[], before: Mark[], hintCount = hints) => {
    if (next.every((m, i) => m === before[i])) return;
    setHistory(h => [...h.slice(-49), before]);
    setMarks(next);
    if (isSolved(grid, next, puzzle.clues)) {
      api.complete({
        outcome: 'solved',
        score: hintCount === 0 ? 'No hints' : `${hintCount} hint${hintCount === 1 ? '' : 's'}`,
        hints: hintCount,
        mistakes: 0,
        details: { size: puzzle.rows },
        grid: slitherGrid(puzzle, hintCount),
      });
    }
  };

  /** Pointer position in cell units: (0, 0) is the top-left dot. */
  const toCells = (e: PointerEvent) => {
    const box = svgRef.current!.getBoundingClientRect();
    return {
      x: (((e.clientX - box.left) / box.width) * W - M) / S,
      y: (((e.clientY - box.top) / box.height) * H - M) / S,
    };
  };

  const onDown = (e: PointerEvent) => {
    if (api.finished || e.button > 0) return;
    e.preventDefault();
    try {
      svgRef.current?.setPointerCapture(e.pointerId);
    } catch {
      // No live pointer to capture (synthetic events).
    }
    const p = toCells(e);
    gesture.current = {
      id: e.pointerId,
      start: p,
      last: [Math.round(p.y), Math.round(p.x)],
      dragging: false,
      drawn: [],
      before: marks,
      marks: [...marks],
    };
    setCursor(null);
  };

  const onMove = (e: PointerEvent) => {
    const g = gesture.current;
    if (!g || e.pointerId !== g.id) return;
    const p = toCells(e);
    if (!g.dragging && Math.hypot(p.x - g.start.x, p.y - g.start.y) > 0.3) g.dragging = true;
    if (!g.dragging) return;
    const dot: [number, number] = [Math.round(p.y), Math.round(p.x)];
    if (Math.hypot(p.y - dot[0], p.x - dot[1]) > 0.32) return; // between dots
    if (dot[0] === g.last[0] && dot[1] === g.last[1]) return;
    const edge = edgeBetween(grid, g.last, dot);
    g.last = dot;
    if (edge === null) return;
    if (g.drawn[g.drawn.length - 1] === edge) {
      // Dragging back over the stretch just drawn erases it.
      g.drawn.pop();
      g.marks[edge] = EMPTY;
    } else {
      g.drawn.push(edge);
      g.marks[edge] = LINE;
    }
    redraw(n => n + 1);
  };

  const onUp = (e: PointerEvent) => {
    const g = gesture.current;
    if (!g || e.pointerId !== g.id) return;
    gesture.current = null;
    if (!g.dragging) {
      const edge = nearestEdge(grid, g.start.x, g.start.y);
      if (edge === null) return;
      const next = [...g.before];
      next[edge] = ((next[edge] + 1) % 3) as Mark;
      finishWith(next, g.before);
      return;
    }
    finishWith(g.marks, g.before);
  };

  const hint = () => {
    if (api.finished) return;
    const h = nextHint(marks, puzzle.solution);
    if (!h) return;
    const next = [...marks];
    next[h.edge] = h.mark;
    setHints(hints + 1);
    finishWith(next, marks, hints + 1);
  };

  const undo = () => {
    if (!history.length || api.finished) return;
    setMarks(history[history.length - 1]);
    setHistory(h => h.slice(0, -1));
  };

  useEffect(() => {
    if (api.finished) return;
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('[aria-modal="true"]')) return;
      if (document.activeElement !== svgRef.current) return;
      const step: Record<string, [number, number]> = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      };
      const d = step[e.key];
      if (!d) return;
      e.preventDefault();
      const from = cursor ?? [0, 0];
      const to: [number, number] = [
        Math.max(0, Math.min(puzzle.rows, from[0] + d[0])),
        Math.max(0, Math.min(puzzle.cols, from[1] + d[1])),
      ];
      if (e.shiftKey) {
        const edge = edgeBetween(grid, from, to);
        if (edge !== null) {
          const next = [...marks];
          next[edge] = next[edge] === LINE ? EMPTY : LINE;
          finishWith(next, marks);
        }
      }
      setCursor(to);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const shown = gesture.current?.dragging ? gesture.current.marks : marks;
  const degrees = dotDegrees(grid, shown);
  const lineColour = api.finished ? '#10B981' : ACCENT;
  const px = (c: number) => M + c * S;

  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full select-none touch-none outline-none focus-visible:ring-4 rounded-2xl"
        style={{
          maxWidth: 440,
          background: T.cardBg,
          border: `1px solid ${T.cardBorder}`,
          boxShadow: T.shadowCard,
        }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => (gesture.current = null)}
        tabIndex={0}
        role="img"
        aria-label={`${puzzle.rows} by ${puzzle.cols} slitherlink. ${shown.filter(m => m === LINE).length} lines drawn. Arrows move, Shift and an arrow draws.`}
      >
        {/* Numbers: red when over, faded once exactly met. */}
        {[...puzzle.clues].map((ch, i) => {
          if (ch === '.') return null;
          const r = Math.floor(i / puzzle.cols);
          const c = i % puzzle.cols;
          const n = lineCount(grid, shown, i);
          const k = Number(ch);
          return (
            <text
              key={i}
              x={px(c) + S / 2}
              y={px(r) + S / 2}
              textAnchor="middle"
              dominantBaseline="central"
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 20,
                fill: n > k ? '#EF4444' : T.heading,
                opacity: n === k ? 0.4 : 1,
              }}
            >
              {ch}
            </text>
          );
        })}

        {/* Lines and crosses. */}
        {shown.map((m, e) => {
          if (m === EMPTY) return null;
          const [[r1, c1], [r2, c2]] = grid.ends[e];
          if (m === LINE) {
            return (
              <line
                key={e}
                x1={px(c1)}
                y1={px(r1)}
                x2={px(c2)}
                y2={px(r2)}
                stroke={lineColour}
                strokeWidth={5}
                strokeLinecap="round"
              />
            );
          }
          const mx = (px(c1) + px(c2)) / 2;
          const my = (px(r1) + px(r2)) / 2;
          return (
            <g key={e} stroke={T.textMuted} strokeWidth={1.8} strokeLinecap="round" opacity={0.8}>
              <line x1={mx - 4} y1={my - 4} x2={mx + 4} y2={my + 4} />
              <line x1={mx - 4} y1={my + 4} x2={mx + 4} y2={my - 4} />
            </g>
          );
        })}

        {/* Dots: red where more than two lines meet. */}
        {Array.from({ length: (puzzle.rows + 1) * (puzzle.cols + 1) }, (_, k) => {
          const r = Math.floor(k / (puzzle.cols + 1));
          const c = k % (puzzle.cols + 1);
          const over = (degrees.get(`${r},${c}`) ?? 0) > 2;
          const isCursor = cursor && cursor[0] === r && cursor[1] === c;
          return (
            <g key={k}>
              {isCursor && (
                <circle cx={px(c)} cy={px(r)} r={9} fill="none" stroke={ACCENT} strokeWidth={2} />
              )}
              <circle
                cx={px(c)}
                cy={px(r)}
                r={over ? 4.5 : 3}
                fill={over ? '#EF4444' : T.heading}
              />
            </g>
          );
        })}
      </svg>

      {!api.finished && (
        <div className="w-full grid grid-cols-3 gap-2" style={{ maxWidth: 440 }}>
          <button
            onClick={undo}
            disabled={!history.length}
            className="min-h-[44px] rounded-2xl border-2 flex items-center justify-center gap-1.5 font-extrabold text-sm disabled:opacity-40"
            style={{ borderColor: T.cardBorder, color: T.brandText, background: T.cardBg }}
          >
            <RotateCcw size={15} /> Undo
          </button>
          <button
            onClick={() => finishWith(emptyMarks(puzzle), marks)}
            disabled={marks.every(m => m === EMPTY)}
            className="min-h-[44px] rounded-2xl border-2 flex items-center justify-center gap-1.5 font-extrabold text-sm disabled:opacity-40"
            style={{ borderColor: T.cardBorder, color: T.textMuted, background: T.cardBg }}
          >
            <Trash2 size={15} /> Clear
          </button>
          <button
            onClick={hint}
            className="min-h-[44px] rounded-2xl border-2 flex items-center justify-center gap-1.5 font-extrabold text-sm"
            style={{ borderColor: T.streakBorder, color: T.streakText, background: T.fodderBg }}
          >
            <Lightbulb size={15} /> Hint{hints ? ` (${hints})` : ''}
          </button>
        </div>
      )}
      {api.finished && (
        <p className="m-0 text-sm font-extrabold" style={{ color: T.textMuted }} role="status">
          One loop, every number satisfied. ➰
        </p>
      )}
    </div>
  );
}
