import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Zap, Lock, LogOut, Calendar, Puzzle as PuzzleIcon, ChevronRight, BookOpen, RefreshCw } from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';
import { getTheme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useStreak, getLevelTitle } from '../hooks/useStreak';
import { Mascot } from '../components/Mascot';
import { useNavigate } from 'react-router';
import {
  fetchSolveHistory,
  fetchUserStats,
  fetchPuzzleArchive,
  type DbSolveRecord,
  type DbDailyPuzzle,
  isSupabaseConfigured,
} from '../../lib/supabase';

// ─── GOOGLE ICON ──────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

// ─── SIGN-IN GATE ─────────────────────────────────────────────────────────────

function SignInGate({ isDark }: { isDark: boolean }) {
  const T = getTheme(isDark);
  const { signIn } = useAuth();

  const features = [
    { icon: '📅', label: 'Browse the full puzzle archive' },
    { icon: '📊', label: 'Track your solve history & stats' },
    { icon: '🔥', label: 'Keep your streak across devices' },
    { icon: '🏅', label: 'See your XP and level progression' },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 relative" style={{ background: T.pageBg }}>
      {/* Floating bg */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden>
        {['H', 'I', 'S', 'T', 'O', 'R', 'Y', '?', '★'].map((char, i) => (
          <motion.div
            key={i}
            className="absolute select-none"
            style={{
              left: `${10 + i * 10}%`, top: `${10 + (i % 3) * 30}%`,
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
        <div
          className="rounded-3xl border p-8 text-center"
          style={{
            background: T.cardBg, borderColor: T.cardBorder,
            boxShadow: isDark ? '0 8px 40px rgba(0,0,0,0.4)' : '0 8px 40px rgba(124,58,237,0.08)',
          }}
        >
          <div className="flex justify-center mb-4">
            <Mascot mood="thinking" size={90} speechBubble="Sign in to unlock!" bubbleDirection="right" />
          </div>

          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4"
            style={{ background: isDark ? '#261845' : '#F5F0FF', border: `2px solid ${isDark ? '#4C3580' : '#C4B5FD'}` }}
          >
            <Lock size={24} style={{ color: isDark ? '#C4B5FD' : '#7C3AED' }} />
          </div>

          <h1 style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.8rem', color: isDark ? '#F0EAFF' : '#1E1B4B', marginBottom: '0.5rem' }}>
            Unlock Your History
          </h1>
          <p style={{ color: T.textMuted, fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Sign in with Google to access your puzzle history, stats, and the full archive.
          </p>

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

          {!isSupabaseConfigured ? (
            <div
              className="rounded-xl p-3 text-sm text-left"
              style={{ background: isDark ? '#2A1505' : '#FFF7ED', color: isDark ? '#FB923C' : '#C2410C', border: `1px solid ${isDark ? '#7C2D12' : '#FED7AA'}` }}
            >
              <strong>Dev:</strong> Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env</code> — see <code>.env.example</code>.
            </div>
          ) : (
            <motion.button
              onClick={signIn}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-full font-bold"
              style={{
                background: isDark ? '#fff' : '#fff',
                color: '#3c4043',
                border: '1px solid #dadce0',
                fontFamily: "'Nunito', sans-serif",
                fontWeight: 700,
                fontSize: '0.95rem',
                boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              }}
              whileHover={{ scale: 1.02, boxShadow: '0 2px 10px rgba(0,0,0,0.15)' }}
              whileTap={{ scale: 0.98 }}
            >
              <GoogleIcon />
              Sign in with Google
            </motion.button>
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

function StatCard({ emoji, label, value, isDark }: { emoji: string; label: string; value: string | number; isDark: boolean }) {
  const T = getTheme(isDark);
  return (
    <motion.div
      className="rounded-2xl border p-4 text-center"
      style={{ background: T.cardBg, borderColor: T.cardBorder }}
      whileHover={{ y: -2, scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div style={{ fontSize: '1.6rem', marginBottom: '0.25rem' }}>{emoji}</div>
      <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.5rem', color: isDark ? '#C4B5FD' : '#5B21B6' }}>
        {value}
      </div>
      <div style={{ fontSize: '0.75rem', color: T.textMuted, fontWeight: 600, marginTop: '0.15rem' }}>
        {label}
      </div>
    </motion.div>
  );
}

// ─── SOLVE ROW ────────────────────────────────────────────────────────────────

function SolveRow({ record, isDark, index }: { record: DbSolveRecord; isDark: boolean; index: number }) {
  const T = getTheme(isDark);
  const hintColors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#EF4444'];
  const hintLabels = ['No hints', '1 hint', '2 hints', '3 hints', '4+ hints'];
  const hintsIdx = Math.min(record.hints_used, 4);
  const dateStr = new Date(record.solved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <motion.div
      className="flex items-center justify-between px-4 py-3 rounded-2xl border"
      style={{ background: T.cardBg, borderColor: T.cardBorder }}
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.22 }}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: isDark ? '#261845' : '#F5F0FF' }}>
          <PuzzleIcon size={16} style={{ color: isDark ? '#C4B5FD' : '#7C3AED' }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, color: T.text, fontSize: '0.9rem' }}>Puzzle #{record.puzzle_number}</div>
          <div style={{ fontSize: '0.75rem', color: T.textMuted }}>{dateStr}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span
          className="px-2 py-0.5 rounded-full text-xs font-bold"
          style={{ background: isDark ? '#1A1035' : '#F5F0FF', color: hintColors[hintsIdx], border: `1px solid ${hintColors[hintsIdx]}40` }}
        >
          {hintLabels[hintsIdx]}
        </span>
        <div className="flex items-center gap-1">
          <Zap size={13} style={{ color: '#F59E0B' }} />
          <span style={{ fontFamily: "'Fredoka One', cursive", color: '#F59E0B', fontSize: '0.9rem' }}>+{record.xp_earned}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── ARCHIVE ROW ──────────────────────────────────────────────────────────────

function ArchiveRow({ puzzle, isDark, index }: { puzzle: DbDailyPuzzle; isDark: boolean; index: number }) {
  const T = getTheme(isDark);
  const navigate = useNavigate();
  const dateStr = new Date(puzzle.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <motion.button
      className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-left"
      style={{ background: T.cardBg, borderColor: T.cardBorder }}
      onClick={() => navigate(`/puzzle/${puzzle.number}`)}
      whileHover={{ y: -1, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: isDark ? '#261845' : '#F5F0FF' }}>
          <Calendar size={16} style={{ color: isDark ? '#C4B5FD' : '#7C3AED' }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, color: T.text, fontSize: '0.9rem' }}>
            Puzzle #{puzzle.number}
            {puzzle.primary_type && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs" style={{ background: isDark ? '#1A1035' : '#F5F0FF', color: isDark ? '#C4B5FD' : '#7C3AED' }}>
                {puzzle.primary_type}
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.75rem', color: T.textMuted }}>{dateStr}</div>
        </div>
      </div>
      <ChevronRight size={18} style={{ color: T.textFaint }} />
    </motion.button>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export function History() {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const { user, signOut, isSignedIn } = useAuth();
  const localStreak = useStreak();
  const levelTitle = getLevelTitle(localStreak.level);

  // Remote data state
  const [solveHistory, setSolveHistory] = useState<DbSolveRecord[]>([]);
  const [archive, setArchive] = useState<DbDailyPuzzle[]>([]);
  const [remoteStats, setRemoteStats] = useState<{ xp: number; totalSolved: number; bestStreak: number; streakCount: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const loadData = useCallback(async () => {
    if (!isSignedIn || !user) return;
    setLoading(true);
    setError(false);
    try {
      const [history, stats, puzzles] = await Promise.all([
        fetchSolveHistory(user.id),
        fetchUserStats(user.id),
        fetchPuzzleArchive(),
      ]);
      setSolveHistory(history);
      setArchive(puzzles);
      if (stats) {
        setRemoteStats({
          xp: stats.xp,
          totalSolved: stats.total_solved,
          bestStreak: stats.best_streak,
          streakCount: stats.streak_count,
        });
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!isSignedIn) return <SignInGate isDark={isDark} />;

  // Use remote stats if available, otherwise fall back to localStorage
  const xp = remoteStats?.xp ?? localStreak.xp;
  const totalSolved = remoteStats?.totalSolved ?? localStreak.totalSolved;
  const bestStreak = remoteStats?.bestStreak ?? localStreak.bestStreak;
  const streakCount = remoteStats?.streakCount ?? localStreak.count;

  return (
    <div className="min-h-screen" style={{ background: T.pageBg, fontFamily: "'Nunito', sans-serif" }}>
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* ── Profile card ─────────────────────────────────────────── */}
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
                <img src={user.picture} alt={user.name} className="w-16 h-16 rounded-full" style={{ border: `3px solid ${isDark ? '#4C3580' : '#C4B5FD'}` }} />
              ) : (
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: isDark ? '#261845' : '#F5F0FF', border: `3px solid ${isDark ? '#4C3580' : '#C4B5FD'}` }}>
                  <span style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.5rem', color: isDark ? '#C4B5FD' : '#7C3AED' }}>
                    {user?.name?.[0] ?? '?'}
                  </span>
                </div>
              )}
              <div>
                <h2 style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.3rem', color: isDark ? '#F0EAFF' : '#1E1B4B', margin: 0 }}>
                  {user?.name}
                </h2>
                <p style={{ color: T.textMuted, fontSize: '0.83rem', margin: '2px 0 6px' }}>{user?.email}</p>
                <span className="px-3 py-0.5 rounded-full text-sm font-bold" style={{ background: isDark ? '#261845' : '#F5F0FF', color: isDark ? '#C4B5FD' : '#7C3AED', border: `1px solid ${isDark ? '#4C3580' : '#C4B5FD'}` }}>
                  {levelTitle}
                </span>
              </div>
            </div>
            <motion.button
              onClick={signOut}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border"
              style={{ color: isDark ? '#9381CC' : '#6B7280', borderColor: T.cardBorder, background: 'transparent' }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <LogOut size={14} />
              Sign out
            </motion.button>
          </div>
        </motion.div>

        {/* ── Error banner ─────────────────────────────────────────── */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="rounded-2xl border px-4 py-3 mb-4 flex items-center gap-3"
              style={{ background: isDark ? '#2A0F15' : '#FFF1F2', borderColor: isDark ? '#7F1D1D' : '#FCA5A5' }}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <span style={{ fontSize: '1rem' }}>⚠️</span>
              <span style={{ color: isDark ? '#FCA5A5' : '#EF4444', fontSize: '0.85rem', fontWeight: 600, flex: 1 }}>
                Couldn't load remote data. Showing local stats.
              </span>
              <motion.button
                onClick={() => loadData()}
                className="flex items-center gap-1 text-xs font-bold"
                style={{ color: isDark ? '#FCA5A5' : '#EF4444' }}
                whileTap={{ scale: 0.9 }}
              >
                <RefreshCw size={12} /> Retry
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Stats grid ───────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }} className="mb-6">
          <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.1rem', color: isDark ? '#C4B5FD' : '#5B21B6', marginBottom: '0.75rem' }}>
            Your Stats
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard emoji="🔥" label="Current Streak" value={streakCount} isDark={isDark} />
            <StatCard emoji="🧩" label="Total Solved"   value={totalSolved}  isDark={isDark} />
            <StatCard emoji="🏅" label="Best Streak"    value={bestStreak}   isDark={isDark} />
            <StatCard emoji="⚡" label="Total XP"       value={xp}           isDark={isDark} />
          </div>
        </motion.div>

        {/* ── Solve history ────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }} className="mb-6">
          <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.1rem', color: isDark ? '#C4B5FD' : '#5B21B6', marginBottom: '0.75rem' }}>
            Solve History
          </h3>

          {loading ? (
            <div className="flex flex-col gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-2xl border h-16 animate-pulse" style={{ background: T.cardBg, borderColor: T.cardBorder }} />
              ))}
            </div>
          ) : solveHistory.length === 0 ? (
            <div className="rounded-2xl border p-8 text-center" style={{ background: T.cardBg, borderColor: T.cardBorder }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🧩</div>
              <p style={{ color: T.textMuted, fontSize: '0.9rem', margin: 0 }}>
                No solves yet — go crack{' '}
                <a href="/puzzle" style={{ color: isDark ? '#C4B5FD' : '#7C3AED', fontWeight: 700 }}>today's puzzle</a>!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {solveHistory.map((record, i) => (
                <SolveRow key={record.id} record={record} isDark={isDark} index={i} />
              ))}
            </div>
          )}
        </motion.div>

        {/* ── Puzzle archive ───────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}>
          <div className="flex items-center justify-between mb-3">
            <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.1rem', color: isDark ? '#C4B5FD' : '#5B21B6' }}>
              Puzzle Archive
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: isDark ? '#261845' : '#F5F0FF', color: isDark ? '#9381CC' : '#6D28D9' }}>
              {archive.length} puzzle{archive.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div className="rounded-2xl border h-16 animate-pulse" style={{ background: T.cardBg, borderColor: T.cardBorder }} />
          ) : archive.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-5 text-center" style={{ borderColor: isDark ? '#3D2A6B' : '#C4B5FD', background: isDark ? '#100820' : '#FAFAFF' }}>
              <Trophy size={20} style={{ color: isDark ? '#4C3580' : '#C4B5FD', margin: '0 auto 0.5rem' }} />
              <p style={{ color: T.textFaint, fontSize: '0.83rem', margin: 0 }}>Archive is empty — puzzles will appear here after they're published.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {archive.map((puzzle, i) => (
                <ArchiveRow key={puzzle.id} puzzle={puzzle} isDark={isDark} index={i} />
              ))}
            </div>
          )}

          <motion.div
            className="rounded-2xl border border-dashed p-5 text-center mt-3"
            style={{ borderColor: isDark ? '#3D2A6B' : '#C4B5FD', background: isDark ? '#100820' : '#FAFAFF' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <BookOpen size={20} style={{ color: isDark ? '#4C3580' : '#C4B5FD', margin: '0 auto 0.5rem' }} />
            <p style={{ color: T.textFaint, fontSize: '0.83rem', margin: 0 }}>More puzzles added daily — check back tomorrow!</p>
          </motion.div>
        </motion.div>

      </div>
    </div>
  );
}
