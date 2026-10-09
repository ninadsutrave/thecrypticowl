import { useDarkMode } from '../../context/DarkModeContext';
import { getTheme } from '../../theme';
import type { Rect, ShikakuClue } from './sample';

const ACCENT = '#6366F1';
const FILLS = ['#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#EC4899'];

/** A small static Shikaku grid for the tutorial. */
export function MiniGrid({
  clues,
  rects,
  draft,
}: {
  clues: ShikakuClue[];
  rects: Rect[];
  draft?: Rect;
}) {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const cell = 34;
  const at = (v: number) => v * cell;
  return (
    <div
      className="relative"
      style={{
        width: cell * 4,
        height: cell * 4,
        border: `2px solid ${T.heading}`,
        borderRadius: 8,
        background: T.cardBg,
        backgroundImage: `linear-gradient(${T.cardBorder} 1px, transparent 1px), linear-gradient(90deg, ${T.cardBorder} 1px, transparent 1px)`,
        backgroundSize: `${cell}px ${cell}px`,
      }}
      aria-hidden
    >
      {rects.map((q, i) => (
        <div
          key={i}
          className="absolute rounded-md"
          style={{
            top: at(q.r) + 2,
            left: at(q.c) + 2,
            width: at(q.w) - 4,
            height: at(q.h) - 4,
            background: `${FILLS[i % FILLS.length]}33`,
            border: `2px solid ${FILLS[i % FILLS.length]}`,
          }}
        />
      ))}
      {draft && (
        <div
          className="absolute rounded-md"
          style={{
            top: at(draft.r) + 1,
            left: at(draft.c) + 1,
            width: at(draft.w) - 2,
            height: at(draft.h) - 2,
            border: `2.5px solid ${ACCENT}`,
            background: `${ACCENT}14`,
          }}
        />
      )}
      {clues.map(k => (
        <span
          key={`${k.r}-${k.c}`}
          className="absolute flex items-center justify-center"
          style={{
            top: at(k.r),
            left: at(k.c),
            width: cell,
            height: cell,
            fontFamily: "'Outfit', sans-serif",
            color: T.heading,
          }}
        >
          {k.n}
        </span>
      ))}
    </div>
  );
}
