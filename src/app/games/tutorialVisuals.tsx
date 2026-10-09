import type { CSSProperties, ReactNode } from 'react';
import { useDarkMode } from '../context/DarkModeContext';
import { getTheme } from '../theme';

/**
 * Tiny building blocks for tutorial illustrations, so each game's steps read
 * as data rather than layout code.
 */

export type CellTone = 'plain' | 'given' | 'good' | 'bad' | 'focus' | 'muted';

export function Cells({
  items,
  size = 34,
  tones,
  sub,
}: {
  items: (string | number)[];
  size?: number;
  tones?: CellTone[];
  /** Small caption under each cell (e.g. the cipher letter). */
  sub?: string[];
}) {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const toneStyle = (tone: CellTone = 'plain'): CSSProperties => {
    switch (tone) {
      case 'given':
        return { background: T.cardBg, color: T.heading, borderColor: T.cardBorderStrong };
      case 'good':
        return {
          background: T.successBg,
          color: isDark ? '#6EE7B7' : '#047857',
          borderColor: T.successBorder,
        };
      case 'bad':
        return { background: T.wrongBg, color: '#EF4444', borderColor: T.wrongBorder };
      case 'focus':
        return {
          background: isDark ? '#4C1D95' : '#EDE9FE',
          color: T.heading,
          borderColor: '#7C3AED',
        };
      case 'muted':
        return { background: 'transparent', color: T.textMuted, borderColor: T.cardBorder };
      default:
        return { background: T.cardBg, color: T.brandText, borderColor: T.cardBorder };
    }
  };
  return (
    <div className="flex gap-1">
      {items.map((v, i) => (
        <div key={i} className="flex flex-col items-center">
          <span
            className="flex items-center justify-center rounded-lg border-2"
            style={{
              width: size,
              height: size,
              fontFamily: "'Fredoka One', cursive",
              fontSize: size * 0.48,
              ...toneStyle(tones?.[i]),
            }}
          >
            {v}
          </span>
          {sub && (
            <span className="text-[0.65rem] font-extrabold mt-0.5" style={{ color: T.textMuted }}>
              {sub[i]}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export function Pill({ children, color }: { children: ReactNode; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold"
      style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}
    >
      {children}
    </span>
  );
}

export function Stack({ children, gap = 8 }: { children: ReactNode; gap?: number }) {
  return (
    <div className="flex flex-col items-center" style={{ gap }}>
      {children}
    </div>
  );
}

/** A card-like row of text, as the games show events, clues and options. */
export function Line({
  children,
  tone = 'plain',
  width = 280,
}: {
  children: ReactNode;
  tone?: 'plain' | 'good' | 'bad' | 'focus' | 'muted';
  width?: number;
}) {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const styles: Record<string, CSSProperties> = {
    plain: { background: T.cardBg, borderColor: T.cardBorder, color: T.text },
    good: { background: T.successBg, borderColor: T.successBorder, color: T.text },
    bad: { background: T.wrongBg, borderColor: T.wrongBorder, color: T.text },
    focus: { background: T.cardBg, borderColor: '#F97316', color: T.text },
    muted: { background: 'transparent', borderColor: T.cardBorder, color: T.textMuted },
  };
  return (
    <div
      className="rounded-xl border-2 px-3 py-1.5 text-xs font-bold flex items-center gap-2"
      style={{ width, maxWidth: '100%', ...styles[tone] }}
    >
      {children}
    </div>
  );
}

/** A Killer cage: dashed outline with its sum tucked into the corner. */
export function CageExample({ sum, digits }: { sum: number; digits: number[] }) {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  return (
    <div className="relative p-2" style={{ border: `2px dashed ${T.textMuted}`, borderRadius: 10 }}>
      <span
        className="absolute -top-3 left-2 px-1 text-xs font-extrabold rounded"
        style={{ background: T.inputBg, color: T.textMuted }}
      >
        {sum}
      </span>
      <Cells items={digits} tones={digits.map(() => 'good')} />
    </div>
  );
}
