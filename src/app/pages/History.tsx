import { motion, AnimatePresence } from 'motion/react';
import { GoogleLogin } from '@react-oauth/google';
import { Trophy, Zap, Flame, Target, BookOpen, Lock, LogOut, Calendar, Puzzle as PuzzleIcon, ChevronRight } from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';
import { getTheme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useStreak, getLevelTitle, SolveRecord } from '../hooks/useStreak';
import { Mascot } from '../components/Mascot';
import { useNavigate } from 'react-router';

// ─── PUZZLE ARCHIVE ───────────────────────────────────────────────────────────

const PUZZLE_ARCHIVE = [
  {
    number: 42,
    date: 'Sun Apr 06 2026',
    clue: 'Pears mixed up to form a weapon (5)',
    type: 'Anagram',
    path: '/puzzle',
  },
];

// ─── SIGN IN GATE ─────────────────────────────────────────────────────────────

function SignInGate({ isDark }: { isDark: boolean }) {
  const T = getTheme(isDark);
  const { signIn } = useAuth();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const features = [
    { icon: '📅', label: 'Browse the full puzzle archive' },
    { icon: '📊', label: 'Track your solve history & stats' },
    { icon: '🔥', label: 'Keep your streak across devices (coming soon)' },
    { icon: '🏅', label: 'See your XP and level progression' },
  ];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-16 relative"
      style={{ background: T.pageBg }}
    >
      {/* Floating bg letters */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden>
        {['H', 'I', 'S', 'T', 'O', 'R', 'Y', '?', '★'].map((char, i) => (
          <motion.div
            key={i}
            className="absolute select-none"
            style={{
              left: `${10 + i * 10}%`,
              top: `${10 + (i % 3) * 30}%`,
              fontSize: 40 + (i % 3) * 12,
              color: ['#C4B5FD', '#A7F3D0', '#FDE68A'][i % 3],
              fontFamily: "'Fredoka One', cursive",
              opacity: isDark ? 0.05 : 0.1,
            }}
            animate={{ y: [0, -14, 0], rotate: [0, 4, -4, 0] }}
            transition={{ duration: 5 + i * 0.5, delay: i * 0.3, repeat: Infinity, ease: 'easeInOut' }}
          >
            {char}
          </motion.div>
        ))}
      </div>

      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Card */}
        <div
          className="rounded-3xl border p-8 text-center"
          style={{ background: T.cardBg, borderColor: T.cardBorder, boxShadow: isDark ? '0 8px 40px rgba(0,0,0,0.4)' : '0 8px 40px rgba(124,58,237,0.08)' }}
        >
          {/* Mascot */}
          <div className="flex justify-center mb-4">
            <Mascot mood="thinking" size={90} speechBubble="Sign in to unlock!" bubbleDirection="right" />
          </div>

          {/* Lock icon */}
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4"
            style={{ background: isDark ? '#261845' : '#F5F0FF', border: `2px solid ${isDark ? '#4C3580' : '#C4B5FD'}` }}
          >
            <Lock size={24} style={{ color: isDark ? '#C4B5FD' : '#7C3AED' }} />
          </div>

          <h1
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: '1.8rem',
              color: isDark ? '#F0EAFF' : '#1E1B4B',
              marginBottom: '0.5rem',
            }}
          >
            Unlock Your History
          </h1>
          <p style={{ color: T.textMuted, fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Sign in with Google to access your puzzle history, track stats, and browse the full archive.
          </p>

          {/* Feature list */}
          <div className="text-left mb-6 flex flex-col gap-2">
            {features.map((f, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-3 px-3 py-2 rounded-xl"
                style={{ background: isDark ? '#1A1035' : '#F9F7FF' }}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.07 }}
              >
                <span style={{ fontSize: '1.1rem' }}>{f.icon}</span>
                <span style={{ color: T.textSub, fontSize: '0.88rem', fontWeight: 600 }}>{f.label}</span>
              </motion.div>
            ))}
          </div>

          {/* Google sign-in */}
          {!clientId ? (
            <div
              className="rounded-xl p-3 text-sm"
              style={{ background: isDark ? '#2A1505' : '#FFF7ED', color: isDark ? '#FB923C' : '#C2410C', border: `1px solid ${isDark ? '#7C2D12' : '#FED7AA'}` }}
            >
              <strong>Dev note:</strong> Set <code>VITE_GOOGLE_CLIENT_ID</code> in <code>.env</code> to enable Google sign-in. See <code>.env.example</code>.
            </div>
          ) : (
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={(response) => {
                  if (response.credential) signIn(response.credential);
                }}
                onError={() => {}}
                theme={isDark ? 'filled_black' : 'outline'}
                shape="pill"
                text="signin_with"
                size="large"
              />
            </div>
          )}

          <p style={{ color: T.textFaint, fontSize: '0.78rem', marginTop: '1rem' }}>
            The daily puzzle and all lessons are always free — no sign-in needed.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────

function StatCard({
  emoji, label, value, isDark,
}: {
  emoji: string; label: string; value: string | number; isDark: boolean;
}) {
  const T = getTheme(isDark);
  return (
    <motion.div
      className="rounded-2xl border p-4 text-center"
      style={{ background: T.cardBg, borderColor: T.cardBorder }}
      whileHover={{ y: -2, scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div style={{ fontSize: '1.6rem', marginBottom: '0.25rem' }}>{emoji}</div>
      <div
        style={{
          fontFamily: "'Fredoka One', cursive",
          fontSize: '1.5rem',
          color: isDark ? '#C4B5FD' : '#5B21B6',
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: '0.75rem', color: T.textMuted, fontWeight: 600, marginTop: '0.15rem' }}>
        {label}
      </div>
    </motion.div>
  );
}

// ─── SOLVE HISTORY ROW ────────────────────────────────────────────────────────

function SolveRow({ record, isDark, index }: { record: SolveRecord; isDark: boolean; index: number }) {
  const T = getTheme(isDark);
  const hintColors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#EF4444'];
  const hintLabels = ['No hints', '1 hint', '2 hints', '3 hints', '4+ hints'];
  const hintsIdx = Math.min(record.hintsUsed, 4);

  return (
    <motion.div
      className="flex items-center justify-between px-4 py-3 rounded-2xl border"
      style={{ background: T.cardBg, borderColor: T.cardBorder }}
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.25 }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center w-9 h-9 rounded-xl"
          style={{ background: isDark ? '#261845' : '#F5F0FF' }}
        >
          <PuzzleIcon size={16} style={{ color: isDark ? '#C4B5FD' : '#7C3AED' }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, color: T.text, fontSize: '0.9rem' }}>
            Puzzle #{record.puzzleNumber}
          </div>
          <div style={{ fontSize: '0.75rem', color: T.textMuted }}>{record.date}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span
          className="px-2 py-0.5 rounded-full text-xs font-bold"
          style={{
            background: isDark ? '#1A1035' : '#F5F0FF',
            color: hintColors[hintsIdx],
            border: `1px solid ${hintColors[hintsIdx]}40`,
          }}
        >
          {hintLabels[hintsIdx]}
        </span>
        <div className="flex items-center gap-1">
          <Zap size={13} style={{ color: '#F59E0B' }} />
          <span style={{ fontFamily: "'Fredoka One', cursive", color: '#F59E0B', fontSize: '0.9rem' }}>
            +{record.xpEarned}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── ARCHIVE ROW ──────────────────────────────────────────────────────────────

function ArchiveRow({
  puzzle, isDark, index,
}: {
  puzzle: typeof PUZZLE_ARCHIVE[0]; isDark: boolean; index: number;
}) {
  const T = getTheme(isDark);
  const navigate = useNavigate();

  return (
    <motion.button
      className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-left transition-all"
      style={{ background: T.cardBg, borderColor: T.cardBorder }}
      onClick={() => navigate(puzzle.path)}
      whileHover={{ y: -1, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center w-9 h-9 rounded-xl"
          style={{ background: isDark ? '#261845' : '#F5F0FF' }}
        >
          <Calendar size={16} style={{ color: isDark ? '#C4B5FD' : '#7C3AED' }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, color: T.text, fontSize: '0.9rem' }}>
            Puzzle #{puzzle.number} — {puzzle.type}
          </div>
          <div style={{ fontSize: '0.75rem', color: T.textMuted }}>{puzzle.date}</div>
        </div>
      </div>
      <ChevronRight size={18} style={{ color: T.textFaint }} />
    </motion.button>
  );
}

// ─── MAIN HISTORY PAGE ────────────────────────────────────────────────────────

export function History() {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const { user, signOut, isSignedIn } = useAuth();
  const { count, totalSolved, xp, level, bestStreak, history } = useStreak();
  const levelTitle = getLevelTitle(level);

  if (!isSignedIn) {
    return <SignInGate isDark={isDark} />;
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: T.pageBg, fontFamily: "'Nunito', sans-serif" }}
    >
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* ── Profile card ── */}
        <motion.div
          className="rounded-3xl border p-6 mb-6"
          style={{ background: T.cardBg, borderColor: T.cardBorder, boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(124,58,237,0.07)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {user?.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-16 h-16 rounded-full"
                  style={{ border: `3px solid ${isDark ? '#4C3580' : '#C4B5FD'}` }}
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: isDark ? '#261845' : '#F5F0FF', border: `3px solid ${isDark ? '#4C3580' : '#C4B5FD'}` }}
                >
                  <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.5rem', color: isDark ? '#C4B5FD' : '#7C3AED' }}>
                    {user?.name?.[0] ?? '?'}
                  </span>
                </div>
              )}
              <div>
                <h2
                  style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.3rem', color: isDark ? '#F0EAFF' : '#1E1B4B', margin: 0 }}
                >
                  {user?.name}
                </h2>
                <p style={{ color: T.textMuted, fontSize: '0.83rem', margin: '2px 0 6px' }}>{user?.email}</p>
                <span
                  className="px-3 py-0.5 rounded-full text-sm font-bold"
                  style={{ background: isDark ? '#261845' : '#F5F0FF', color: isDark ? '#C4B5FD' : '#7C3AED', border: `1px solid ${isDark ? '#4C3580' : '#C4B5FD'}` }}
                >
                  {levelTitle}
                </span>
              </div>
            </div>
            <motion.button
              onClick={signOut}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors"
              style={{ color: isDark ? '#9381CC' : '#6B7280', borderColor: T.cardBorder, background: 'transparent' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <LogOut size={14} />
              Sign out
            </motion.button>
          </div>
        </motion.div>

        {/* ── Stats grid ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="mb-6"
        >
          <h3
            style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.1rem', color: isDark ? '#C4B5FD' : '#5B21B6', marginBottom: '0.75rem' }}
          >
            Your Stats
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard emoji="🔥" label="Current Streak" value={count} isDark={isDark} />
            <StatCard emoji="🧩" label="Total Solved" value={totalSolved} isDark={isDark} />
            <StatCard emoji="🏅" label="Best Streak" value={bestStreak} isDark={isDark} />
            <StatCard emoji="⚡" label="Total XP" value={xp} isDark={isDark} />
          </div>
        </motion.div>

        {/* ── Solve history ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="mb-6"
        >
          <h3
            style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.1rem', color: isDark ? '#C4B5FD' : '#5B21B6', marginBottom: '0.75rem' }}
          >
            Solve History
          </h3>
          <AnimatePresence>
            {history.length === 0 ? (
              <motion.div
                className="rounded-2xl border p-8 text-center"
                style={{ background: T.cardBg, borderColor: T.cardBorder }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🧩</div>
                <p style={{ color: T.textMuted, fontSize: '0.9rem' }}>
                  No solves yet — go crack{' '}
                  <a href="/puzzle" style={{ color: isDark ? '#C4B5FD' : '#7C3AED', fontWeight: 700 }}>
                    today's puzzle
                  </a>
                  !
                </p>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-2">
                {history.map((record, i) => (
                  <SolveRow key={`${record.date}-${record.puzzleNumber}`} record={record} isDark={isDark} index={i} />
                ))}
              </div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Puzzle archive ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3
              style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.1rem', color: isDark ? '#C4B5FD' : '#5B21B6' }}
            >
              Puzzle Archive
            </h3>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ background: isDark ? '#261845' : '#F5F0FF', color: isDark ? '#9381CC' : '#6D28D9' }}
            >
              {PUZZLE_ARCHIVE.length} puzzle{PUZZLE_ARCHIVE.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {PUZZLE_ARCHIVE.map((puzzle, i) => (
              <ArchiveRow key={puzzle.number} puzzle={puzzle} isDark={isDark} index={i} />
            ))}
          </div>

          {/* Coming soon placeholder */}
          <motion.div
            className="rounded-2xl border border-dashed p-5 text-center mt-3"
            style={{ borderColor: isDark ? '#3D2A6B' : '#C4B5FD', background: isDark ? '#100820' : '#FAFAFF' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <BookOpen size={20} style={{ color: isDark ? '#4C3580' : '#C4B5FD', margin: '0 auto 0.5rem' }} />
            <p style={{ color: T.textFaint, fontSize: '0.83rem', margin: 0 }}>
              More puzzles added daily — check back tomorrow!
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
