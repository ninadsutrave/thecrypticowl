import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, BookOpen, CheckCircle2, Clock } from 'lucide-react';
import { Mascot } from '../components/Mascot';
import { useDarkMode } from '../context/DarkModeContext';
import { getTheme, type Theme } from '../theme';
import { GAMES, type GameMeta } from '../games/registry';
import { GameIcon } from '../games/GameIcon';
import { isDoneToday } from '../games/progress';
import { formatClock, getSolveRecord } from '../games/solveRecords';

const FONT_HEADING = "'Outfit', sans-serif";

/** The lineup's size in words, so the copy follows the registry. */
const COUNT_WORD =
  ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][
    GAMES.length
  ] ?? String(GAMES.length);
const capitalise = (s: string) => s[0].toUpperCase() + s.slice(1);

function useMidnightCountdown() {
  const [left, setLeft] = useState('');
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = Math.floor(diff / 3_600_000);
      const mins = Math.floor((diff % 3_600_000) / 60_000);
      setLeft(`${h}h ${String(mins).padStart(2, '0')}m`);
    };
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);
  return left;
}

// ─── HOME: TODAY'S PUZZLE GRID ────────────────────────────────────────────────

export function Hub() {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const countdown = useMidnightCountdown();
  const done = GAMES.map(g => isDoneToday(g.id));
  const doneCount = done.filter(Boolean).length;
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  useEffect(() => {
    document.title = 'The Cryptic Owl · Daily Puzzles';
  }, []);

  const bubble =
    doneCount === 0
      ? `${capitalise(COUNT_WORD)} fresh puzzles today. Where shall we start? 🦉`
      : doneCount === GAMES.length
        ? `All ${COUNT_WORD} done. Owl-standing work! 🏆`
        : `${doneCount} down, ${GAMES.length - doneCount} to go! 💪`;

  return (
    <div className="max-w-5xl mx-auto px-4 pb-16">
      <header className="pt-8 pb-8 flex flex-col items-center text-center">
        {/* The bubble sits beside the owl in normal flow: Mascot's own
            absolutely-positioned bubble collapses to one word per line when
            the owl is alone in its row. */}
        <div className="mb-4 flex items-end gap-3">
          <Mascot mood="default" size={84} animate />
          <p
            className="px-3.5 py-2.5 border-2 text-sm font-bold text-left max-w-[210px] mb-3"
            style={{
              background: T.bubbleBg,
              borderColor: T.bubbleBorder,
              color: T.bubbleText,
              borderRadius: '18px 18px 18px 4px',
              lineHeight: 1.35,
              boxShadow: T.shadowCard,
            }}
          >
            {bubble}
          </p>
        </div>

        <p
          className="text-xs font-extrabold tracking-wider uppercase mb-2"
          style={{ color: T.brandText }}
        >
          {today}
        </p>
        <h1
          style={{
            fontFamily: FONT_HEADING,
            fontSize: 'clamp(1.8rem, 5vw, 2.6rem)',
            color: T.heading,
            lineHeight: 1.15,
          }}
        >
          {capitalise(COUNT_WORD)} puzzles.{' '}
          <span className="whitespace-nowrap" style={{ color: T.brand }}>
            Every day.
          </span>
        </h1>
        <p
          className="mt-2 max-w-xl"
          style={{ color: T.textMuted, fontWeight: 600, fontSize: '1rem', lineHeight: 1.6 }}
        >
          A fresh set of brain-teasers every morning. Sudoku, cryptic clues, trivia, chess and more.
        </p>

        {/* Today's progress: one segment per game, filled in its colour. */}
        <div className="mt-5 w-full max-w-sm">
          <div
            className="flex gap-1.5"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={GAMES.length}
            aria-valuenow={doneCount}
            aria-label={`${doneCount} of ${GAMES.length} puzzles played today`}
          >
            {GAMES.map((g, i) => (
              <span
                key={g.id}
                className="h-2 flex-1 rounded-full"
                style={{ background: done[i] ? g.accent : T.cardBorder }}
              />
            ))}
          </div>
          <div
            className="mt-2 flex justify-between text-xs font-extrabold"
            style={{ color: T.textMuted }}
          >
            <span>
              {doneCount}/{GAMES.length} played today
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock size={12} aria-hidden /> New puzzles in {countdown}
            </span>
          </div>
        </div>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 list-none p-0 m-0">
        {/* No entrance animation: the grid is the page's main content, and
            starting it at opacity 0 would delay first paint (LCP). */}
        {GAMES.map((game, i) => (
          <li key={game.id}>
            <GameCard game={game} done={done[i]} T={T} isDark={isDark} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function GameCard({
  game,
  done,
  T,
  isDark,
}: {
  game: GameMeta;
  done: boolean;
  T: Theme;
  isDark: boolean;
}) {
  const record = getSolveRecord(game.id);
  const [hover, setHover] = useState(false);
  const ink = isDark ? game.accentOnDark : game.accentStrong;

  return (
    <article
      className="group relative h-full cursor-pointer rounded-3xl border p-5 pt-6 flex flex-col overflow-hidden transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5"
      style={{
        background: T.cardBg,
        borderColor: done ? T.successBorder : T.cardBorder,
        boxShadow: hover ? T.shadowCardHover : T.shadowCard,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Accent strip: each game's colour, at a glance. */}
      <span
        className="absolute inset-x-0 top-0 h-1.5"
        style={{ background: `linear-gradient(90deg, ${game.accent}, ${game.accent}99)` }}
        aria-hidden
      />

      <div className="flex items-start justify-between gap-3 mb-4">
        <GameIcon gameId={game.id} />
        {done && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold"
            style={{ background: T.successBg, color: isDark ? '#6EE7B7' : '#047857' }}
          >
            <CheckCircle2 size={13} aria-hidden />
            {record ? `Solved · ${formatClock(record.seconds)}` : 'Done'}
          </span>
        )}
      </div>

      <h2 style={{ fontFamily: FONT_HEADING, fontSize: '1.2rem', color: T.heading }}>
        {/* The stretched link makes the whole card clickable without nesting
            the tutorial link inside another anchor. */}
        <Link
          to={game.path}
          className="no-underline after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none focus-visible:after:ring-2"
          style={{ color: 'inherit' }}
        >
          {game.name}
        </Link>
      </h2>
      <p
        className="mt-1.5 flex-grow"
        style={{ color: T.textMuted, fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.55 }}
      >
        {game.blurb}
      </p>

      <div className="mt-5 flex items-center justify-between gap-2">
        {/* Cryptic has its own long-form guide; every other game opens its
            step-by-step walkthrough on the game page. */}
        <Link
          to={game.tutorialPath ?? `${game.path}?tutorial`}
          className="relative z-10 inline-flex items-center gap-1 text-xs font-extrabold no-underline hover:underline min-h-[36px] -my-2.5"
          style={{ color: T.brandText }}
        >
          <BookOpen size={13} aria-hidden />{' '}
          {game.tutorialPath ? 'New to cryptics? Tutorial' : 'How to play'}
        </Link>
        {/* Decorative, and click-through: on hover its nudge (a transform)
            lifts it above the card's link, where it would swallow clicks. */}
        <span
          className="pointer-events-none inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-extrabold transition-transform group-hover:translate-x-0.5"
          style={
            done
              ? { color: ink, background: 'transparent', border: `1.5px solid ${ink}` }
              : { color: '#FFFFFF', background: game.accentStrong }
          }
          aria-hidden
        >
          {done ? 'Review' : 'Play'} <ArrowRight size={15} />
        </span>
      </div>
    </article>
  );
}
