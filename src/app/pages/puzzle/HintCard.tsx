import { m } from 'motion/react';
import { Mascot } from '../../components/Mascot';
import type { PuzzleHintCard } from './types';
// ─── HINT CARD ────────────────────────────────────────────────────────────────

export function HintCard({
  hint,
  index,
  isNew,
  isDark,
}: {
  hint: PuzzleHintCard;
  index: number;
  isNew: boolean;
  isDark: boolean;
}) {
  return (
    <m.div
      initial={isNew ? { opacity: 0, y: 20, scale: 0.95 } : { opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="rounded-3xl border-2 overflow-hidden shadow-sm"
      style={{ borderColor: hint.border, background: isDark ? hint.bgDark : hint.bg }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{
              background: hint.color,
              color: 'white',
              fontFamily: "'Outfit', sans-serif",
              fontSize: '0.85rem',
            }}
          >
            {index + 1}
          </div>
          <div className="flex-1">
            <h3
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: '1rem',
                color: hint.color,
                marginBottom: 4,
              }}
            >
              Hint {index + 1}: {hint.title}
            </h3>
            <p
              style={{
                fontSize: '0.88rem',
                color: isDark ? '#C4B5FD' : '#374151',
                lineHeight: 1.6,
                fontFamily: "'Nunito', sans-serif",
                fontWeight: 600,
              }}
            >
              {hint.text}
            </p>
          </div>
        </div>
        <div
          className="mt-3 flex items-center gap-2.5 rounded-2xl p-3"
          style={{ background: isDark ? 'rgba(26,16,53,0.8)' : 'rgba(255,255,255,0.7)' }}
        >
          <Mascot mood={index < 2 ? 'hint' : 'thinking'} size={40} animate={false} />
          <p
            style={{
              fontSize: '0.82rem',
              color: isDark ? '#C4B5FD' : '#4C1D95',
              fontFamily: "'Nunito', sans-serif",
              fontWeight: 700,
              lineHeight: 1.5,
            }}
          >
            {hint.mascotComment}
          </p>
        </div>
      </div>
    </m.div>
  );
}
