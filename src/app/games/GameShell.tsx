import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { m, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Flame,
  GraduationCap,
  LayoutGrid,
  RotateCcw,
  Copy,
  Share2,
  Timer,
  Trophy,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Mascot, type MascotMood } from '../components/Mascot';
import { useDarkMode } from '../context/DarkModeContext';
import { getTheme, type Theme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { getGame, type GameId, type GameMeta } from './registry';
import { nextUnfinished } from './progress';
import {
  clearProgress,
  formatClock,
  getSolveRecord,
  localDateKey,
  progressKey,
  type SolveOutcome,
  type SolveRecord,
} from './solveRecords';
import { recordPlay } from './playHistory';
import { usePuzzleReaction } from '../hooks/usePuzzleReaction';
import { ReactionWidget } from '../pages/puzzle/ClueReactionWidget';
import { TutorialFlow, type TutorialStep } from './TutorialFlow';
import { hasSeenTutorial, markTutorialSeen } from './tutorialSeen';
import { useGameTimer } from './useGameTimer';
import { buildGameShare, gridWithoutEmoji } from './share';
import { DayComplete } from './DayComplete';
import { computeHistoryStats } from './historyStats';
import { getAllPlays } from './solveRecords';
import { canShareSheet, shareOrCopy } from '../pages/puzzle/shareResult';
import { GameIcon } from './GameIcon';
import { archiveDateFrom, archivePath, longDate, recordArchivePlay } from './archive';
import { SignInGate } from '../components/SignInGate';

export interface GameResult {
  outcome: SolveOutcome;
  /** Short result line shown under the time, e.g. "8/10 correct". */
  score?: string;
  /** Hints taken. Recorded in the play history. */
  hints: number;
  /** Wrong guesses, wrong moves, failed checks. Defaults to 0. */
  mistakes?: number;
  /** Game-specific numbers behind the score, e.g. { correct: 8, total: 10 }. */
  details?: SolveRecord['details'];
  /** Spoiler-free emoji grid for the share text, e.g. "🟩🟥🟩⬜⬜". */
  grid?: string;
  /**
   * The answer, shown on the result card (which replaces the board), e.g.
   * "Shampoo" or a quote with its author. Never in the share text.
   */
  reveal?: string;
}

export interface PlayApi {
  /** Stop the clock and record the result. Safe to call more than once. */
  complete: (result: GameResult) => void;
  /** True once `complete` has been called — boards should lock. */
  finished: boolean;
  /** Where in-progress state is saved; null for practice replays. */
  progressSlot: string | null;
  /** A wrong number, move or answer: the owl looks worried for a moment. */
  oops: () => void;
}

interface GameShellProps {
  gameId: GameId;
  /** Today's variant or category, shown under the title. */
  subtitle?: string;
  /** The walkthrough shown on the first visit and from the header. */
  tutorial: TutorialStep[];
  /**
   * Today's generated puzzle was unavailable, so a built-in one stands in.
   * Finishing it counts as the day's play (streaks and achievements keep
   * working through an outage).
   */
  practice?: boolean;
  /** Identifies the puzzle, so saved progress never lands on a different one. */
  puzzleId: string;
  children: (api: PlayApi) => ReactNode;
}

const FONT_HEADING = "'Outfit', sans-serif";
const FONT_BODY = "'Nunito', sans-serif";

function todayLabel() {
  return new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * The frame every daily game is played in: header, live clock, How to play,
 * and the result card. Games render only their board and call `complete`.
 */
export function GameShell({
  gameId,
  subtitle,
  tutorial,
  practice = false,
  puzzleId,
  children,
}: GameShellProps) {
  const game = getGame(gameId);
  const [searchParams, setSearchParams] = useSearchParams();
  // A past day from the archive (`?date=`): members only, never recorded as
  // today's solve, and always opens on a fresh board.
  const archiveDate = archiveDateFrom(searchParams);
  const { isSignedIn } = useAuth();
  // Read once: a puzzle finished on an earlier visit opens on its summary,
  // while one finished just now stays on its board with the result below.
  const [record] = useState<SolveRecord | null>(() =>
    archiveDate ? null : getSolveRecord(gameId)
  );
  const [replaying, setReplaying] = useState(false);
  const [round, setRound] = useState(0);
  // Opens itself on a first visit (before the clock starts), and on demand
  // via `?tutorial` — the home grid's "How to play" link.
  const [tutorialOpen, setTutorialOpen] = useState(
    () => searchParams.has('tutorial') || (!record && !hasSeenTutorial(gameId))
  );
  const closeTutorial = useCallback(() => {
    setTutorialOpen(false);
    markTutorialSeen(gameId);
    if (searchParams.has('tutorial')) {
      const next = new URLSearchParams(searchParams);
      next.delete('tutorial');
      setSearchParams(next, { replace: true });
    }
  }, [gameId, searchParams, setSearchParams]);
  const openTutorial = useCallback(() => setTutorialOpen(true), []);
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);

  useEffect(() => {
    document.title = `${game.name} · Free daily puzzle · The Cryptic Owl`;
  }, [game.name]);

  const startReplay = () => {
    setReplaying(true);
    setRound(r => r + 1);
  };

  if (archiveDate && !isSignedIn) return <SignInGate />;

  return (
    <div className="max-w-2xl mx-auto px-4 pb-20 pt-6" style={{ fontFamily: FONT_BODY }}>
      {record && !replaying ? (
        <>
          <GameHeader
            game={game}
            subtitle={subtitle}
            T={T}
            clock={record.seconds}
            frozen
            onTutorial={openTutorial}
            mood={null}
          />
          <ResultCard
            game={game}
            record={record}
            T={T}
            isDark={isDark}
            alreadyDone
            puzzleDate={localDateKey()}
            onReplay={startReplay}
          />
        </>
      ) : (
        <GameSession
          // A new puzzle (say a replacement fetched after the cached one was
          // shown) starts a fresh session, never the old one's state.
          key={`${archiveDate}-${round}-${puzzleId}`}
          game={game}
          subtitle={subtitle}
          replaying={replaying || archiveDate !== null}
          archiveDate={archiveDate}
          puzzleId={puzzleId}
          practicePuzzle={practice}
          paused={tutorialOpen}
          onTutorial={openTutorial}
          onReplay={startReplay}
          T={T}
          isDark={isDark}
        >
          {children}
        </GameSession>
      )}
      <TutorialFlow game={game} steps={tutorial} open={tutorialOpen} onClose={closeTutorial} />
    </div>
  );
}

function GameSession({
  game,
  subtitle,
  replaying,
  archiveDate,
  puzzleId,
  practicePuzzle,
  paused,
  onTutorial,
  onReplay,
  T,
  isDark,
  children,
}: {
  game: GameMeta;
  subtitle?: string;
  replaying: boolean;
  archiveDate: string | null;
  puzzleId: string;
  practicePuzzle: boolean;
  paused: boolean;
  onTutorial: () => void;
  onReplay: () => void;
  T: Theme;
  isDark: boolean;
  children: (api: PlayApi) => ReactNode;
}) {
  const timer = useGameTimer(game.id, { persist: !replaying, paused });
  const { user } = useAuth();
  const [result, setResult] = useState<SolveRecord | null>(null);
  const progressSlot = replaying ? null : progressKey(game.id, timer.date, puzzleId);
  const [worried, setWorried] = useState(false);
  const [showCard, setShowCard] = useState(false);
  useEffect(() => {
    if (!result) return;
    const t = setTimeout(() => {
      setShowCard(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1200);
    return () => clearTimeout(t);
  }, [result]);
  useEffect(() => {
    if (!worried) return;
    const t = setTimeout(() => setWorried(false), 1600);
    return () => clearTimeout(t);
  }, [worried]);

  const api = useMemo<PlayApi>(
    () => ({
      finished: result !== null,
      progressSlot,
      oops: () => setWorried(true),
      complete: ({ outcome, score, hints, mistakes = 0, details, grid, reveal }) => {
        if (result) return;
        const seconds = timer.stop();
        // The grid rides along in details so a later visit can share it too.
        const play = {
          seconds,
          outcome,
          score,
          hints,
          mistakes,
          details: { ...details, ...(grid ? { grid } : {}), ...(reveal ? { reveal } : {}) },
        };
        const finished = { ...play, completedAt: new Date().toISOString() };
        if (progressSlot) {
          recordPlay(game.id, play, user?.id);
          clearProgress(progressSlot);
        }
        if (archiveDate && !practicePuzzle) {
          recordArchivePlay(game.id, archiveDate, { outcome, seconds });
        }
        setResult(finished);
        if (outcome === 'solved') {
          confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 } });
        }
      },
    }),
    [result, timer, progressSlot, game.id, user?.id, archiveDate, practicePuzzle]
  );

  return (
    <>
      <GameHeader
        game={game}
        subtitle={subtitle}
        T={T}
        clock={timer.seconds}
        frozen={timer.stopped}
        practice={replaying && !practicePuzzle && !archiveDate}
        archiveDate={archiveDate}
        onTutorial={onTutorial}
        mood={result ? null : worried ? 'wrong' : 'thinking'}
      />
      {practicePuzzle && (
        <p
          className="mb-4 rounded-2xl border px-4 py-2.5 text-sm font-bold"
          style={{ background: T.fodderBg, borderColor: T.streakBorder, color: T.text }}
          role="status"
        >
          {archiveDate
            ? "This day's puzzle couldn't be loaded, so here's a practice one instead."
            : "Today's puzzle isn't available right now, so here's a stand-in. It counts as today's play."}
        </p>
      )}
      {/* Finished: the board stays a moment so the last move lands, then the
          result card takes its place. Play again brings a fresh board. */}
      {!showCard && <div className="mt-5">{children(api)}</div>}
      <AnimatePresence>
        {result && showCard && (
          <ResultCard
            game={game}
            record={result}
            T={T}
            isDark={isDark}
            practice={replaying}
            archive={archiveDate !== null && !practicePuzzle}
            // A second run of a finished puzzle isn't worth sharing; a first
            // finish is, even on a practice or archive puzzle.
            shareable={!replaying || practicePuzzle || archiveDate !== null}
            shareDate={archiveDate}
            puzzleDate={practicePuzzle ? null : (archiveDate ?? localDateKey())}
            onReplay={onReplay}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function GameHeader({
  game,
  subtitle,
  T,
  clock,
  frozen,
  practice,
  archiveDate,
  onTutorial,
  mood = 'thinking',
}: {
  game: GameMeta;
  subtitle?: string;
  T: Theme;
  clock: number;
  frozen?: boolean;
  practice?: boolean;
  archiveDate?: string | null;
  onTutorial: () => void;
  /** Ollie beside the title while you play; null once the result card (with its own owl) shows. */
  mood?: MascotMood | null;
}) {
  return (
    <header className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <Link
          to={archiveDate ? archivePath(game.id) : '/'}
          className="inline-flex items-center gap-1.5 text-sm font-bold no-underline hover:underline min-h-[40px] -my-2 whitespace-nowrap"
          style={{ color: T.brandText }}
        >
          <ArrowLeft size={15} /> {archiveDate ? 'Archive' : 'All puzzles'}
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={onTutorial}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 sm:px-3 py-1.5 border text-sm font-bold whitespace-nowrap"
            style={{ borderColor: T.brandBorder, color: T.brandText, background: T.brandSurface }}
          >
            <GraduationCap size={14} className="hidden min-[400px]:inline" /> How to play
          </button>
          <div
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 border"
            style={{ background: T.streakBg, borderColor: T.streakBorder }}
            role="timer"
            aria-label={`Time: ${formatClock(clock)}`}
            title={frozen ? 'Final time' : 'Pauses while this tab is hidden'}
          >
            <Timer size={13} style={{ color: T.streakText }} />
            <span
              style={{ fontFamily: FONT_HEADING, fontSize: '0.9rem', color: T.streakText }}
              aria-hidden
            >
              {formatClock(clock)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <GameIcon gameId={game.id} />
        <div className="min-w-0 flex-1">
          <h1
            style={{
              fontFamily: FONT_HEADING,
              fontSize: 'clamp(1.35rem, 4.5vw, 1.7rem)',
              color: T.heading,
              lineHeight: 1.15,
            }}
          >
            {game.name}
          </h1>
          <p style={{ color: T.textMuted, fontWeight: 700, fontSize: '0.8rem', margin: 0 }}>
            {[
              subtitle,
              archiveDate ? longDate(archiveDate) : todayLabel(),
              practice ? 'Practice replay' : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {archiveDate && (
            <span
              className="mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-extrabold"
              style={{ background: T.brandSurface, color: T.brandText }}
            >
              <CalendarDays size={12} aria-hidden /> From the archive
            </span>
          )}
        </div>
        {mood && (
          <div className="ml-auto flex-shrink-0">
            <Mascot mood={mood} size={52} animate={mood === 'thinking'} />
          </div>
        )}
      </div>
    </header>
  );
}

/** Happy after a solve, a wink after a reveal, worried after a miss. */
function moodFor(outcome: SolveOutcome): MascotMood {
  return outcome === 'solved' ? 'celebrating' : outcome === 'revealed' ? 'hint' : 'wrong';
}

const OUTCOME_COPY: Record<SolveOutcome, { title: string; bubble: string }> = {
  solved: { title: 'Solved!', bubble: 'Hoot hoot! Nicely done! 🎉' },
  failed: { title: 'Not this time', bubble: "So close! Tomorrow's yours. 🦉" },
  revealed: { title: 'Answer revealed', bubble: 'Every reveal teaches something! 📚' },
};

function ResultCard({
  game,
  record,
  T,
  isDark,
  alreadyDone,
  practice,
  archive,
  shareable,
  shareDate,
  puzzleDate = null,
  onReplay,
}: {
  game: GameMeta;
  record: SolveRecord;
  T: Theme;
  isDark: boolean;
  alreadyDone?: boolean;
  practice?: boolean;
  /** A past day from the archive: back to the archive, not on to today's games. */
  archive?: boolean;
  /** Overrides `practice` for the share button. */
  shareable?: boolean;
  /** The puzzle's own date for the share text (archive days). */
  shareDate?: string | null;
  /** The day of the puzzle being rated; null for a practice puzzle. */
  puzzleDate?: string | null;
  onReplay: () => void;
}) {
  const copy = OUTCOME_COPY[record.outcome];
  const next = archive ? null : nextUnfinished(game.id);
  // This game's own history: best time and day streak, read after the
  // finish was recorded so today counts.
  const mine = useMemo(() => {
    const plays = getAllPlays().filter(p => p.game === game.id);
    const stats = computeHistoryStats(plays);
    return {
      best: stats.perGame[game.id]?.bestSeconds ?? null,
      streak: stats.currentStreak,
      solves: stats.solved,
    };
  }, [game.id]);
  const isBest =
    !practice && record.outcome === 'solved' && mine.solves > 1 && mine.best === record.seconds;
  const [shared, setShared] = useState<'idle' | 'shared' | 'copied' | 'failed'>('idle');
  // The confirmation is a moment's feedback, not a new state for the button.
  useEffect(() => {
    if (shared === 'idle') return;
    const t = setTimeout(() => setShared('idle'), 2500);
    return () => clearTimeout(t);
  }, [shared]);
  const { user } = useAuth();
  const rating = usePuzzleReaction(game.id, puzzleDate, user?.id);

  const share = async () =>
    setShared(
      await shareOrCopy(
        buildGameShare(game, record, {
          streak: practice ? 0 : mine.streak,
          date: shareDate ? new Date(`${shareDate}T12:00:00`) : new Date(),
        })
      )
    );

  return (
    <m.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 rounded-3xl border-2 p-6 text-center"
      style={{
        background: record.outcome === 'solved' ? T.successBg : T.cardBg,
        borderColor: record.outcome === 'solved' ? T.successBorder : T.cardBorderStrong,
        boxShadow: T.shadowCard,
      }}
      aria-live="polite"
    >
      <div className="flex justify-center mb-3">
        <Mascot mood={moodFor(record.outcome)} size={72} animate />
      </div>
      <p
        style={{
          fontFamily: FONT_HEADING,
          fontSize: '1.4rem',
          color: T.heading,
          marginBottom: 2,
        }}
      >
        {alreadyDone ? "You've played today's puzzle" : copy.title}
      </p>
      <p style={{ color: T.textMuted, fontWeight: 700, fontSize: '0.85rem' }}>
        {archive
          ? 'Archive puzzles don’t count towards streaks.'
          : practice
            ? 'Practice runs are not recorded. '
            : ''}
        {alreadyDone ? copy.bubble : null}
      </p>
      {isBest && (
        <p
          className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold"
          style={{
            background: T.streakBg,
            color: T.streakText,
            border: `1px solid ${T.streakBorder}`,
          }}
        >
          <Trophy size={13} aria-hidden /> New personal best!
        </p>
      )}

      <div className="flex flex-wrap justify-center gap-2.5 my-4">
        <Stat label="Time" value={formatClock(record.seconds)} T={T} isDark={isDark} />
        {record.score && <Stat label="Result" value={record.score} T={T} isDark={isDark} />}
        {!practice && mine.best != null && (
          <Stat label="Best" value={formatClock(mine.best)} T={T} isDark={isDark} />
        )}
        {!practice && mine.streak > 0 && (
          <Stat
            label="Streak"
            value={`${mine.streak} day${mine.streak === 1 ? '' : 's'}`}
            icon={<Flame size={14} aria-hidden />}
            T={T}
            isDark={isDark}
          />
        )}
      </div>

      {typeof record.details?.reveal === 'string' && (
        <div
          className="mb-4 mx-auto max-w-md rounded-2xl border px-4 py-3 text-left"
          style={{ background: T.cardBg, borderColor: T.cardBorder }}
        >
          <p
            className="text-xs font-extrabold uppercase tracking-wider mb-1"
            style={{ color: T.textMuted }}
          >
            {record.outcome === 'solved' ? 'The answer' : 'It was'}
          </p>
          <p className="whitespace-pre-line font-bold" style={{ color: T.heading }}>
            {record.details.reveal}
          </p>
        </div>
      )}

      {typeof record.details?.grid === 'string' && (
        <p
          className="mb-4 whitespace-pre-line leading-tight"
          style={{ fontSize: '1.25rem', letterSpacing: '0.08em' }}
          aria-label="Your result grid"
        >
          {gridWithoutEmoji(record.details.grid, game.emoji)}
        </p>
      )}

      {(shareable ?? !practice) && (
        <div className="mb-3 flex flex-col sm:flex-row gap-2 justify-center">
          <button
            onClick={share}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-extrabold"
            style={{ background: game.accentStrong, color: '#FFFFFF', boxShadow: T.shadowCard }}
          >
            {shared === 'copied' || shared === 'shared' ? (
              <>
                <Check size={16} aria-hidden /> {shared === 'copied' ? 'Result copied' : 'Shared!'}
              </>
            ) : (
              <>
                {canShareSheet ? <Share2 size={16} aria-hidden /> : <Copy size={16} aria-hidden />}{' '}
                {shared === 'failed'
                  ? 'Couldn’t share. Try again'
                  : canShareSheet
                    ? 'Share result'
                    : 'Copy result'}
              </>
            )}
          </button>
        </div>
      )}

      <div className="mb-4">
        <ReactionWidget
          reaction={rating.reaction}
          vote={rating.vote}
          noun="puzzle"
          isDark={isDark}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        {archive ? (
          <Link
            to={archivePath(game.id)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-extrabold no-underline"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', color: T.onBrand }}
          >
            <CalendarDays size={16} /> More from the archive
          </Link>
        ) : next ? (
          <Link
            to={next.path}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-extrabold no-underline"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', color: T.onBrand }}
          >
            Next: {next.name} <ArrowRight size={16} />
          </Link>
        ) : null}
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-extrabold no-underline border-2"
          style={{ borderColor: T.brandBorder, color: T.brandText, background: T.brandSurface }}
        >
          <LayoutGrid size={16} /> All puzzles
        </Link>
        <button
          onClick={onReplay}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-extrabold border-2"
          style={{ borderColor: T.cardBorder, color: T.textMuted, background: 'transparent' }}
        >
          <RotateCcw size={16} /> Play again
        </button>
      </div>
      {!next && !practice && (
        <>
          <div className="mt-6 text-left">
            <DayComplete />
          </div>
          <p className="mt-4" style={{ color: T.textMuted, fontWeight: 700, fontSize: '0.85rem' }}>
            New puzzles arrive at midnight 🦉
          </p>
        </>
      )}
    </m.section>
  );
}

function Stat({
  label,
  value,
  icon,
  T,
  isDark,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  T: Theme;
  isDark: boolean;
}) {
  return (
    <div
      className="rounded-2xl px-4 py-2 min-w-[96px]"
      style={{ background: isDark ? T.inputBg : 'white', border: `1px solid ${T.cardBorder}` }}
    >
      <p style={{ fontSize: '0.7rem', fontWeight: 800, color: T.textMuted, margin: 0 }}>
        {label.toUpperCase()}
      </p>
      <p
        className="inline-flex items-center gap-1"
        style={{ fontFamily: FONT_HEADING, fontSize: '1.25rem', color: T.heading, margin: 0 }}
      >
        {icon}
        {value}
      </p>
    </div>
  );
}
