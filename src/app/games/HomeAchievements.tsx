import { useMemo } from 'react';
import { Flame, Trophy } from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';
import { getTheme } from '../theme';
import { computeHistoryStats } from './historyStats';
import { GAMES } from './registry';
import { getAllPlays, localDateKey } from './solveRecords';

/**
 * Streak and milestones across every game, for the bottom of the home page.
 * A streak counts days with any puzzle finished: showing up is the habit.
 */
export function HomeAchievements() {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const stats = useMemo(() => computeHistoryStats(getAllPlays()), []);
  const fullHouse = useMemo(
    () => [...stats.byDay.values()].some(day => new Set(day.map(p => p.game)).size >= GAMES.length),
    [stats]
  );
  const best = stats.bestStreak;

  const milestones = [
    { label: 'First puzzle', emoji: '🎉', done: stats.finished >= 1 },
    { label: '3-day streak', emoji: '🔥', done: best >= 3 },
    { label: '7-day streak', emoji: '🏅', done: best >= 7 },
    { label: '30-day streak', emoji: '🏆', done: best >= 30 },
    { label: `All ${GAMES.length} in a day`, emoji: '🦉', done: fullHouse },
  ];

  const playedToday = stats.byDay.has(localDateKey());
  const streakLine =
    stats.currentStreak >= 2
      ? `${stats.currentStreak}-day streak. ${playedToday ? 'See you tomorrow!' : 'Play today to keep it going!'}`
      : stats.currentStreak === 1
        ? playedToday
          ? 'Day one of a new streak. Come back tomorrow!'
          : 'Play today to make it two days in a row!'
        : 'Finish any puzzle today to start a streak.';

  return (
    <section
      className="mt-8 rounded-3xl border p-5 sm:p-6"
      style={{ background: T.cardBg, borderColor: T.cardBorder, boxShadow: T.shadowCard }}
      aria-labelledby="achievements-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2
          id="achievements-title"
          className="m-0 flex items-center gap-2.5"
          style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.2rem', color: T.heading }}
        >
          <Trophy size={22} style={{ color: '#D97706' }} aria-hidden /> Your achievements
        </h2>
        <p
          className="m-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold"
          style={{
            background: T.streakBg,
            color: T.streakText,
            border: `1px solid ${T.streakBorder}`,
          }}
        >
          <Flame size={13} aria-hidden /> {streakLine}
        </p>
      </div>
      <ul className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 list-none p-0 m-0">
        {milestones.map(ms => (
          <li
            key={ms.label}
            className="text-center rounded-2xl px-2 py-3 border-2"
            style={{
              background: ms.done ? (isDark ? '#1D1B26' : '#F5F0FF') : T.inputBg,
              borderColor: ms.done ? '#7C3AED' : T.cardBorder,
            }}
            aria-label={`${ms.label}${ms.done ? ', unlocked' : ', locked'}`}
          >
            <div
              className="text-2xl mb-1"
              style={{ filter: ms.done ? 'none' : 'grayscale(1)' }}
              aria-hidden
            >
              {ms.emoji}
            </div>
            <p
              className="m-0 text-[0.7rem] sm:text-xs font-extrabold leading-tight"
              style={{ color: ms.done ? T.brandText : T.textMuted }}
            >
              {ms.label}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
