import { useState, useRef, useEffect, useMemo } from 'react';
import { m, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  GraduationCap,
  BookOpen,
  Lightbulb,
  Send,
  RotateCcw,
  ChevronDown,
  Timer,
  ExternalLink,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { Mascot, MascotMood } from '../components/Mascot';
import { useDarkMode } from '../context/DarkModeContext';
import { getTheme } from '../theme';
import { hasSolvedToday } from '../hooks/useStreak';
import { useAuth } from '../context/AuthContext';
import { fetchPuzzleByDate, type DbDailyPuzzle } from '../../lib/supabase';
import { StoreKeys, readRaw, writeRaw, readJSON, prunePuzzleCache } from '../lib/localStore';
import { ClueReactionWidget } from './puzzle/ClueReactionWidget';
import { SolveTimer } from './puzzle/Timers';
import { HintCard } from './puzzle/HintCard';
import { SuccessState } from './puzzle/SuccessState';
import { WrongFeedback, AlreadySolvedBanner } from './puzzle/Feedback';
import { mapDbPuzzle, DEFAULT_PUZZLE } from './puzzle/hints';
import type { ActivePuzzle } from './puzzle/ActivePuzzle';
import { recordPlay } from '../games/playHistory';
import { TutorialFlow } from '../games/TutorialFlow';
import { getGame } from '../games/registry';
import { hasSeenTutorial, markTutorialSeen } from '../games/tutorialSeen';
import { getCrypticTutorial } from './puzzle/crypticTutorial';
import { archiveDateFrom, archivePath, longDate, recordArchivePlay } from '../games/archive';
import { localDateKey } from '../games/solveRecords';
import { SignInGate } from '../components/SignInGate';

const CRYPTIC_TUTORIAL = getCrypticTutorial();

/** Ollie's hint-2 nudge, per mechanism. */
const MECHANISM_NUDGE: Record<string, string> = {
  anagram: 'Can you see the anagram now? 🔀',
  reversal: 'Try reading one of those words backwards! ↩️',
  container: 'Something is tucked inside something else 📦',
  hidden: 'The answer is hiding in plain sight — read across the gaps 🔎',
  deletion: 'Something needs dropping. Head, tail, or heart? ✂️',
  initial_letters: 'Take just the first letters ☝️',
  final_letters: 'Take just the last letters 👇',
  alternating_letters: 'Every other letter — try odds, then evens 🔢',
  spoonerism: 'Swap those opening sounds, Reverend-style 🗣️',
  charade: 'Build it piece by piece, left to right 🧱',
  homophone: 'Say it out loud — what does it sound like? 🔊',
  double_definition: 'Two meanings, one word. Both ends define it! 👯',
  cryptic_definition: 'Read it again, but sideways 🤔',
  andlit: 'The whole clue is doing double duty ✨',
  compound: 'Two tricks at once — untangle them one at a time 🪢',
};

// ─── MAIN PUZZLE PAGE ─────────────────────────────────────────────────────────

export function Puzzle() {
  // A past day from the archive (`/cryptic?date=2026-10-09`), the same URL
  // shape as every other game. Old /puzzle/42 links redirect here (routes.tsx).
  const [searchParams, setSearchParams] = useSearchParams();
  const archiveDate = archiveDateFrom(searchParams);
  const isArchive = archiveDate !== null;

  // The puzzle to play: archive puzzle (if loaded) or today's hardcoded puzzle
  const [activePuzzle, setActivePuzzle] = useState<ActivePuzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);

    // Guard against stale writes if the user navigates before the fetch resolves
    // (e.g. rapid archive hops).
    let cancelled = false;

    if (archiveDate) {
      fetchPuzzleByDate(archiveDate, false)
        .then(p => {
          if (cancelled) return;
          if (p) {
            setActivePuzzle(mapDbPuzzle(p));
            setPuzzleId(p.id);
            setStartTime(Date.now());
          } else {
            setNotFound(true);
          }
          setLoading(false);
        })
        .catch(() => {
          if (cancelled) return;
          setNotFound(true);
          setLoading(false);
        });
    } else {
      // Fetch today's puzzle with stale-while-revalidate caching. Using
      // `updated_at` as the cache key lets us paint instantly from cache and
      // silently refresh if admin edited the clue mid-day.
      // The player's own date, like every other game: by UTC, India saw
      // yesterday's clue until 05:30.
      const isoDate = localDateKey();
      const cacheKey = StoreKeys.puzzle(isoDate);
      // One entry is written per day; without this they accumulate forever.
      prunePuzzleCache();
      const cached = readRaw(cacheKey);
      let paintedFromCache = false;

      const cachedPuzzle = cached ? readJSON<DbDailyPuzzle | null>(cacheKey, null) : null;
      if (cachedPuzzle) {
        setActivePuzzle(mapDbPuzzle(cachedPuzzle));
        setPuzzleId(cachedPuzzle.id);
        setStartTime(Date.now());
        setLoading(false);
        paintedFromCache = true;
      }

      fetchPuzzleByDate(isoDate)
        .then(p => {
          if (cancelled) return;
          if (p) {
            const freshJson = JSON.stringify(p);
            // Swap to fresh data only if it actually changed — avoids a
            // pointless re-render when cache is already current.
            if (!paintedFromCache || cached !== freshJson) {
              setActivePuzzle(mapDbPuzzle(p));
              setPuzzleId(p.id);
              if (!paintedFromCache) setStartTime(Date.now());
              writeRaw(cacheKey, freshJson);
            }
          } else if (!paintedFromCache) {
            // Nothing for today or yesterday and no cache — fall back to the
            // built-in practice clue so the page is never a dead end. It is
            // flagged isFallback, so solving it awards no XP or streak day.
            setActivePuzzle(DEFAULT_PUZZLE);
            setStartTime(Date.now());
          }
          setLoading(false);
        })
        .catch(() => {
          if (cancelled) return;
          if (!paintedFromCache) {
            setActivePuzzle(DEFAULT_PUZZLE);
            setStartTime(Date.now());
          }
          setLoading(false);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [archiveDate]);

  const [answer, setAnswer] = useState('');
  const [hintsUnlocked, setHintsUnlocked] = useState(0);
  const [isCorrect, setIsCorrect] = useState(false);
  const [wasRevealed, setWasRevealed] = useState(false);
  const [wrongAttempt, setWrongAttempt] = useState<string | null>(null);
  const [wrongAttemptsCount, setWrongAttemptsCount] = useState(0);
  const [newHintIndex, setNewHintIndex] = useState<number | null>(null);
  const [showAllHints, setShowAllHints] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  // How to play: opens on the first visit, from the header, and from the
  // home card's "How to play" (?tutorial). Time spent reading isn't solve time.
  const [tutorialOpen, setTutorialOpen] = useState(
    () => searchParams.has('tutorial') || !hasSeenTutorial('cryptic')
  );
  const tutorialOpenedAt = useRef(Date.now());
  const openTutorial = () => {
    tutorialOpenedAt.current = Date.now();
    setTutorialOpen(true);
  };
  const closeTutorial = () => {
    setTutorialOpen(false);
    markTutorialSeen('cryptic');
    const away = Date.now() - tutorialOpenedAt.current;
    setStartTime(t => (t ? Math.min(Date.now(), t + away) : t));
    if (searchParams.has('tutorial')) {
      const next = new URLSearchParams(searchParams);
      next.delete('tutorial');
      setSearchParams(next, { replace: true });
    }
  };
  const [solveTime, setSolveTime] = useState(0);
  const [puzzleId, setPuzzleId] = useState<string | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const { user, isSignedIn } = useAuth();
  const alreadySolved = isArchive ? false : hasSolvedToday();
  // The date this puzzle was published, not the date you are reading it.
  // An archive clue was captioned with today because activePuzzle.date — which is
  // fetched — was never read.
  const displayDate = useMemo(() => {
    const opts = { day: 'numeric', month: 'long', year: 'numeric' } as const;
    const iso = activePuzzle?.date;
    if (iso) {
      const [y, mo, d] = iso.split('-').map(Number);
      if (y && mo && d) return new Date(y, mo - 1, d).toLocaleDateString('en-GB', opts);
    }
    return new Date().toLocaleDateString('en-GB', opts);
  }, [activePuzzle?.date]);

  // Today's solve feeds the home grid's "done" badge and time. Archive and
  // fallback puzzles aren't today's, and a replay never overwrites the first.
  useEffect(() => {
    // The fallback clue stands in for a missing day: it counts as the day's
    // play (home badge, achievements), though not for XP (SuccessState).
    if (!isCorrect || !activePuzzle) return;
    if (isArchive) {
      // A past clue: marked done in the archive, never today's solve.
      if (activePuzzle.date) {
        recordArchivePlay('cryptic', activePuzzle.date, {
          outcome: wasRevealed ? 'revealed' : 'solved',
          seconds: Math.max(1, solveTime),
        });
      }
      return;
    }
    recordPlay(
      'cryptic',
      {
        seconds: Math.max(1, solveTime),
        outcome: wasRevealed ? 'revealed' : 'solved',
        score: wasRevealed
          ? 'Revealed'
          : hintsUnlocked === 0
            ? 'No hints'
            : `${hintsUnlocked} hint${hintsUnlocked === 1 ? '' : 's'}`,
        hints: hintsUnlocked,
        mistakes: wrongAttemptsCount,
        details: { puzzleNumber: activePuzzle.number, type: activePuzzle.type ?? '' },
      },
      user?.id
    );
  }, [
    isCorrect,
    isArchive,
    activePuzzle,
    solveTime,
    wasRevealed,
    hintsUnlocked,
    wrongAttemptsCount,
    user?.id,
  ]);

  useEffect(() => {
    document.title = 'British Style Cryptics · Free daily puzzle · The Cryptic Owl';
  }, []);

  // SPA-level "soft 404": we can't return an HTTP 404 status, but we can tell
  // crawlers this page has no indexable content so Google/Bing don't accrue
  // "Puzzle not found" entries in their index. Reverts on unmount.
  useEffect(() => {
    if (!notFound) return;
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex,nofollow';
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, [notFound]);

  // Past clues are the archive: members only.
  if (isArchive && !isSignedIn) return <SignInGate />;

  // Loading state for archive puzzles
  if (notFound) {
    return (
      <div
        className="max-w-2xl mx-auto px-4 py-16 text-center"
        style={{ fontFamily: "'Nunito', sans-serif" }}
      >
        <div className="flex justify-center mb-6">
          <Mascot
            mood="thinking"
            size={90}
            speechBubble="Puzzle not found!"
            bubbleDirection="right"
            animate
          />
        </div>
        <h2
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '1.6rem',
            color: T.brandStrong,
            marginBottom: 8,
          }}
        >
          No clue for {archiveDate ? longDate(archiveDate) : 'this day'}
        </h2>
        <p
          style={{
            color: T.textMuted,
            fontWeight: 600,
            fontSize: '0.95rem',
            lineHeight: 1.6,
            maxWidth: 380,
            margin: '0 auto 24px',
          }}
        >
          This puzzle hasn't been published yet, or the number is incorrect.
        </p>
        <a
          href="/cryptic"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold"
          style={{
            background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
            color: 'white',
            fontFamily: "'Nunito', sans-serif",
            fontWeight: 800,
            textDecoration: 'none',
          }}
        >
          ← Play Today's Puzzle
        </a>
      </div>
    );
  }

  const getMood = (): MascotMood => {
    if (isCorrect) return 'celebrating';
    if (wrongAttempt) return 'wrong';
    if (hintsUnlocked > 0) return 'hint';
    return 'default';
  };

  const getMascotComment = () => {
    if (isCorrect) return 'Brilliant solve! 🎉';
    if (wrongAttempt) return 'Hmm… not quite! 🤔';
    if (hintsUnlocked === 0) return "Let's crack this clue together! 🔍";
    if (hintsUnlocked === 1) return 'Spotted the definition yet? 👀';
    // Hints 2 and 3 used to say "Can you see the anagram now?" and "Shuffle
    // those letters!" for every clue — wrong for fourteen of the fifteen
    // mechanisms. Ollie now reacts to the clue actually on screen.
    if (hintsUnlocked === 2)
      return MECHANISM_NUDGE[activePuzzle?.type ?? ''] ?? 'Spot the trick yet? 🔍';
    if (hintsUnlocked === 3) return 'You know the mechanism — now apply it! ✨';
    return "You've got all the clues you need! 🎯";
  };

  const handleSubmit = () => {
    if (!answer.trim() || !activePuzzle) return;
    if (answer.trim().toUpperCase() === activePuzzle.answer) {
      setSolveTime(Math.floor((Date.now() - startTime) / 1000));
      setIsCorrect(true);
      setWrongAttempt(null);
    } else {
      setWrongAttemptsCount(c => c + 1);
      setWrongAttempt(answer.trim());
      setAnswer('');
      inputRef.current?.focus();
    }
  };

  const handleHint = () => {
    if (activePuzzle && hintsUnlocked < activePuzzle.hints.length) {
      setNewHintIndex(hintsUnlocked);
      setHintsUnlocked(prev => prev + 1);
      setWrongAttempt(null);
    }
  };

  const handleReset = () => {
    setAnswer('');
    setHintsUnlocked(0);
    setIsCorrect(false);
    setWasRevealed(false);
    setWrongAttempt(null);
    setWrongAttemptsCount(0);
    setNewHintIndex(null);
    setShowAllHints(false);
    // Reset the solve clock so "Practice Again" doesn't inherit the previous
    // run's startTime (which would inflate the replay's recorded solve time).
    setSolveTime(0);
    setStartTime(Date.now());
  };

  const visibleHints = activePuzzle?.hints.slice(0, hintsUnlocked) || [];

  const handleReveal = () => {
    setWasRevealed(true);
    setIsCorrect(true);
    setSolveTime(Math.floor((Date.now() - startTime) / 1000));
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pb-20 pt-6">
      <div className="flex items-center justify-between mb-3">
        <Link
          to={isArchive ? archivePath('cryptic') : '/'}
          className="inline-flex items-center gap-1.5 text-sm font-bold no-underline hover:underline whitespace-nowrap"
          style={{ color: T.brandText }}
        >
          <ArrowLeft size={15} /> {isArchive ? 'Archive' : 'All puzzles'}
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={openTutorial}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 sm:px-3 py-1.5 border text-sm font-bold whitespace-nowrap"
            style={{ borderColor: T.brandBorder, color: T.brandText, background: T.brandSurface }}
          >
            <GraduationCap size={14} className="hidden min-[400px]:inline" /> How to play
          </button>
          <Link
            to="/learn"
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 sm:px-3 py-1.5 border text-sm font-bold no-underline whitespace-nowrap"
            style={{ borderColor: T.cardBorder, color: T.brandText, background: T.cardBg }}
          >
            <BookOpen size={14} className="hidden min-[400px]:inline" /> Know more
          </Link>
        </div>
      </div>
      <TutorialFlow
        game={getGame('cryptic')}
        steps={CRYPTIC_TUTORIAL}
        open={tutorialOpen}
        onClose={closeTutorial}
        finalLink={{ to: '/learn', label: 'Know more' }}
      />
      {!isCorrect ? (
        <div className="space-y-5">
          {/* Already solved notice */}
          {alreadySolved && <AlreadySolvedBanner isDark={isDark} onSolvePractice={handleReset} />}

          {/* Header card */}
          <div
            className="rounded-3xl p-6 shadow-md border"
            style={{ background: T.cardBg, borderColor: T.cardBorder }}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                {loading ? (
                  <div className="space-y-2 animate-pulse">
                    <div
                      className="h-4 w-32 rounded-md"
                      style={{ background: isDark ? '#26242F' : '#EDE9FE' }}
                    />
                    <div className="h-3 w-24 rounded-md" style={{ background: T.indicatorBg }} />
                  </div>
                ) : (
                  <>
                    <p
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: '0.85rem',
                        color: '#7C3AED',
                        marginBottom: 2,
                      }}
                    >
                      🧩 CRYPTIC #{activePuzzle?.number}
                    </p>
                    <p
                      style={{
                        fontSize: '0.8rem',
                        color: T.textFaint,
                        fontWeight: 600,
                        fontFamily: "'Nunito', sans-serif",
                      }}
                    >
                      {displayDate}
                    </p>
                    {activePuzzle?.author && (
                      <div className="flex items-center gap-1.5 mt-1 opacity-80">
                        <span style={{ fontSize: '0.7rem', color: T.textMuted, fontWeight: 700 }}>
                          BY
                        </span>
                        {activePuzzle.authorProfile ? (
                          <div className="flex items-center gap-2">
                            {activePuzzle.authorProfile.avatar_url && (
                              <img
                                src={activePuzzle.authorProfile.avatar_url}
                                alt={activePuzzle.authorProfile.name}
                                className="w-5 h-5 rounded-full border border-[#7C3AED] shadow-sm"
                              />
                            )}
                            <a
                              href={
                                activePuzzle.authorProfile.social_link?.startsWith('http')
                                  ? activePuzzle.authorProfile.social_link
                                  : activePuzzle.authorProfile.social_link
                                    ? `https://${activePuzzle.authorProfile.social_link}`
                                    : '#'
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 hover:underline"
                              style={{
                                fontSize: '0.75rem',
                                color: T.brand,
                                fontWeight: 800,
                              }}
                            >
                              {activePuzzle.authorProfile.name.toUpperCase()}
                              {activePuzzle.authorProfile.social_link && <ExternalLink size={10} />}
                            </a>
                          </div>
                        ) : activePuzzle.authorSocial ? (
                          <a
                            href={
                              activePuzzle.authorSocial.startsWith('http')
                                ? activePuzzle.authorSocial
                                : `https://${activePuzzle.authorSocial}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:underline"
                            style={{
                              fontSize: '0.75rem',
                              color: T.brand,
                              fontWeight: 800,
                            }}
                          >
                            {activePuzzle.author.toUpperCase()}
                            <ExternalLink size={10} />
                          </a>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              color: T.textSub,
                              fontWeight: 800,
                            }}
                          >
                            {activePuzzle.author.toUpperCase()}
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Timer */}
                <div
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 border"
                  style={{ background: T.streakBg, borderColor: T.streakBorder }}
                >
                  <Timer size={13} style={{ color: T.streakText }} />
                  <span style={{ fontSize: '0.85rem', color: T.streakText }}>
                    <SolveTimer startTime={startTime} stopped={isCorrect} />
                  </span>
                </div>
              </div>
            </div>

            {/* Mascot + Clue */}
            <div className="flex flex-col items-center gap-4">
              <Mascot
                mood={getMood()}
                size={90}
                speechBubble={getMascotComment()}
                bubbleDirection="right"
                animate
              />

              <div
                className={`w-full rounded-2xl p-5 text-center ${loading ? 'animate-pulse' : ''}`}
                style={{ background: T.clueBg, border: `2px solid ${T.clueAreaBorder}` }}
              >
                {loading ? (
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className="h-5 w-full max-w-[400px] rounded-md"
                      style={{ background: isDark ? '#26242F' : '#EDE9FE' }}
                    />
                    <div
                      className="h-5 w-3/4 max-w-[300px] rounded-md"
                      style={{ background: isDark ? '#26242F' : '#EDE9FE' }}
                    />
                  </div>
                ) : (
                  <p
                    style={{
                      fontFamily: "'Nunito', sans-serif",
                      fontWeight: 800,
                      fontSize: 'clamp(1rem, 3vw, 1.2rem)',
                      color: T.text,
                      lineHeight: 1.7,
                    }}
                  >
                    "{activePuzzle?.clue}"
                  </p>
                )}
              </div>

              {/* Clue feedback */}
              <ClueReactionWidget
                puzzleNumber={activePuzzle?.number || 0}
                userId={user?.id}
                puzzleId={puzzleId}
                isDark={isDark}
              />

              {/* Answer boxes */}
              <div className="flex gap-2">
                {loading ? (
                  <div className="flex gap-2 animate-pulse">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className="w-11 h-11 rounded-xl border-2"
                        style={{
                          borderColor: T.inputBorder,
                          background: isDark ? '#1C1B24' : '#FAFAFA',
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  activePuzzle &&
                  [...Array(activePuzzle.letterCount)].map((_, i) => {
                    const char = answer[i];
                    return (
                      <m.div
                        key={i}
                        animate={char ? { scale: [1, 1.15, 1] } : {}}
                        transition={{ duration: 0.15 }}
                        className="w-11 h-11 rounded-xl border-2 flex items-center justify-center"
                        style={{
                          borderColor: char ? '#7C3AED' : T.inputBorder,
                          background: char
                            ? isDark
                              ? '#26242F'
                              : '#F5F0FF'
                            : isDark
                              ? '#1C1B24'
                              : '#FAFAFA',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "'Outfit', sans-serif",
                            color: '#5B21B6',
                            fontSize: '1.2rem',
                          }}
                        >
                          {char?.toUpperCase() || ''}
                        </span>
                      </m.div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Wrong attempt feedback */}
          <AnimatePresence>
            {wrongAttempt && (
              <WrongFeedback
                attempt={wrongAttempt}
                onDismiss={() => setWrongAttempt(null)}
                isDark={isDark}
              />
            )}
          </AnimatePresence>

          {/* Input + Buttons */}
          <div
            className="rounded-3xl p-5 shadow-lg border-2"
            style={{
              background: T.cardBg,
              borderColor: '#7C3AED',
              boxShadow: isDark
                ? '0 10px 30px -10px rgba(124,58,237,0.3)'
                : '0 10px 30px -10px rgba(124,58,237,0.2)',
            }}
          >
            <div className="flex gap-2 mb-3">
              <input
                ref={inputRef}
                type="text"
                disabled={loading}
                maxLength={activePuzzle?.letterCount || 0}
                value={answer}
                onChange={e => setAnswer(e.target.value.replace(/[^a-zA-Z]/g, ''))}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder={loading ? 'Loading…' : 'Your answer'}
                aria-label={`Your answer${activePuzzle ? `, ${activePuzzle.letterCount} letters` : ''}`}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                className="flex-1 py-3 sm:py-4 px-3 sm:px-4 rounded-2xl border-2 focus:outline-none transition-all min-w-0"
                style={{
                  borderColor: T.inputBorder,
                  fontFamily: "'Outfit', sans-serif",
                  // 16px minimum prevents iOS Safari from zooming on input focus
                  fontSize: '1rem',
                  color: T.text,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  background: isDark ? '#1C1B24' : '#FAFAFA',
                  textTransform: 'uppercase',
                  textAlign: 'left',
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#7C3AED';
                  e.target.style.boxShadow = '0 0 0 4px rgba(124,58,237,0.15)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = T.inputBorder;
                  e.target.style.boxShadow = 'none';
                }}
              />
              <m.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSubmit}
                disabled={loading || answer.length !== (activePuzzle?.letterCount || 0)}
                aria-label="Submit answer"
                className="px-3 sm:px-6 py-3 rounded-2xl flex items-center gap-2 transition-all disabled:opacity-40 shadow-md shrink-0"
                style={{
                  background:
                    !loading && answer.length === activePuzzle?.letterCount
                      ? 'linear-gradient(135deg, #7C3AED, #5B21B6)'
                      : isDark
                        ? '#26242F'
                        : '#E5E7EB',
                  color:
                    !loading && answer.length === activePuzzle?.letterCount
                      ? 'white'
                      : isDark
                        ? '#4A4560'
                        : '#9CA3AF',
                  fontFamily: "'Nunito', sans-serif",
                  fontWeight: 800,
                }}
              >
                <Send size={18} />
                <span className="hidden sm:inline">Submit</span>
              </m.button>
            </div>

            <m.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleHint}
              disabled={loading || hintsUnlocked >= (activePuzzle?.hints.length || 0)}
              className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 border-2 transition-all disabled:opacity-40"
              style={{
                borderColor: isDark ? '#92400E' : '#FED7AA',
                background: T.fodderBg,
                color: '#C2410C',
                fontFamily: "'Nunito', sans-serif",
                fontWeight: 800,
              }}
            >
              <Lightbulb size={16} />
              {loading
                ? 'Fetching hints…'
                : hintsUnlocked >= (activePuzzle?.hints.length || 0)
                  ? 'No more hints!'
                  : `Get Hint ${hintsUnlocked + 1} of ${activePuzzle?.hints.length}`}
              {!loading &&
                activePuzzle &&
                hintsUnlocked > 0 &&
                hintsUnlocked < activePuzzle.hints.length && (
                  <span className="ml-1 flex gap-1">
                    {[...Array(activePuzzle.hints.length)].map((_, i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background:
                            i < hintsUnlocked ? '#F97316' : isDark ? '#92400E' : '#FED7AA',
                        }}
                      />
                    ))}
                  </span>
                )}
            </m.button>

            {/* Reveal Button — only after all hints are used */}
            {!loading && activePuzzle && hintsUnlocked >= activePuzzle.hints.length && (
              <m.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleReveal}
                className="w-full py-3 mt-3 rounded-2xl flex items-center justify-center gap-2 border-2 transition-all"
                style={{
                  borderColor: T.inputBorder,
                  background: isDark ? '#1C1B24' : '#F9FAFB',
                  color: isDark ? '#A78BFA' : '#6B7280',
                  fontFamily: "'Nunito', sans-serif",
                  fontWeight: 800,
                }}
              >
                <RotateCcw size={16} />
                I'm stuck, reveal the answer
              </m.button>
            )}
          </div>

          {/* Hints */}
          <AnimatePresence>
            {visibleHints.length > 0 && (
              <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: '1rem',
                      color: T.heading,
                    }}
                  >
                    💡 Hints Unlocked ({hintsUnlocked}/{activePuzzle?.hints.length})
                  </h3>
                  {visibleHints.length > 1 && (
                    <button
                      onClick={() => setShowAllHints(!showAllHints)}
                      className="text-xs font-bold text-[#7C3AED] flex items-center gap-1"
                      style={{ fontFamily: "'Nunito', sans-serif" }}
                    >
                      {showAllHints ? 'Collapse' : 'Show all'}
                      <m.span
                        animate={{ rotate: showAllHints ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex"
                      >
                        <ChevronDown size={14} />
                      </m.span>
                    </button>
                  )}
                </div>

                {(showAllHints ? visibleHints : visibleHints.slice(-1)).map(hint => (
                  <HintCard
                    key={hint.id}
                    hint={hint}
                    index={visibleHints.indexOf(hint)}
                    isNew={newHintIndex !== null && hint.id === newHintIndex + 1}
                    isDark={isDark}
                  />
                ))}
              </m.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        activePuzzle && (
          <SuccessState
            hintsUsed={hintsUnlocked}
            wrongAttemptsCount={wrongAttemptsCount}
            solveTime={solveTime}
            puzzleId={puzzleId}
            onReset={handleReset}
            isDark={isDark}
            activePuzzle={activePuzzle}
            wasRevealed={wasRevealed}
            archive={isArchive}
          />
        )
      )}
    </div>
  );
}
