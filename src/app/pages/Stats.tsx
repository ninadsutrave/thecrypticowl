import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { CheckCircle2, CircleSlash, Eye, Lightbulb } from 'lucide-react';
import { Mascot } from '../components/Mascot';
import { useDarkMode } from '../context/DarkModeContext';
import { useAuth } from '../context/AuthContext';
import { getTheme, type Theme } from '../theme';
import { GAMES, getGame, type GameId } from '../games/registry';
import { formatClock, getAllPlays, localDateKey, type PlayRecord } from '../games/solveRecords';
import { calendarWeeks, computeHistoryStats } from '../games/historyStats';
import { syncPlayHistory } from '../games/playHistory';
import { GameIcon } from '../games/GameIcon';

const FONT_HEADING = "'Outfit', sans-serif";
const WEEKS = 18;
const PAGE = 30;

// Sequential ramp, one hue (brand violet): more finishes → stronger colour.
// Dark mode has its own steps from the same ramp, brightening on the dark
// surface rather than a flipped copy of the light ones.
const RAMP_LIGHT = ['#EDE9FE', '#DDD6FE', '#C4B5FD', '#A78BFA', '#7C3AED', '#5B21B6'];
const RAMP_DARK = ['#251A47', '#3B2A6E', '#5B3FA3', '#7C5CD6', '#A78BFA', '#DDD6FE'];
const BUCKET_LABELS = ['None', '1', '2', '3–4', '5–6', 'All 7'];

function bucket(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  if (count <= 6) return 4;
  return 5;
}

function prettyDate(key: string, opts: Intl.DateTimeFormatOptions = {}) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...opts,
  });
}

function hoursMinutes(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ─── PLAY HISTORY PAGE ────────────────────────────────────────────────────────

export function Stats() {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const { user, isSignedIn, signIn } = useAuth();
  const [plays, setPlays] = useState<PlayRecord[]>(() => getAllPlays());
  const [filter, setFilter] = useState<GameId | 'all'>('all');
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    document.title = 'My Stats · The Cryptic Owl';
  }, []);

  // Pull plays made on other devices before showing the full picture.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    syncPlayHistory(user.id)
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setPlays(getAllPlays());
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const stats = useMemo(() => computeHistoryStats(plays), [plays]);
  const visible = plays.filter(p => filter === 'all' || p.game === filter);

  return (
    <div className="max-w-4xl mx-auto px-4 pb-20 pt-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            style={{
              fontFamily: FONT_HEADING,
              fontSize: 'clamp(1.7rem, 4.5vw, 2.2rem)',
              color: T.heading,
            }}
          >
            Your puzzle history
          </h1>
          <p style={{ color: T.textMuted, fontWeight: 700, fontSize: '0.9rem' }}>
            {isSignedIn ? (
              'Saved to your account, across all your devices.'
            ) : (
              <>
                Saved on this device only.{' '}
                <button
                  onClick={signIn}
                  className="underline font-extrabold"
                  style={{ color: T.brandText }}
                >
                  Sign in
                </button>{' '}
                to keep it everywhere.
              </>
            )}
          </p>
        </div>
        <Link
          to="/history"
          className="shrink-0 inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-extrabold no-underline"
          style={{ borderColor: T.brandBorder, color: T.brandText, background: T.brandSurface }}
        >
          Cryptic XP & archive →
        </Link>
      </header>

      {plays.length === 0 ? (
        <EmptyState T={T} />
      ) : (
        <div className="space-y-6">
          <section
            aria-label="Totals"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
          >
            <Tile
              T={T}
              label="Day streak"
              value={String(stats.currentStreak)}
              sub={`Best ${stats.bestStreak}`}
            />
            <Tile T={T} label="Days played" value={String(stats.daysPlayed)} />
            <Tile
              T={T}
              label="Puzzles solved"
              value={String(stats.solved)}
              sub={`of ${stats.finished} finished`}
            />
            <Tile T={T} label="Time puzzling" value={hoursMinutes(stats.totalSeconds)} />
            <Tile T={T} label="Hints used" value={String(stats.hints)} />
          </section>

          <Heatmap T={T} isDark={isDark} byDay={stats.byDay} />

          <PerGameTable T={T} stats={stats} />

          <section
            className="rounded-3xl border p-4 sm:p-5"
            style={{ background: T.cardBg, borderColor: T.cardBorder }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 style={{ fontFamily: FONT_HEADING, fontSize: '1.15rem', color: T.heading }}>
                Every play
              </h2>
              <label
                className="flex items-center gap-2 text-sm font-bold"
                style={{ color: T.textMuted }}
              >
                Game
                <select
                  value={filter}
                  onChange={e => {
                    setFilter(e.target.value as GameId | 'all');
                    setShown(PAGE);
                  }}
                  className="rounded-xl border px-2 py-1.5 text-sm font-bold"
                  style={{ background: T.inputBg, borderColor: T.inputBorder, color: T.text }}
                >
                  <option value="all">All games</option>
                  {GAMES.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <PlayTable T={T} plays={visible.slice(0, shown)} />
            {visible.length > shown && (
              <button
                onClick={() => setShown(n => n + PAGE)}
                className="mt-3 w-full py-2.5 rounded-2xl border-2 text-sm font-extrabold"
                style={{ borderColor: T.cardBorder, color: T.brandText }}
              >
                Show more ({visible.length - shown} left)
              </button>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function EmptyState({ T }: { T: Theme }) {
  return (
    <div
      className="rounded-3xl border p-8 text-center flex flex-col items-center gap-3"
      style={{ background: T.cardBg, borderColor: T.cardBorder }}
    >
      <Mascot mood="thinking" size={80} animate />
      <p style={{ fontFamily: FONT_HEADING, fontSize: '1.2rem', color: T.heading }}>
        Nothing here yet
      </p>
      <p style={{ color: T.textMuted, fontWeight: 600 }}>
        Finish a puzzle and it'll appear here with your time and hints.
      </p>
      <Link
        to="/"
        className="px-5 py-2.5 rounded-2xl font-extrabold no-underline"
        style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', color: 'white' }}
      >
        Play today's puzzles
      </Link>
    </div>
  );
}

function Tile({ T, label, value, sub }: { T: Theme; label: string; value: string; sub?: string }) {
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ background: T.cardBg, borderColor: T.cardBorder }}
    >
      <p className="text-xs font-extrabold" style={{ color: T.textMuted, margin: 0 }}>
        {label.toUpperCase()}
      </p>
      <p style={{ fontFamily: FONT_HEADING, fontSize: '1.7rem', color: T.heading, margin: 0 }}>
        {value}
      </p>
      {sub && (
        <p className="text-xs font-bold" style={{ color: T.textMuted, margin: 0 }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function Heatmap({
  T,
  isDark,
  byDay,
}: {
  T: Theme;
  isDark: boolean;
  byDay: Map<string, PlayRecord[]>;
}) {
  const ramp = isDark ? RAMP_DARK : RAMP_LIGHT;
  const weeks = useMemo(() => calendarWeeks(WEEKS), []);
  const today = localDateKey();
  const [hover, setHover] = useState<string | null>(null);
  const hovered = hover ? (byDay.get(hover) ?? []) : [];

  return (
    <section
      className="rounded-3xl border p-4 sm:p-5"
      style={{ background: T.cardBg, borderColor: T.cardBorder }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h2 style={{ fontFamily: FONT_HEADING, fontSize: '1.15rem', color: T.heading }}>
          Puzzles finished per day
        </h2>
        <p className="text-xs font-bold" style={{ color: T.textMuted }}>
          Last {WEEKS} weeks
        </p>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex gap-[3px] w-max" role="grid" aria-label="Calendar of puzzles finished">
          <div className="flex flex-col gap-[3px] mr-1" aria-hidden>
            {['M', '', 'W', '', 'F', '', 'S'].map((d, i) => (
              <span
                key={i}
                className="h-[14px] text-[0.6rem] font-bold leading-[14px]"
                style={{ color: T.textMuted }}
              >
                {d}
              </span>
            ))}
          </div>
          {weeks.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-[3px]" role="row">
              {col.map((day, ri) => {
                if (!day) return <span key={ri} className="w-[14px] h-[14px]" />;
                const count = byDay.get(day)?.length ?? 0;
                const label = `${prettyDate(day, { weekday: 'short' })}: ${count} puzzle${count === 1 ? '' : 's'} finished`;
                return (
                  <button
                    key={ri}
                    role="gridcell"
                    aria-label={label}
                    title={label}
                    onMouseEnter={() => setHover(day)}
                    onFocus={() => setHover(day)}
                    onMouseLeave={() => setHover(h => (h === day ? null : h))}
                    className="w-[14px] h-[14px] rounded-[3px]"
                    style={{
                      background: ramp[bucket(count)],
                      outline: day === today ? `2px solid ${T.heading}` : undefined,
                      outlineOffset: 1,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
        {/* Hover/focus detail: which games, not just how many. */}
        <p className="text-sm font-bold min-h-[1.5em]" style={{ color: T.text }} aria-live="polite">
          {hover
            ? hovered.length
              ? `${prettyDate(hover, { weekday: 'long' })}: ${hovered
                  .map(p => `${getGame(p.game).name} ${formatClock(p.seconds)}`)
                  .join(' · ')}`
              : `${prettyDate(hover, { weekday: 'long' })}: no puzzles`
            : 'Hover a day to see what you played.'}
        </p>
        <div
          className="flex items-center gap-1 text-[0.7rem] font-bold"
          style={{ color: T.textMuted }}
        >
          Fewer
          {ramp.map((c, i) => (
            <span
              key={c}
              className="w-[12px] h-[12px] rounded-[3px] inline-block"
              style={{ background: c }}
              title={BUCKET_LABELS[i]}
            />
          ))}
          More
        </div>
      </div>
    </section>
  );
}

function PerGameTable({ T, stats }: { T: Theme; stats: ReturnType<typeof computeHistoryStats> }) {
  return (
    <section
      className="rounded-3xl border p-4 sm:p-5 overflow-x-auto"
      style={{ background: T.cardBg, borderColor: T.cardBorder }}
    >
      <h2
        className="mb-3"
        style={{ fontFamily: FONT_HEADING, fontSize: '1.15rem', color: T.heading }}
      >
        By game
      </h2>
      <table className="w-full text-sm" style={{ color: T.text, minWidth: 520 }}>
        <thead>
          <tr style={{ color: T.textMuted }} className="text-left text-xs">
            <th className="py-2 pr-2 font-extrabold">GAME</th>
            <th className="py-2 px-2 font-extrabold text-right">PLAYED</th>
            <th className="py-2 px-2 font-extrabold text-right">SOLVED</th>
            <th className="py-2 px-2 font-extrabold text-right">BEST TIME</th>
            <th className="py-2 px-2 font-extrabold text-right">AVG TIME</th>
            <th className="py-2 pl-2 font-extrabold text-right">HINTS</th>
          </tr>
        </thead>
        <tbody>
          {GAMES.map(g => {
            const s = stats.perGame[g.id];
            return (
              <tr key={g.id} className="border-t" style={{ borderColor: T.tableRowBorder }}>
                <td className="py-2 pr-2 font-bold whitespace-nowrap">
                  <span className="inline-flex items-center gap-2">
                    <GameIcon gameId={g.id} size={24} /> {g.name}
                  </span>
                </td>
                <td className="py-2 px-2 text-right tabular-nums">{s?.played ?? 0}</td>
                <td className="py-2 px-2 text-right tabular-nums">{s?.solved ?? 0}</td>
                <td className="py-2 px-2 text-right tabular-nums">
                  {s?.bestSeconds != null ? formatClock(s.bestSeconds) : '—'}
                </td>
                <td className="py-2 px-2 text-right tabular-nums">
                  {s?.avgSeconds != null ? formatClock(s.avgSeconds) : '—'}
                </td>
                <td className="py-2 pl-2 text-right tabular-nums">{s?.hints ?? 0}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

const OUTCOME = {
  solved: { label: 'Solved', Icon: CheckCircle2, color: '#10B981' },
  failed: { label: 'Missed', Icon: CircleSlash, color: '#EF4444' },
  revealed: { label: 'Revealed', Icon: Eye, color: '#D97706' },
} as const;

function PlayTable({ T, plays }: { T: Theme; plays: PlayRecord[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ color: T.text, minWidth: 560 }}>
        <thead>
          <tr style={{ color: T.textMuted }} className="text-left text-xs">
            <th className="py-2 pr-2 font-extrabold">DATE</th>
            <th className="py-2 px-2 font-extrabold">GAME</th>
            <th className="py-2 px-2 font-extrabold">RESULT</th>
            <th className="py-2 px-2 font-extrabold text-right">TIME</th>
            <th className="py-2 px-2 font-extrabold text-right">HINTS</th>
            <th className="py-2 pl-2 font-extrabold text-right">MISTAKES</th>
          </tr>
        </thead>
        <tbody>
          {plays.map(p => {
            const o = OUTCOME[p.outcome];
            const game = getGame(p.game);
            return (
              <tr
                key={`${p.game}:${p.date}`}
                className="border-t align-top"
                style={{ borderColor: T.tableRowBorder }}
              >
                <td className="py-2 pr-2 whitespace-nowrap font-bold">
                  {prettyDate(p.date, { weekday: 'short' })}
                </td>
                <td className="py-2 px-2 whitespace-nowrap">
                  <span className="inline-flex items-center gap-2">
                    <GameIcon gameId={game.id} size={24} /> {game.name}
                  </span>
                </td>
                <td className="py-2 px-2">
                  {/* Icon + label: the outcome is never carried by colour alone. */}
                  <span
                    className="inline-flex items-center gap-1 font-bold"
                    style={{ color: T.text }}
                  >
                    <o.Icon size={14} color={o.color} aria-hidden /> {o.label}
                  </span>
                  {p.score && (
                    <span className="block text-xs" style={{ color: T.textMuted }}>
                      {p.score}
                    </span>
                  )}
                </td>
                <td className="py-2 px-2 text-right tabular-nums">{formatClock(p.seconds)}</td>
                <td className="py-2 px-2 text-right tabular-nums">
                  {p.hints > 0 ? (
                    <span className="inline-flex items-center gap-1">
                      <Lightbulb size={12} aria-hidden /> {p.hints}
                    </span>
                  ) : (
                    0
                  )}
                </td>
                <td className="py-2 pl-2 text-right tabular-nums">{p.mistakes}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
