import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import { getTheme, type Theme } from '../theme';
import { GAMES, getGame, type GameId, type GameMeta } from '../games/registry';
import { GameIcon } from '../games/GameIcon';
import { getArchivePlays, type ArchivePlay } from '../games/archive';
import { localDateKey } from '../games/solveRecords';
import { SignInGate } from '../components/SignInGate';
import { Mascot } from '../components/Mascot';
import { fetchGameArchiveDates, fetchPuzzleArchive } from '../../lib/supabase';

const FONT_HEADING = "'Outfit', sans-serif";

/** One past day: where to play it. */
interface ArchiveDay {
  date: string;
  to: string;
}

// Dates don't change within a visit: switching back to a game is instant.
const cache = new Map<GameId, ArchiveDay[]>();

async function loadDays(game: GameMeta, today: string): Promise<ArchiveDay[]> {
  if (game.id === 'cryptic') {
    // Cryptic clues live in their own tables, but link like every other game.
    const puzzles = await fetchPuzzleArchive();
    return puzzles.filter(p => p.date < today).map(p => dayLink(game, p.date));
  }
  const dates = await fetchGameArchiveDates(game.id, today);
  return dates.map(date => dayLink(game, date));
}

/** Every game's past day lives at its own page plus `?date=`. */
function dayLink(game: GameMeta, date: string): ArchiveDay {
  return { date, to: `${game.path}?date=${date}` };
}

/** Days grouped by month, newest month first. */
function byMonth(days: ArchiveDay[]): { label: string; days: ArchiveDay[] }[] {
  const groups = new Map<string, ArchiveDay[]>();
  for (const day of days) {
    const key = day.date.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), day]);
  }
  return [...groups.entries()].map(([key, list]) => {
    const [y, m] = key.split('-').map(Number);
    const label = new Date(y, m - 1, 1).toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric',
    });
    return { label, days: list };
  });
}

/**
 * Every past puzzle, game by game and date by date. Members only: signed-out
 * visitors get the sign-in prompt, and the page opens itself once they're in.
 */
export function Archive() {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const { isSignedIn } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('game');
  const game = GAMES.find(g => g.id === requested) ?? GAMES[0];
  const [today] = useState(localDateKey);
  const [days, setDays] = useState<ArchiveDay[] | null>(() => cache.get(game.id) ?? null);
  const [plays] = useState(getArchivePlays);

  useEffect(() => {
    document.title = 'Puzzle archive · The Cryptic Owl';
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    const cached = cache.get(game.id);
    setDays(cached ?? null);
    if (cached) return;
    let cancelled = false;
    loadDays(game, today)
      .catch(() => [])
      .then(list => {
        // An empty answer may be a network blip: don't keep it.
        if (list.length) cache.set(game.id, list);
        if (!cancelled) setDays(list);
      });
    return () => {
      cancelled = true;
    };
  }, [game, today, isSignedIn]);

  const months = useMemo(() => byMonth(days ?? []), [days]);
  const played = (days ?? []).filter(d => plays[`${game.id}:${d.date}`]).length;

  if (!isSignedIn) return <SignInGate />;

  const pick = (id: GameId) => setSearchParams({ game: id }, { replace: true });

  return (
    <div
      className="max-w-3xl mx-auto px-4 pt-8 pb-20"
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      <h1
        style={{
          fontFamily: FONT_HEADING,
          fontSize: 'clamp(1.6rem, 5vw, 2rem)',
          color: T.heading,
          marginBottom: 4,
        }}
      >
        Puzzle archive
      </h1>
      <p style={{ color: T.textMuted, fontWeight: 600, fontSize: '0.92rem', marginBottom: 20 }}>
        Every past puzzle, game by game. Pick a day to play it: archive plays don't touch your
        streak.
      </p>

      <div
        className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible sm:mx-0 sm:px-0"
        role="group"
        aria-label="Choose a game"
      >
        {GAMES.map(g => {
          const active = g.id === game.id;
          return (
            <button
              key={g.id}
              onClick={() => pick(g.id)}
              aria-pressed={active}
              className="shrink-0 inline-flex items-center gap-2 rounded-2xl border-2 py-1.5 pl-1.5 pr-3 text-sm font-extrabold whitespace-nowrap transition-colors"
              style={{
                borderColor: active ? g.accent : T.cardBorder,
                background: active ? `${g.accent}1A` : T.cardBg,
                color: active ? (isDark ? g.accentOnDark : g.accentStrong) : T.textSub,
              }}
            >
              <GameIcon gameId={g.id} size={28} />
              {g.name}
            </button>
          );
        })}
      </div>

      <div className="flex items-baseline justify-between mt-6 mb-3 gap-3">
        <h2 style={{ fontFamily: FONT_HEADING, fontSize: '1.2rem', color: T.heading, margin: 0 }}>
          {getGame(game.id).name}
        </h2>
        {days && days.length > 0 && (
          <p style={{ color: T.textMuted, fontWeight: 700, fontSize: '0.8rem', margin: 0 }}>
            {days.length} puzzle{days.length === 1 ? '' : 's'} · {played} played
          </p>
        )}
      </div>

      {days === null ? (
        <DayGrid>
          {Array.from({ length: 14 }, (_, i) => (
            <div
              key={i}
              className="h-[68px] rounded-2xl animate-pulse"
              style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}` }}
            />
          ))}
        </DayGrid>
      ) : days.length === 0 ? (
        <div
          className="rounded-3xl border border-dashed p-8 text-center"
          style={{ borderColor: T.brandBorder, background: T.cardBg }}
        >
          <div className="flex justify-center mb-3">
            <Mascot mood="thinking" size={64} animate={false} />
          </div>
          <p style={{ color: T.textSub, fontWeight: 700, margin: 0 }}>
            No past {game.name} puzzles yet.
          </p>
          <p style={{ color: T.textMuted, fontSize: '0.85rem', margin: '4px 0 0' }}>
            Each day's puzzle lands here once the day is over.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {months.map(month => (
            <section key={month.label} aria-label={month.label}>
              <h3
                className="mb-2"
                style={{ fontSize: '0.8rem', fontWeight: 800, color: T.textMuted, margin: 0 }}
              >
                {month.label.toUpperCase()}
              </h3>
              <DayGrid>
                {month.days.map(day => (
                  <DayTile
                    key={day.date}
                    day={day}
                    play={plays[`${game.id}:${day.date}`]}
                    game={game}
                    T={T}
                    isDark={isDark}
                  />
                ))}
              </DayGrid>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function DayGrid({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2 grid grid-cols-4 min-[420px]:grid-cols-5 sm:grid-cols-7 gap-2">
      {children}
    </div>
  );
}

function DayTile({
  day,
  play,
  game,
  T,
  isDark,
}: {
  day: ArchiveDay;
  play: ArchivePlay | undefined;
  game: GameMeta;
  T: Theme;
  isDark: boolean;
}) {
  const [y, m, d] = day.date.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'short' });
  const solved = play?.outcome === 'solved';
  const label = date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return (
    <Link
      to={day.to}
      className="relative flex flex-col items-center justify-center h-[68px] rounded-2xl border-2 no-underline transition-transform hover:-translate-y-0.5"
      style={{
        background: play ? `${game.accent}14` : T.cardBg,
        borderColor: play ? game.accent : T.cardBorder,
      }}
      aria-label={`${label}${solved ? ', solved' : play ? ', played' : ''}`}
    >
      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: T.textMuted }}>{weekday}</span>
      <span
        style={{
          fontFamily: FONT_HEADING,
          fontSize: '1.3rem',
          lineHeight: 1.1,
          color: play ? (isDark ? game.accentOnDark : game.accentStrong) : T.heading,
        }}
      >
        {d}
      </span>
      {play && (
        <span
          className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 rounded-full"
          style={{ background: solved ? game.accentStrong : T.textFaint }}
          aria-hidden
        >
          {solved ? (
            <Check size={10} strokeWidth={3.5} color="white" />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'white' }} />
          )}
        </span>
      )}
    </Link>
  );
}
