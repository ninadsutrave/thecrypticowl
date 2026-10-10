import { useDarkMode } from '../../context/DarkModeContext';
import { getTheme } from '../../theme';
import { makeGrid } from './logic';

const S = 34;
const M = 10;

/** A small static Slitherlink for the tutorial: clues, and the edges drawn so far. */
export function MiniLoop({
  rows,
  cols,
  clues,
  lines,
  crosses = [],
}: {
  rows: number;
  cols: number;
  clues: string;
  lines: number[];
  crosses?: number[];
}) {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const grid = makeGrid(rows, cols);
  const px = (v: number) => M + v * S;
  const drawn = new Set(lines);
  const crossed = new Set(crosses);
  // Same colours as the game: green when exactly surrounded (a 0 once its
  // sides are all crossed out), red when over.
  const tint = (i: number, k: number) => {
    const n = grid.cellEdges[i].filter(e => drawn.has(e)).length;
    const met = n === k && (k > 0 || grid.cellEdges[i].every(e => crossed.has(e)));
    if (n > k) return '#EF4444';
    if (met) return isDark ? '#34D399' : '#059669';
    return T.heading;
  };
  return (
    <svg
      viewBox={`0 0 ${cols * S + 2 * M} ${rows * S + 2 * M}`}
      width={cols * S + 2 * M}
      style={{ background: T.cardBg, borderRadius: 10, border: `1px solid ${T.cardBorder}` }}
      aria-hidden
    >
      {[...clues].map((ch, i) =>
        ch === '.' ? null : (
          <text
            key={i}
            x={px(i % cols) + S / 2}
            y={px(Math.floor(i / cols)) + S / 2}
            textAnchor="middle"
            dominantBaseline="central"
            style={{ fontFamily: "'Outfit', sans-serif", fontSize: 17, fill: tint(i, Number(ch)) }}
          >
            {ch}
          </text>
        )
      )}
      {lines.map(e => {
        const [[r1, c1], [r2, c2]] = grid.ends[e];
        return (
          <line
            key={e}
            x1={px(c1)}
            y1={px(r1)}
            x2={px(c2)}
            y2={px(r2)}
            stroke="#6366F1"
            strokeWidth={4.5}
            strokeLinecap="round"
          />
        );
      })}
      {crosses.map(e => {
        const [[r1, c1], [r2, c2]] = grid.ends[e];
        const x = (px(c1) + px(c2)) / 2;
        const y = (px(r1) + px(r2)) / 2;
        return (
          <g key={e} stroke={T.textMuted} strokeWidth={1.6} strokeLinecap="round">
            <line x1={x - 3.5} y1={y - 3.5} x2={x + 3.5} y2={y + 3.5} />
            <line x1={x - 3.5} y1={y + 3.5} x2={x + 3.5} y2={y - 3.5} />
          </g>
        );
      })}
      {Array.from({ length: (rows + 1) * (cols + 1) }, (_, k) => (
        <circle
          key={k}
          cx={px(k % (cols + 1))}
          cy={px(Math.floor(k / (cols + 1)))}
          r={2.6}
          fill={T.heading}
        />
      ))}
    </svg>
  );
}
