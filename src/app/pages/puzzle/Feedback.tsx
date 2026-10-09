import { m } from 'motion/react';
import { Mascot } from '../../components/Mascot';
// ─── WRONG ANSWER FEEDBACK ────────────────────────────────────────────────────

export function WrongFeedback({
  attempt,
  onDismiss,
  isDark,
}: {
  attempt: string;
  onDismiss: () => void;
  isDark: boolean;
}) {
  const messages = [
    'Hmm… not quite! Try again? 🤔',
    'Ooh, close but no cigar! Give it another go! 🎯',
    "Not this time — but you're thinking the right way! 💡",
    'Keep going! The answer is closer than you think! 🔍',
  ];
  const msg = messages[Math.floor(Math.random() * messages.length)];

  return (
    <m.div
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.96 }}
      className="rounded-2xl p-4 flex items-start gap-3"
      style={{
        background: isDark ? '#2A0F15' : '#FFF1F2',
        border: `2px solid ${isDark ? '#F87171' : '#FCA5A5'}`,
      }}
    >
      <Mascot mood="wrong" size={48} animate={false} />
      <div className="flex-1">
        <p
          style={{
            fontFamily: "'Fredoka One', cursive",
            fontSize: '0.95rem',
            color: '#BE123C',
            marginBottom: 2,
          }}
        >
          Not quite!
        </p>
        <p
          style={{
            fontSize: '0.83rem',
            color: isDark ? '#FCA5A5' : '#9F1239',
            fontFamily: "'Nunito', sans-serif",
            fontWeight: 600,
          }}
        >
          "{attempt.toUpperCase()}" — {msg}
        </p>
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss wrong-answer feedback"
        style={{ color: '#FDA4AF' }}
        className="hover:text-[#FB7185] transition-colors mt-0.5"
      >
        ✕
      </button>
    </m.div>
  );
}

// ─── ALREADY SOLVED BANNER ���───────────────────────────────────────────────────

export function AlreadySolvedBanner({
  isDark,
  onSolvePractice: _onSolvePractice,
}: {
  isDark: boolean;
  onSolvePractice: () => void;
}) {
  return (
    <m.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 mb-4 border-2 flex items-center gap-3"
      style={{ background: isDark ? '#1A2A10' : '#ECFDF5', borderColor: '#6EE7B7' }}
    >
      <span className="text-2xl">✅</span>
      <div className="flex-1">
        <p style={{ fontFamily: "'Fredoka One', cursive", fontSize: '0.95rem', color: '#059669' }}>
          You've already solved today's puzzle!
        </p>
        <p
          style={{
            fontSize: '0.82rem',
            color: isDark ? '#6EE7B7' : '#065F46',
            fontFamily: "'Nunito', sans-serif",
            fontWeight: 600,
          }}
        >
          Come back tomorrow for a new clue, or practice again below.
        </p>
      </div>
    </m.div>
  );
}
