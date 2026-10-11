import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eraser, Lightbulb, Pencil } from 'lucide-react';
import { useDarkMode } from '../../context/DarkModeContext';
import { getTheme, type Theme } from '../../theme';
import { GameShell, type PlayApi } from '../GameShell';
import { GameLoading } from '../GameLoading';
import { useDailyPuzzle } from '../useDailyPuzzle';
import { useGameState } from '../useGameState';
import { parseSudoku } from './parse';
import { SAMPLE_SUDOKU, type SudokuPuzzle } from './sample';
import { VARIANTS } from './variants';
import { getSudokuTutorial } from './tutorial';
import {
  cageOutline,
  findConflicts,
  isFilled,
  matchesSolution,
  regionOf,
  sharesHouse,
} from './logic';

/** Board units per cell in the SVG overlay. */
const CELL = 100;
const ACCENT = '#0EA5E9';

export function SudokuGame() {
  const { puzzle, isPractice, loading } = useDailyPuzzle('sudoku', SAMPLE_SUDOKU, parseSudoku);
  if (loading || !puzzle) return <GameLoading gameId="sudoku" />;
  const info = VARIANTS[puzzle.variant];

  return (
    <GameShell
      gameId="sudoku"
      practice={isPractice}
      puzzleId={puzzle.solution}
      subtitle={`${info.name} · ${puzzle.size}×${puzzle.size} · Medium`}
      tutorial={getSudokuTutorial(puzzle)}
    >
      {api => <SudokuBoard puzzle={puzzle} api={api} />}
    </GameShell>
  );
}

function SudokuBoard({ puzzle, api }: { puzzle: SudokuPuzzle; api: PlayApi }) {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const n = puzzle.size;
  const total = n * n;

  const [values, setValues] = useGameState<number[]>(api, 'values', () =>
    Array.from({ length: total }, (_, i) => puzzle.givens[i] ?? 0)
  );
  // Bitmask of pencil marks per cell: bit d set = note d.
  const [notes, setNotes] = useGameState<number[]>(api, 'notes', () => Array(total).fill(0));
  // Cells filled by the hint button, locked and shown in amber.
  const [revealed, setRevealed] = useGameState<number[]>(api, 'revealed', []);
  // Digits placed that disagree with the solution — recorded, never shown live.
  const [mistakes, setMistakes] = useGameState(api, 'mistakes', 0);
  const [selected, setSelected] = useState<number | null>(null);
  const [noteMode, setNoteMode] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const locked = useCallback(
    (i: number) => puzzle.givens[i] !== undefined || revealed.includes(i) || api.finished,
    [puzzle.givens, revealed, api.finished]
  );
  const conflicts = useMemo(() => findConflicts(values, puzzle), [values, puzzle]);
  const cageSumAt = useMemo(() => {
    const map = new Map<number, number>();
    for (const cage of puzzle.cages ?? []) map.set(Math.min(...cage.cells), cage.sum);
    return map;
  }, [puzzle.cages]);

  const finishIfSolved = useCallback(
    (next: number[], hints: number, wrong: number) => {
      if (!isFilled(next)) {
        setMessage(null);
        return;
      }
      if (matchesSolution(next, puzzle.solution)) {
        api.complete({
          outcome: 'solved',
          score: hints === 0 ? 'No hints' : `${hints} hint${hints === 1 ? '' : 's'}`,
          hints,
          mistakes: wrong,
          details: { variant: puzzle.variant, size: puzzle.size },
          grid: `🔢 ${VARIANTS[puzzle.variant].name} ${puzzle.size}×${puzzle.size} ${hints ? '💡'.repeat(Math.min(hints, 8)) : '✨ no hints'}`,
        });
      } else {
        setMessage('The grid is full, but something is not right yet. Check the red cells.');
      }
    },
    [api, puzzle.solution, puzzle.variant, puzzle.size]
  );

  const enter = useCallback(
    (digit: number) => {
      if (api.finished) return;
      // No cell chosen (or a fixed one): the number goes into the first empty
      // box, which becomes the selection.
      const cell =
        selected !== null && !locked(selected)
          ? selected
          : values.findIndex((v, k) => v === 0 && !locked(k));
      if (cell < 0) return;
      if (cell !== selected) setSelected(cell);
      if (noteMode && digit > 0) {
        if (values[cell]) return;
        setNotes(ns => ns.map((m, i) => (i === cell ? m ^ (1 << digit) : m)));
        return;
      }
      const placed = values[cell] === digit ? 0 : digit;
      const next = values.map((v, i) => (i === cell ? placed : v));
      setValues(next);
      // Placing a digit clears it from the notes of every cell it now rules out.
      setNotes(ns =>
        ns.map((m, i) =>
          i === cell ? 0 : placed && sharesHouse(i, cell, puzzle) ? m & ~(1 << placed) : m
        )
      );
      const wrongNow = placed > 0 && String(placed) !== puzzle.solution[cell];
      if (wrongNow) {
        setMistakes(m => m + 1);
        api.oops();
      }
      finishIfSolved(next, revealed.length, mistakes + (wrongNow ? 1 : 0));
    },
    [
      api,
      selected,
      locked,
      noteMode,
      values,
      puzzle,
      finishIfSolved,
      revealed.length,
      mistakes,
      setValues,
      setNotes,
      setMistakes,
    ]
  );

  const hint = () => {
    if (api.finished) return;
    const wrong = (i: number) => values[i] !== Number(puzzle.solution[i]);
    const target =
      selected !== null && !locked(selected) && wrong(selected)
        ? selected
        : values.findIndex((_, i) => !locked(i) && wrong(i));
    if (target < 0) return;
    const next = values.map((v, i) => (i === target ? Number(puzzle.solution[i]) : v));
    const nextRevealed = [...revealed, target];
    setValues(next);
    setRevealed(nextRevealed);
    setSelected(target);
    finishIfSolved(next, nextRevealed.length, mistakes);
  };

  useEffect(() => {
    if (api.finished) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Typing belongs to an open dialog (the tutorial).
      if (document.querySelector('[aria-modal="true"]')) return;
      const d = Number(e.key);
      if (Number.isInteger(d) && d >= 1 && d <= n) {
        enter(d);
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        enter(0);
      } else if (e.key === 'n' || e.key === 'N') {
        setNoteMode(v => !v);
      } else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        setSelected(s => {
          const cur = s ?? 0;
          const r = Math.floor(cur / n);
          const c = cur % n;
          if (e.key === 'ArrowUp') return ((r + n - 1) % n) * n + c;
          if (e.key === 'ArrowDown') return ((r + 1) % n) * n + c;
          if (e.key === 'ArrowLeft') return r * n + ((c + n - 1) % n);
          return r * n + ((c + 1) % n);
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enter, n, api.finished]);

  const selectedDigit = selected !== null ? values[selected] : 0;
  const backgrounds = values.map((v, i) =>
    cellBackground(
      {
        isSel: i === selected,
        related: selected !== null && i !== selected && sharesHouse(i, selected, puzzle),
        sameDigit: v > 0 && v === selectedDigit && i !== selected,
        isConflict: conflicts.has(i),
      },
      T,
      isDark
    )
  );
  const boardPx = n === 6 ? 'min(100%, 384px)' : 'min(100%, 450px)';

  const board = (
    <div
      className="relative select-none"
      style={{
        width: boardPx,
        aspectRatio: '1',
        borderRadius: 12,
        border: `3px solid ${T.heading}`,
        overflow: 'hidden',
        background: T.cardBg,
      }}
    >
      <div
        className="grid w-full h-full"
        style={{
          gridTemplateColumns: `repeat(${n}, 1fr)`,
          gridTemplateRows: `repeat(${n}, 1fr)`,
        }}
        role="grid"
        aria-label={`${n} by ${n} sudoku grid`}
      >
        {values.map((v, i) => {
          const isSel = i === selected;
          const isConflict = conflicts.has(i);
          const given = puzzle.givens[i] !== undefined;
          return (
            <button
              key={i}
              role="gridcell"
              onClick={() => setSelected(i)}
              aria-label={`Row ${Math.floor(i / n) + 1}, column ${(i % n) + 1}${v ? `, ${v}` : ', empty'}${cageSumAt.has(i) ? `, cage sum ${cageSumAt.get(i)}` : ''}`}
              aria-selected={isSel}
              className="relative flex items-center justify-center"
              style={{
                background: backgrounds[i],
                outline: 'none',
              }}
            >
              {v ? (
                <span
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: n === 6 ? 'clamp(1.3rem, 6vw, 1.9rem)' : 'clamp(1rem, 4.5vw, 1.5rem)',
                    color: isConflict
                      ? '#EF4444'
                      : given
                        ? T.heading
                        : revealed.includes(i)
                          ? '#D97706'
                          : isDark
                            ? '#7DD3FC'
                            : '#0369A1',
                  }}
                >
                  {v}
                </span>
              ) : notes[i] ? (
                <span
                  className="absolute inset-0 grid p-[18%] pt-[26%]"
                  style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
                  aria-hidden
                >
                  {Array.from({ length: n }, (_, k) => k + 1).map(d => (
                    <span
                      key={d}
                      className="flex items-center justify-center"
                      style={{ fontSize: '0.6rem', fontWeight: 800, color: T.textMuted }}
                    >
                      {notes[i] & (1 << d) ? d : ''}
                    </span>
                  ))}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <BoardOverlay puzzle={puzzle} T={T} isDark={isDark} backgrounds={backgrounds} />
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-4">
      {puzzle.sandwich ? (
        <SandwichFrame puzzle={puzzle} T={T} boardPx={boardPx}>
          {board}
        </SandwichFrame>
      ) : (
        board
      )}

      {message && (
        <p
          className="text-sm font-bold rounded-xl px-3 py-2 border"
          style={{ background: T.wrongBg, borderColor: T.wrongBorder, color: T.text }}
          role="status"
        >
          {message}
        </p>
      )}

      {!api.finished && (
        <div className="w-full" style={{ maxWidth: 450 }}>
          <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
            {Array.from({ length: n }, (_, k) => k + 1).map(d => (
              <button
                key={d}
                onClick={() => enter(d)}
                className="py-3 rounded-2xl border-2 transition-transform active:scale-95"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '1.3rem',
                  background: T.cardBg,
                  borderColor: T.cardBorder,
                  color: noteMode ? T.textMuted : T.heading,
                }}
                aria-label={noteMode ? `Note ${d}` : `Enter ${d}`}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <ToolButton onClick={() => enter(0)} T={T} label="Erase">
              <Eraser size={16} />
            </ToolButton>
            <ToolButton
              onClick={() => setNoteMode(v => !v)}
              T={T}
              label={noteMode ? 'Notes on' : 'Notes off'}
              active={noteMode}
            >
              <Pencil size={16} />
            </ToolButton>
            <ToolButton
              onClick={hint}
              T={T}
              label={revealed.length ? `Hint · ${revealed.length}` : 'Hint'}
            >
              <Lightbulb size={16} />
            </ToolButton>
          </div>
        </div>
      )}
    </div>
  );
}

function cellBackground(
  s: { isSel: boolean; related: boolean; sameDigit: boolean; isConflict: boolean },
  T: Theme,
  isDark: boolean
) {
  if (s.isSel) return isDark ? '#0C4A6E' : '#BAE6FD';
  if (s.isConflict) return T.wrongBg;
  if (s.sameDigit) return isDark ? '#164E63' : '#E0F2FE';
  if (s.related) return isDark ? '#1E1846' : '#F0F9FF';
  return T.cardBg;
}

function ToolButton({
  onClick,
  T,
  label,
  active,
  children,
}: {
  onClick: () => void;
  T: Theme;
  label: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className="py-2.5 rounded-2xl border-2 flex items-center justify-center gap-1.5 text-sm font-extrabold"
      style={{
        background: active ? ACCENT : T.cardBg,
        borderColor: active ? ACCENT : T.cardBorder,
        color: active ? 'white' : T.brandText,
      }}
    >
      {children}
      {label}
    </button>
  );
}

/** Grid lines, box borders and cage outlines, drawn over the cells. */
function BoardOverlay({
  puzzle,
  T,
  isDark,
  backgrounds,
}: {
  puzzle: SudokuPuzzle;
  T: Theme;
  isDark: boolean;
  /** Each cell's current fill, so a cage label's backing matches its cell. */
  backgrounds: string[];
}) {
  const n = puzzle.size;
  const span = n * CELL;
  const thin = isDark ? '#393547' : '#CBD5E1';
  const cageInk = isDark ? '#E2E8F0' : '#334155';

  // Cell edges are thick where the region changes — square boxes and jigsaw
  // shapes alike. Thin edges first so thick ones draw over their ends.
  const regions = regionOf(puzzle);
  const thinEdges: React.ReactNode[] = [];
  const thickEdges: React.ReactNode[] = [];
  for (let i = 0; i < n * n; i++) {
    const r = Math.floor(i / n);
    const c = i % n;
    if (c < n - 1) {
      const edge = { x1: (c + 1) * CELL, y1: r * CELL, x2: (c + 1) * CELL, y2: (r + 1) * CELL };
      const thick = regions[i] !== regions[i + 1];
      (thick ? thickEdges : thinEdges).push(
        <line
          key={`v${i}`}
          {...edge}
          stroke={thick ? T.heading : thin}
          strokeWidth={thick ? 5 : 2}
          strokeLinecap="round"
        />
      );
    }
    if (r < n - 1) {
      const edge = { x1: c * CELL, y1: (r + 1) * CELL, x2: (c + 1) * CELL, y2: (r + 1) * CELL };
      const thick = regions[i] !== regions[i + n];
      (thick ? thickEdges : thinEdges).push(
        <line
          key={`h${i}`}
          {...edge}
          stroke={thick ? T.heading : thin}
          strokeWidth={thick ? 5 : 2}
          strokeLinecap="round"
        />
      );
    }
  }
  const lines = [...thinEdges, ...thickEdges];
  const centre = (cell: number) => ({
    x: (cell % n) * CELL + CELL / 2,
    y: Math.floor(cell / n) * CELL + CELL / 2,
  });
  const clueInk = isDark ? '#94A3B8' : '#64748B';

  return (
    <svg
      viewBox={`0 0 ${span} ${span}`}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden
    >
      {/* Under the grid lines: diagonals, thermometers, arrows. Translucent,
          so digits stay readable through them. */}
      {puzzle.diagonal && (
        <g stroke={clueInk} strokeWidth={3} strokeDasharray="10 8" opacity={0.6}>
          <line x1={0} y1={0} x2={span} y2={span} />
          <line x1={span} y1={0} x2={0} y2={span} />
        </g>
      )}
      {(puzzle.thermos ?? []).map((thermo, ti) => {
        const pts = thermo.map(centre);
        return (
          <g key={`t${ti}`} opacity={0.35} fill={clueInk} stroke={clueInk}>
            <polyline
              points={pts.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              strokeWidth={24}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx={pts[0].x} cy={pts[0].y} r={34} stroke="none" />
          </g>
        );
      })}
      {(puzzle.arrows ?? []).map((arrow, ai) => {
        const c = centre(arrow.circle);
        const pts = arrow.path.map(centre);
        const last = pts[pts.length - 1];
        const prev = pts.length > 1 ? pts[pts.length - 2] : c;
        const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
        const head = (a: number) =>
          `${last.x - 22 * Math.cos(angle + a)},${last.y - 22 * Math.sin(angle + a)}`;
        // Start the shaft at the circle's rim, not its centre.
        const first = pts[0];
        const a0 = Math.atan2(first.y - c.y, first.x - c.x);
        const start = { x: c.x + 36 * Math.cos(a0), y: c.y + 36 * Math.sin(a0) };
        return (
          <g
            key={`a${ai}`}
            stroke={clueInk}
            strokeWidth={4}
            fill="none"
            opacity={0.85}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx={c.x} cy={c.y} r={36} />
            <polyline points={[start, ...pts].map(p => `${p.x},${p.y}`).join(' ')} />
            <polyline points={`${head(0.5)} ${last.x},${last.y} ${head(-0.5)}`} />
          </g>
        );
      })}
      {(puzzle.cages ?? []).map((cage, ci) => (
        <g key={ci}>
          {cageOutline(cage, n, CELL, 9).map((s, si) => (
            <line
              key={si}
              {...s}
              stroke={cageInk}
              strokeWidth={2.5}
              strokeDasharray="8 7"
              strokeLinecap="round"
            />
          ))}
        </g>
      ))}
      {lines}
      {(puzzle.cages ?? []).map((cage, ci) => {
        const first = Math.min(...cage.cells);
        const x = (first % n) * CELL + 5;
        const y = Math.floor(first / n) * CELL + 4;
        const label = String(cage.sum);
        return (
          <g key={`l${ci}`}>
            {/* A backing in the cell's colour breaks the dashed line, like print. */}
            <rect x={x} y={y} width={label.length * 15 + 8} height={26} fill={backgrounds[first]} />
            <text
              x={x + 4}
              y={y + 21}
              fontSize={24}
              fontWeight={800}
              fontFamily="Nunito, sans-serif"
              fill={cageInk}
            >
              {label}
            </text>
          </g>
        );
      })}
      {(puzzle.kropki ?? []).map((dot, di) => {
        const a = centre(dot.a);
        const b = centre(dot.b);
        return (
          <circle
            key={`k${di}`}
            cx={(a.x + b.x) / 2}
            cy={(a.y + b.y) / 2}
            r={11}
            // Literal black and white in both themes: the colour IS the clue,
            // so it can't follow the theme's ink (near-white in dark mode).
            fill={dot.color === 'black' ? '#111827' : '#FFFFFF'}
            stroke={isDark ? '#E2E8F0' : '#111827'}
            strokeWidth={3}
          />
        );
      })}
    </svg>
  );
}

/** Sandwich clues sit outside the grid: column sums above, row sums to the left. */
function SandwichFrame({
  puzzle,
  T,
  boardPx,
  children,
}: {
  puzzle: SudokuPuzzle;
  T: Theme;
  boardPx: string;
  children: React.ReactNode;
}) {
  const n = puzzle.size;
  const { rows, cols } = puzzle.sandwich!;
  const clue = (v: number | null, key: string) => (
    <span
      key={key}
      className="flex items-center justify-center"
      style={{ fontFamily: "'Outfit', sans-serif", fontSize: '0.95rem', color: T.heading }}
    >
      {v ?? ''}
      {v != null && <span className="sr-only"> sandwich sum</span>}
    </span>
  );
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `28px ${boardPx}`,
        gridTemplateRows: '28px auto',
        width: `calc(${boardPx} + 28px)`,
        maxWidth: '100%',
      }}
    >
      <span />
      <div className="grid px-[3px]" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
        {cols.map((v, i) => clue(v, `c${i}`))}
      </div>
      <div className="grid py-[3px]" style={{ gridTemplateRows: `repeat(${n}, 1fr)` }}>
        {rows.map((v, i) => clue(v, `r${i}`))}
      </div>
      {children}
    </div>
  );
}
