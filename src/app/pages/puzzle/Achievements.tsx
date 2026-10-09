import { m } from 'motion/react';
import { Trophy } from 'lucide-react';
import { getTheme } from '../../theme';
import { useStreak } from '../../hooks/useStreak';
// ─── ACHIEVEMENTS ─────────────────────────────────────────────────────────────

export function Achievements({ isDark }: { isDark: boolean }) {
  const T = getTheme(isDark);
  const { count, bestStreak } = useStreak();

  const milestones = [
    { label: 'First solve!', target: 1, emoji: '🎉', achieved: bestStreak >= 1 },
    { label: '3-day streak', target: 3, emoji: '🔥', achieved: count >= 3 || bestStreak >= 3 },
    { label: '7-day streak', target: 7, emoji: '🏅', achieved: count >= 7 || bestStreak >= 7 },
    { label: '30-day streak', target: 30, emoji: '🏆', achieved: count >= 30 || bestStreak >= 30 },
  ];

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="max-w-2xl mx-auto px-4 pb-4"
    >
      <div
        className="rounded-3xl p-6 border shadow-sm"
        style={{ background: T.cardBg, borderColor: T.cardBorder }}
      >
        <div className="flex items-center gap-3 mb-5">
          <Trophy size={22} style={{ color: '#D97706' }} />
          <h3
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '1.2rem',
              color: T.heading,
            }}
          >
            Your Achievements
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {milestones.map((ms, i) => (
            <m.div
              key={i}
              whileHover={{ scale: 1.05 }}
              className="text-center rounded-2xl p-3 border-2 transition-all"
              style={{
                background: ms.achieved
                  ? isDark
                    ? '#1A0F35'
                    : '#F5F0FF'
                  : isDark
                    ? '#1A1035'
                    : '#F9F9F9',
                borderColor: ms.achieved ? '#7C3AED' : isDark ? '#3D2A6B' : '#E5E7EB',
                // Locked milestones are marked by the greyed emoji and muted
                // border — not by fading the whole card, which took the label
                // below contrast.
              }}
            >
              <div
                className="text-2xl mb-1"
                style={{ filter: ms.achieved ? 'none' : 'grayscale(100%)' }}
              >
                {ms.emoji}
              </div>
              <p
                style={{
                  fontSize: '0.75rem',
                  color: ms.achieved ? T.brandText : T.textMuted,
                  fontWeight: 700,
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                {ms.label}
              </p>
              {ms.achieved && (
                <div
                  className="mt-1.5 rounded-full px-2 py-0.5"
                  style={{ background: '#7C3AED', display: 'inline-block' }}
                >
                  <span style={{ fontSize: '0.65rem', color: 'white', fontWeight: 700 }}>
                    EARNED
                  </span>
                </div>
              )}
            </m.div>
          ))}
        </div>
        <p
          className="mt-4 text-center"
          style={{ fontSize: '0.8rem', color: T.textMuted, fontWeight: 600 }}
        >
          Solve daily puzzles to unlock achievements 🦉
        </p>
      </div>
    </m.div>
  );
}
