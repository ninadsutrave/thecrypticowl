import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { m, AnimatePresence } from 'motion/react';
import {
  Zap,
  CalendarDays,
  Puzzle as PuzzleIcon,
  ChevronRight,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';
import { getTheme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useStreak, getLevelTitle } from '../hooks/useStreak';
import { getAllPlays } from '../games/solveRecords';
import { levelForXP, totalXP } from '../games/xp';
import { Mascot } from '../components/Mascot';
import { Link } from 'react-router';
import { SignInGate } from '../components/SignInGate';
const TrendChart = lazy(() => import('./history/TrendChart'));

/** Placeholder that reserves the chart's exact height, so nothing shifts. */
function ChartSkeleton({ height, isDark }: { height: number; isDark: boolean }) {
  return (
    <div
      className="rounded-2xl animate-pulse"
      style={{ height, background: isDark ? '#1C1B24' : '#F5F3FF' }}
      aria-label="Loading chart"
    />
  );
}
import { fetchSolveHistory, fetchUserStats, type DbSolveRecord } from '../../lib/supabase';

// ─── STAT CARD ────────────────────────────────────────────────────────────────

function StatCard({
  emoji,
  label,
  value,
  isDark,
}: {
  emoji: string;
  label: string;
  value: string | number;
  isDark: boolean;
}) {
  const T = getTheme(isDark);
  return (
    <m.div
      className="rounded-2xl border p-4 text-center"
      style={{ background: T.cardBg, borderColor: T.cardBorder }}
      whileHover={{ y: -2, scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div style={{ fontSize: '1.6rem', marginBottom: '0.25rem' }}>{emoji}</div>
      <div
        style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: '1.5rem',
          color: T.brandStrong,
        }}
      >
        {value}
      </div>
      <div
        style={{ fontSize: '0.75rem', color: T.textMuted, fontWeight: 600, marginTop: '0.15rem' }}
      >
        {label}
      </div>
    </m.div>
  );
}

// ─── SOLVE ROW ────────────────────────────────────────────────────────────────

function SolveRow({
  record,
  isDark,
  index,
}: {
  record: DbSolveRecord;
  isDark: boolean;
  index: number;
}) {
  const T = getTheme(isDark);
  const hintColors = ['#10B981', '#3B82F6', '#F59E0B', '#F97316', '#EF4444'];
  const hintLabels = ['No hints', '1 hint', '2 hints', '3 hints', '4+ hints'];
  const hintsIdx = Math.min(record.hints_used, 4);
  const dateStr = new Date(record.solved_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const timeStr =
    record.solve_time_seconds == null
      ? null
      : record.solve_time_seconds < 60
        ? `${record.solve_time_seconds}s`
        : `${Math.floor(record.solve_time_seconds / 60)}m ${record.solve_time_seconds % 60}s`;

  return (
    <m.div
      className="rounded-2xl border px-4 py-3"
      style={{ background: T.cardBg, borderColor: T.cardBorder }}
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.22 }}
    >
      {/* Top row: puzzle number + date + XP */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-xl flex-shrink-0"
            style={{ background: T.brandSurface }}
          >
            <PuzzleIcon size={14} style={{ color: T.brandText }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: T.text, fontSize: '0.9rem', lineHeight: 1.2 }}>
              Puzzle #{record.puzzle_number}
            </div>
            <div style={{ fontSize: '0.72rem', color: T.textMuted }}>{dateStr}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Zap size={13} style={{ color: '#F59E0B' }} />
          <span
            style={{ fontFamily: "'Outfit', sans-serif", color: '#F59E0B', fontSize: '0.9rem' }}
          >
            +{record.xp_earned} XP
          </span>
        </div>
      </div>

      {/* Bottom row: hints · time · wrong attempts */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Hints */}
        <span
          className="px-2 py-0.5 rounded-full text-xs font-bold"
          style={{
            background: isDark ? '#1C1B24' : '#F5F0FF',
            color: hintColors[hintsIdx],
            border: `1px solid ${hintColors[hintsIdx]}40`,
          }}
        >
          💡 {hintLabels[hintsIdx]}
        </span>

        {/* Solve time */}
        {timeStr && (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-bold"
            style={{
              background: isDark ? '#021520' : '#F0F9FF',
              color: '#0284C7',
              border: '1px solid #38BDF840',
            }}
          >
            ⏱ {timeStr}
          </span>
        )}

        {/* Wrong attempts */}
        {record.wrong_attempts > 0 && (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-bold"
            style={{
              background: T.wrongBg,
              color: '#EF4444',
              border: '1px solid #EF444440',
            }}
          >
            ✗ {record.wrong_attempts} wrong
          </span>
        )}
        {record.wrong_attempts === 0 && (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-bold"
            style={{
              background: T.successBg,
              color: '#10B981',
              border: '1px solid #10B98140',
            }}
          >
            ✓ First try
          </span>
        )}
      </div>
    </m.div>
  );
}

// ─── SOLVE INSIGHTS ───────────────────────────────────────────────────────────

function SolveInsights({
  solveHistory,
  isDark,
}: {
  solveHistory: DbSolveRecord[];
  isDark: boolean;
}) {
  const T = getTheme(isDark);

  // A. Activity Heatmap — last 12 weeks (84 days)
  const today = new Date();
  const gridDays: { date: Date; solved: boolean; isToday: boolean }[] = [];
  const solvedDates = new Set(solveHistory.map(r => new Date(r.solved_at).toDateString()));

  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    gridDays.push({
      date: d,
      solved: solvedDates.has(d.toDateString()),
      isToday: d.toDateString() === today.toDateString(),
    });
  }

  const startDayOfWeek = gridDays[0].date.getDay();
  const padding = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
  const paddedDays = [...Array(padding).fill(null), ...gridDays];
  const weeks: ((typeof gridDays)[0] | null)[][] = [];
  for (let w = 0; w < Math.ceil(paddedDays.length / 7); w++) {
    weeks.push(paddedDays.slice(w * 7, w * 7 + 7));
  }

  // B. Trend data — last 30 solves, ordered oldest → newest
  const recent = [...solveHistory].slice(0, 30).reverse();
  const trendData = recent.map(r => ({
    name: `#${r.puzzle_number}`,
    hints: r.hints_used,
    wrong: r.wrong_attempts,
    time: r.solve_time_seconds ?? undefined,
  }));
  const hasTimeData = trendData.some(d => d.time !== undefined);

  // C. Compute improvement: compare avg of first half vs second half (positive = improved)
  function computeTrend(values: (number | undefined)[]): number | null {
    const valid = values.filter((v): v is number => v !== undefined);
    if (valid.length < 4) return null;
    const half = Math.floor(valid.length / 2);
    const firstAvg = valid.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const secondAvg = valid.slice(half).reduce((a, b) => a + b, 0) / (valid.length - half);
    if (firstAvg === 0) return null;
    return Math.round(((firstAvg - secondAvg) / firstAvg) * 100);
  }

  const hintTrend = computeTrend(trendData.map(d => d.hints));
  const wrongTrend = computeTrend(trendData.map(d => d.wrong));
  const timeTrend = computeTrend(trendData.map(d => d.time));

  const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const cardStyle = { background: T.cardBg, borderColor: T.cardBorder };
  const axisColor = isDark ? '#6B5FA0' : '#9CA3AF';
  const gridColor = isDark ? '#2E2B3B' : '#E5E7EB';

  // Trend badge component
  const TrendBadge = ({
    label,
    trend,
    icon,
  }: {
    label: string;
    trend: number | null;
    icon: string;
  }) => {
    const improving = trend !== null && trend > 0;
    const declining = trend !== null && trend < 0;
    const badgeColor = improving ? '#10B981' : declining ? '#EF4444' : '#9CA3AF';
    const badgeBg = improving
      ? isDark
        ? '#062010'
        : '#ECFDF5'
      : declining
        ? isDark
          ? '#2A0F15'
          : '#FFF1F2'
        : isDark
          ? '#1C1B24'
          : '#F5F0FF';
    const arrow = improving ? '↓' : declining ? '↑' : '→';
    const msg = improving
      ? 'Getting better!'
      : declining
        ? 'Room to improve'
        : trend === null
          ? 'Keep playing'
          : 'Holding steady';

    return (
      <div
        className="flex-1 min-w-[130px] rounded-2xl border p-3"
        style={{ background: badgeBg, borderColor: `${badgeColor}40` }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <span style={{ fontSize: '0.9rem' }}>{icon}</span>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: T.textMuted,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.04em',
            }}
          >
            {label}
          </span>
        </div>
        <div
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '1.35rem',
            color: badgeColor,
            lineHeight: 1,
          }}
        >
          {trend !== null ? `${arrow} ${Math.abs(trend)}%` : '—'}
        </div>
        <div style={{ fontSize: '0.68rem', color: badgeColor, marginTop: 2 }}>{msg}</div>
      </div>
    );
  };

  return (
    <m.div
      className="mb-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.4 }}
    >
      <h3
        style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: '1.1rem',
          color: T.brandStrong,
          marginBottom: '0.75rem',
        }}
      >
        Your Improvement 📈
      </h3>

      {/* Trend badges */}
      {trendData.length >= 4 && (
        <div className="flex gap-3 flex-wrap mb-4">
          <TrendBadge label="Hints" trend={hintTrend} icon="💡" />
          <TrendBadge label="Wrong guesses" trend={wrongTrend} icon="✗" />
          {hasTimeData && <TrendBadge label="Solve time" trend={timeTrend} icon="⏱" />}
        </div>
      )}

      {/* Combined trend chart */}
      <div className="rounded-2xl border p-4 mb-4" style={cardStyle}>
        <p
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: T.textFaint,
            marginBottom: 4,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Performance Trend — Last {recent.length} Puzzle{recent.length !== 1 ? 's' : ''} (oldest →
          newest)
        </p>
        {/* Legend */}
        <div className="flex items-center gap-4 flex-wrap mb-3">
          {[
            { color: '#7C3AED', label: 'Hints' },
            { color: '#EF4444', label: 'Wrong guesses' },
            ...(hasTimeData ? [{ color: '#0EA5E9', label: 'Time (s)' }] : []),
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div style={{ width: 18, height: 3, borderRadius: 2, background: color }} />
              <span style={{ fontSize: '0.7rem', color: T.textMuted, fontWeight: 600 }}>
                {label}
              </span>
            </div>
          ))}
        </div>
        {trendData.length > 0 ? (
          <Suspense fallback={<ChartSkeleton height={210} isDark={isDark} />}>
            <TrendChart
              trendData={trendData}
              hasTimeData={hasTimeData}
              gridColor={gridColor}
              axisColor={axisColor}
              T={T}
            />
          </Suspense>
        ) : (
          <div
            style={{
              height: 210,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: T.textFaint,
              fontSize: '0.8rem',
            }}
          >
            No data yet — go solve some puzzles!
          </div>
        )}
        {trendData.length > 0 && trendData.length < 4 && (
          <p style={{ fontSize: '0.7rem', color: T.textFaint, marginTop: 8, textAlign: 'center' }}>
            Solve {4 - trendData.length} more puzzle{4 - trendData.length > 1 ? 's' : ''} to unlock
            trend analysis
          </p>
        )}
      </div>

      {/* Activity Heatmap */}
      <div className="rounded-2xl border p-4" style={cardStyle}>
        <p
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: T.textFaint,
            marginBottom: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Solve Activity — Last 12 Weeks
        </p>
        <div className="flex gap-1">
          <div className="flex flex-col gap-0.5 mr-1">
            {weekLabels.map(d => (
              <div
                key={d}
                style={{
                  height: 14,
                  fontSize: '0.6rem',
                  color: axisColor,
                  lineHeight: '14px',
                  width: 24,
                  textAlign: 'right',
                  fontFamily: "'Nunito', sans-serif",
                  fontWeight: 600,
                }}
              >
                {d}
              </div>
            ))}
          </div>
          <div className="flex gap-0.5">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {week.map((day, di) => (
                  <div
                    key={di}
                    title={
                      day
                        ? day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : ''
                    }
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      background:
                        day == null
                          ? 'transparent'
                          : day.isToday
                            ? 'transparent'
                            : day.solved
                              ? '#7C3AED'
                              : isDark
                                ? '#2E2B3B'
                                : '#E5E7EB',
                      border: day?.isToday ? '2px solid #A78BFA' : 'none',
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: isDark ? '#2E2B3B' : '#E5E7EB',
            }}
          />
          <span style={{ fontSize: '0.65rem', color: T.textFaint }}>No solve</span>
          <div
            style={{ width: 10, height: 10, borderRadius: 2, background: '#7C3AED', marginLeft: 8 }}
          />
          <span style={{ fontSize: '0.65rem', color: T.textFaint }}>Solved</span>
        </div>
      </div>
    </m.div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export function Progress() {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const { user, signOut, isSignedIn, loading: authLoading } = useAuth();
  const localStreak = useStreak();
  // XP and level count every game's finished puzzles (the play history),
  // not just cryptic clues.
  const allXP = totalXP(getAllPlays());
  const levelTitle = getLevelTitle(levelForXP(allXP));

  // Remote data state
  const [solveHistory, setSolveHistory] = useState<DbSolveRecord[]>([]);
  const [remoteStats, setRemoteStats] = useState<{
    xp: number;
    totalSolved: number;
    bestStreak: number;
    streakCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const loadData = useCallback(async () => {
    if (!isSignedIn || !user) return;
    setLoading(true);
    setError(false);
    try {
      const [history, stats] = await Promise.all([
        fetchSolveHistory(user.id),
        fetchUserStats(user.id),
      ]);
      setSolveHistory(history);
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
  }, [isSignedIn, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Don't flash the sign-in gate while the idle-deferred auth restore is still
  // running — a previously-signed-in user would briefly see "Sign in" before
  // their session resolves. Wait for loading to settle before deciding.
  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: T.pageBg }}
      >
        <div
          aria-label="Loading"
          className="h-6 w-6 rounded-full border-[3px] border-t-transparent animate-spin"
          style={{ borderColor: '#7C3AED', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }
  if (!isSignedIn) return <SignInGate />;

  // Use remote stats if available, otherwise fall back to localStorage
  const xp = allXP;
  const totalSolved = remoteStats?.totalSolved ?? localStreak.totalSolved;
  const bestStreak = remoteStats?.bestStreak ?? localStreak.bestStreak;
  const streakCount = remoteStats?.streakCount ?? localStreak.count;

  // Computed aggregates from solve history
  const avgHints =
    solveHistory.length > 0
      ? (solveHistory.reduce((s, r) => s + r.hints_used, 0) / solveHistory.length).toFixed(1)
      : '—';
  const timedSolves = solveHistory.filter(r => r.solve_time_seconds != null);
  const avgTime =
    timedSolves.length > 0
      ? Math.round(timedSolves.reduce((s, r) => s + r.solve_time_seconds!, 0) / timedSolves.length)
      : null;
  const avgTimeStr =
    avgTime == null
      ? '—'
      : avgTime < 60
        ? `${avgTime}s`
        : `${Math.floor(avgTime / 60)}m ${avgTime % 60}s`;
  const zeroHintSolves = solveHistory.filter(r => r.hints_used === 0).length;
  const perfectPct =
    solveHistory.length > 0 ? Math.round((zeroHintSolves / solveHistory.length) * 100) : null;

  return (
    <div
      className="min-h-screen"
      style={{ background: T.pageBg, fontFamily: "'Nunito', sans-serif" }}
    >
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* ── Profile card ─────────────────────────────────────────── */}
        <m.div
          className="rounded-3xl border p-6 mb-6"
          style={{
            background: T.cardBg,
            borderColor: T.cardBorder,
            boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(124,58,237,0.07)',
          }}
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
                  style={{ border: `3px solid ${T.brandBorder}` }}
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{
                    background: T.brandSurface,
                    border: `3px solid ${T.brandBorder}`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: '1.5rem',
                      color: T.brandText,
                    }}
                  >
                    {user?.name?.[0] ?? '?'}
                  </span>
                </div>
              )}
              <div>
                <h2
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '1.3rem',
                    color: T.heading,
                    margin: 0,
                  }}
                >
                  {user?.name}
                </h2>
                <p style={{ color: T.textMuted, fontSize: '0.83rem', margin: '2px 0 6px' }}>
                  {user?.email}
                </p>
                <span
                  className="px-3 py-0.5 rounded-full text-sm font-bold"
                  style={{
                    background: T.brandSurface,
                    color: T.brandText,
                    border: `1px solid ${T.brandBorder}`,
                  }}
                >
                  {levelTitle}
                </span>
              </div>
            </div>
            <m.button
              onClick={signOut}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border"
              style={{
                color: T.textMuted,
                borderColor: T.cardBorder,
                background: 'transparent',
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <LogOut size={14} />
              Sign out
            </m.button>
          </div>
        </m.div>

        {/* ── Error banner ─────────────────────────────────────────── */}
        <AnimatePresence>
          {error && (
            <m.div
              className="rounded-2xl border px-4 py-3 mb-4 flex items-center gap-3"
              style={{
                background: T.wrongBg,
                borderColor: isDark ? '#7F1D1D' : '#FCA5A5',
              }}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <span style={{ fontSize: '1rem' }}>⚠️</span>
              <span
                style={{
                  color: isDark ? '#FCA5A5' : '#EF4444',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  flex: 1,
                }}
              >
                Couldn't load remote data. Showing local stats.
              </span>
              <m.button
                onClick={() => loadData()}
                className="flex items-center gap-1 text-xs font-bold"
                style={{ color: isDark ? '#FCA5A5' : '#EF4444' }}
                whileTap={{ scale: 0.9 }}
              >
                <RefreshCw size={12} /> Retry
              </m.button>
            </m.div>
          )}
        </AnimatePresence>

        {/* ── Stats grid ───────────────────────────────────────────── */}
        <m.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="mb-6"
        >
          <h3
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '1.1rem',
              color: T.brandStrong,
              marginBottom: '0.75rem',
            }}
          >
            Your Stats
          </h3>
          {/* Row 1: core counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <StatCard emoji="🔥" label="Current Streak" value={streakCount} isDark={isDark} />
            <StatCard emoji="🧩" label="Total Solved" value={totalSolved} isDark={isDark} />
            <StatCard emoji="🏅" label="Best Streak" value={bestStreak} isDark={isDark} />
            <StatCard emoji="⚡" label="Total XP" value={xp} isDark={isDark} />
          </div>
          {/* Row 2: performance averages — only shown once we have solve history */}
          {solveHistory.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard emoji="💡" label="Avg Hints / Puzzle" value={avgHints} isDark={isDark} />
              <StatCard emoji="⏱" label="Avg Solve Time" value={avgTimeStr} isDark={isDark} />
              <StatCard
                emoji="🎯"
                label="No-hint Solves"
                value={perfectPct != null ? `${perfectPct}%` : '—'}
                isDark={isDark}
              />
            </div>
          )}
        </m.div>

        {/* ── Solve insights charts ────────────────────────────────── */}
        {!loading && solveHistory.length > 0 && (
          <SolveInsights solveHistory={solveHistory} isDark={isDark} />
        )}

        {/* ── Puzzle archive ───────────────────────────────────────── */}
        <m.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.4 }}
          className="mb-6"
        >
          <Link
            to="/archive"
            className="block rounded-3xl border p-5 relative overflow-hidden group no-underline"
            style={{
              background: isDark
                ? 'linear-gradient(135deg, #1C1B24 0%, #26242F 100%)'
                : 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
              borderColor: T.brandBorder,
            }}
          >
            <div className="relative z-10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className="w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center"
                  style={{ background: isDark ? '#2F2C3D' : 'white' }}
                >
                  <CalendarDays size={22} style={{ color: '#7C3AED' }} />
                </div>
                <div className="min-w-0">
                  <h3
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: '1.1rem',
                      color: T.heading,
                      margin: 0,
                    }}
                  >
                    Puzzle archive
                  </h3>
                  <p style={{ color: T.textMuted, fontSize: '0.85rem', margin: 0 }}>
                    Missed a day? Play any past puzzle, for every game.
                  </p>
                </div>
              </div>
              <ChevronRight size={20} style={{ color: T.textFaint }} className="shrink-0" />
            </div>
            <div
              className="absolute -right-4 -bottom-4 opacity-10 transition-transform group-hover:scale-110 group-hover:-rotate-12"
              aria-hidden
            >
              <Mascot mood="celebrating" size={100} />
            </div>
          </Link>
        </m.div>

        {/* ── Solve history ────────────────────────────────────────── */}
        <m.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="mb-6"
        >
          <h3
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '1.1rem',
              color: T.brandStrong,
              marginBottom: '0.75rem',
            }}
          >
            Solve Progress
          </h3>

          {loading ? (
            <div className="flex flex-col gap-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border h-16 animate-pulse"
                  style={{ background: T.cardBg, borderColor: T.cardBorder }}
                />
              ))}
            </div>
          ) : solveHistory.length === 0 ? (
            <div
              className="rounded-2xl border p-8 text-center"
              style={{ background: T.cardBg, borderColor: T.cardBorder }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🧩</div>
              <p style={{ color: T.textMuted, fontSize: '0.9rem', margin: 0 }}>
                No solves yet — go crack{' '}
                <a href="/cryptic" style={{ color: T.brandText, fontWeight: 700 }}>
                  today's puzzle
                </a>
                !
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {solveHistory.map((record, i) => (
                <SolveRow key={record.id} record={record} isDark={isDark} index={i} />
              ))}
            </div>
          )}
        </m.div>
      </div>
    </div>
  );
}
