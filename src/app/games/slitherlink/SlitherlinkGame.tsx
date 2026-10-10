import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { Lightbulb, RotateCcw, Trash2 } from 'lucide-react';
import { useDarkMode } from '../../context/DarkModeContext';
import { getTheme } from '../../theme';
import { GameShell, type PlayApi } from '../GameShell';
import { GameLoading } from '../GameLoading';
import { useDailyPuzzle } from '../useDailyPuzzle';
import { useGameState } from '../useGameState';
import {
  CROSS,
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
/** How close (in cells) the finger must come to a dot for the pen to reach it: 80% of the way. */
const SNAP = 0.2;

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
            Cells without numbers can have any count. A number turns green once it has exactly the
            right lines, and red if it has too many.
          </p>
          <p>
            Where to start: every puzzle has a 0 right next to a 3. Cross out the 0's four sides;
            the one it shares with the 3 is then off, so the 3's other three sides are all on. Work
            outwards from there.
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
    /** The dot the pen is on, and where the finger is (in cell units). */
    last: [number, number];
    pos: { x: number; y: number };
    dragging: boolean;
    /** Set by the stroke's first link: drawing over a line erases instead. */
    mode: 'draw' | 'erase' | null;
    /** Links this stroke changed, with what they were, for backtracking. */
    path: { edge: number; prev: Mark }[];
    before: Mark[];
    marks: Mark[];
  } | null>(null);
  // A live copy for the gesture, so a fast drag never reads stale marks.
  const [, redraw] = useState(0);
  /**
   * Links that just appeared, so each grows out of the dot it was drawn
   * from: `from` is that dot, `start` how much of it was already showing
   * (the live segment covers most of a dragged link), `delay`
   * staggers the links a fast swipe fills in, and `id` restarts the
   * animation if the same link is drawn again.
   */
  const grows = useRef(
    new Map<number, { from: [number, number]; start: number; delay: number; id: number }>()
  );
  const growId = useRef(0);
  const grow = (edge: number, from: [number, number], start = 0, delay = 0) =>
    grows.current.set(edge, { from, start, delay, id: ++growId.current });

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
      pos: p,
      dragging: false,
      mode: null,
      path: [],
      before: marks,
      marks: [...marks],
    };
    setCursor(null);
  };

  const onMove = (e: PointerEvent) => {
    const g = gesture.current;
    if (!g || e.pointerId !== g.id) return;
    const p = toCells(e);
    g.pos = p;
    if (!g.dragging && Math.hypot(p.x - g.start.x, p.y - g.start.y) > 0.25) g.dragging = true;
    if (!g.dragging) return;
    // The pen moves to a dot only once the finger reaches it (within
    // SNAP of it, 80% of the way), never just past half way: until then the live segment
    // follows the finger along the line. A fast swipe can jump several dots
    // at once: walk there link by link, along the axis the finger has
    // travelled further, so the line never has gaps.
    const nearest: [number, number] = [
      Math.max(0, Math.min(puzzle.rows, Math.round(p.y))),
      Math.max(0, Math.min(puzzle.cols, Math.round(p.x))),
    ];
    if (Math.hypot(p.y - nearest[0], p.x - nearest[1]) > SNAP) {
      redraw(n => n + 1); // the live segment follows the finger
      return;
    }
    const target = nearest;
    let [r, c] = g.last;
    let steps = 0;
    // One link at a time: the live segment has already drawn most of it.
    // A fast jump over several: they grow from scratch, one after another.
    const single = Math.abs(target[0] - r) + Math.abs(target[1] - c) === 1;
    while (r !== target[0] || c !== target[1]) {
      const dr = target[0] - r;
      const dc = target[1] - c;
      const alongRow = dc === 0 || (dr !== 0 && Math.abs(p.y - r) > Math.abs(p.x - c));
      const next: [number, number] = alongRow ? [r + Math.sign(dr), c] : [r, c + Math.sign(dc)];
      const edge = edgeBetween(grid, [r, c], next);
      if (edge !== null) {
        g.mode ??= g.before[edge] === LINE ? 'erase' : 'draw';
        const top = g.path[g.path.length - 1];
        if (top && top.edge === edge) {
          // Back over the link just changed: undo it.
          g.marks[edge] = top.prev;
          g.path.pop();
        } else {
          g.path.push({ edge, prev: g.marks[edge] });
          g.marks[edge] = g.mode === 'draw' ? LINE : EMPTY;
          if (g.mode === 'draw') {
            grow(edge, [r, c], single ? 1 - SNAP : 0, single ? 0 : steps * 45);
          }
        }
        steps++;
      }
      [r, c] = next;
    }
    g.last = [r, c];
    redraw(n => n + 1); // the live segment follows the finger
  };

  const onUp = (e: PointerEvent) => {
    const g = gesture.current;
    if (!g || e.pointerId !== g.id) return;
    gesture.current = null;
    redraw(n => n + 1); // clear the pen ring, even if nothing changed
    if (!g.dragging) {
      const edge = nearestEdge(grid, g.start.x, g.start.y);
      if (edge === null) return;
      const next = [...g.before];
      next[edge] = ((next[edge] + 1) % 3) as Mark;
      if (next[edge] === LINE) grow(edge, grid.ends[edge][0]);
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
    if (h.mark === LINE) grow(h.edge, grid.ends[h.edge][0]);
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
        onPointerCancel={() => {
          gesture.current = null;
          redraw(n => n + 1);
        }}
        tabIndex={0}
        role="img"
        aria-label={`${puzzle.rows} by ${puzzle.cols} slitherlink. ${shown.filter(m => m === LINE).length} lines drawn. Arrows move, Shift and an arrow draws.`}
      >
        {/* Numbers: green once exactly surrounded, red when over. */}
        {[...puzzle.clues].map((ch, i) => {
          if (ch === '.') return null;
          const r = Math.floor(i / puzzle.cols);
          const c = i % puzzle.cols;
          const n = lineCount(grid, shown, i);
          // A 0 counts as done once its four sides are crossed out, not at the start.
          const met =
            n === Number(ch) &&
            (Number(ch) > 0 || grid.cellEdges[i].every(e => shown[e] === CROSS));
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
                fontSize: 19,
                // Green once exactly surrounded, red when over, else plain.
                fill: n > k ? '#EF4444' : met ? (isDark ? '#34D399' : '#059669') : T.heading,
                transition: 'fill 150ms',
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
            // Drawn from the dot the player started at, growing towards the other.
            const g = grows.current.get(e);
            const fromFirst = !g || (g.from[0] === r1 && g.from[1] === c1);
            const [a, b] = fromFirst
              ? [
                  [r1, c1],
                  [r2, c2],
                ]
              : [
                  [r2, c2],
                  [r1, c1],
                ];
            return (
              <line
                key={g ? `${e}-${g.id}` : e}
                x1={px(a[1])}
                y1={px(a[0])}
                x2={px(b[1])}
                y2={px(b[0])}
                stroke={lineColour}
                strokeWidth={5}
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={g ? '1 1' : undefined}
                className={g ? 'slither-grow' : undefined}
                style={
                  g
                    ? ({
                        '--from': 1 - g.start,
                        animationDelay: `${g.delay}ms`,
                      } as CSSProperties)
                    : undefined
                }
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

        {/* The live segment: from the pen's dot towards the finger, along the
            grid line it's heading for, until the finger reaches the next dot. */}
        {(() => {
          const g = gesture.current;
          if (!g?.dragging || g.mode === 'erase') return null;
          const [r, c] = g.last;
          const dx = g.pos.x - c;
          const dy = g.pos.y - r;
          const across = Math.abs(dx) >= Math.abs(dy);
          const d = across ? dx : dy;
          const len = Math.min(Math.abs(d), 1);
          const next: [number, number] = across ? [r, c + Math.sign(d)] : [r + Math.sign(d), c];
          const edge = len > 0.04 ? edgeBetween(grid, [r, c], next) : null;
          if (edge === null || shown[edge] === LINE) return null;
          const x2 = px(c + (across ? Math.sign(d) * len : 0));
          const y2 = px(r + (across ? 0 : Math.sign(d) * len));
          return (
            <line
              x1={px(c)}
              y1={px(r)}
              x2={x2}
              y2={y2}
              stroke={lineColour}
              strokeWidth={5}
              strokeLinecap="round"
              opacity={0.85}
            />
          );
        })()}

        {/* Dots: red where more than two lines meet. */}
        {Array.from({ length: (puzzle.rows + 1) * (puzzle.cols + 1) }, (_, k) => {
          const r = Math.floor(k / (puzzle.cols + 1));
          const c = k % (puzzle.cols + 1);
          const over = (degrees.get(`${r},${c}`) ?? 0) > 2;
          const pen = gesture.current?.dragging ? gesture.current.last : cursor;
          const isCursor = pen && pen[0] === r && pen[1] === c;
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
