import { useState, useEffect, useRef } from 'react';
import { m } from 'motion/react';
import {
  ArrowRight,
  CalendarDays,
  Check,
  Copy,
  ExternalLink,
  RotateCcw,
  Share2,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router';
import { nextUnfinished } from '../../games/progress';
import { archivePath } from '../../games/archive';
import confetti from 'canvas-confetti';
import { Mascot } from '../../components/Mascot';
import { buildGameShare } from '../../games/share';
import { getGame } from '../../games/registry';
import { getTheme } from '../../theme';
import { useStreak, getXPForSolve, getLevelTitle } from '../../hooks/useStreak';
import { useAuth } from '../../context/AuthContext';
import { DayComplete } from '../../games/DayComplete';
import { ClueReactionWidget } from './ClueReactionWidget';
import { NextPuzzleCountdown } from './Timers';
import { PART_STYLES } from './types';
import { shareOrCopy, shareBlocks, formatSolveTime, funCallout } from './shareResult';
import type { ActivePuzzle } from './ActivePuzzle';
// ─── SUCCESS STATE ────────────────────────────────────────────────────────────

export function SuccessState({
  hintsUsed,
  wrongAttemptsCount,
  solveTime,
  puzzleId,
  onReset,
  isDark,
  activePuzzle,
  wasRevealed,
  archive = false,
}: {
  hintsUsed: number;
  wrongAttemptsCount: number;
  solveTime: number;
  puzzleId?: string;
  onReset: () => void;
  isDark: boolean;
  activePuzzle: ActivePuzzle;
  wasRevealed: boolean;
  /** A past clue from the archive: celebrated, but no streak or XP. */
  archive?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState(false);
  const runConfetti = useRef(false);
  const T = getTheme(isDark);
  const next = archive ? null : nextUnfinished('cryptic');
  const { count: streak, totalSolved, xp, level, recordSolve } = useStreak();
  const { user } = useAuth();
  // The built-in fallback clue has no database row, so its "solve" can never
  // reach solve_history. Recording it locally would inflate the streak and XP
  // that the server copy will never agree with, and the two silently diverge
  // for good. Treat it as practice: the celebration still plays, the score
  // does not move.
  const isPractice = Boolean(activePuzzle.isFallback);
  const countsTowardProgress = !wasRevealed && !isPractice && !archive;
  const xpEarned = countsTowardProgress ? getXPForSolve(hintsUsed) : 0;
  const [finalData, setFinalData] = useState<{
    streak: number;
    total: number;
    xp: number;
    level: number;
  } | null>(null);

  useEffect(() => {
    if (!runConfetti.current) {
      runConfetti.current = true;

      if (!countsTowardProgress) {
        // Revealed the answer, solved the offline fallback clue, or an archive clue.
        setFinalData({ streak, total: totalSolved, xp, level });
      }
      if (archive && !wasRevealed) {
        // A real solve, just not today's: it still gets its confetti.
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 } });
      } else if (countsTowardProgress) {
        // Record the solve — passes wrongAttemptsCount, puzzleId, and solveTime for Supabase
        const result = recordSolve(
          hintsUsed,
          activePuzzle.number,
          user?.id,
          puzzleId,
          wrongAttemptsCount,
          solveTime || undefined
        );
        if (result) {
          setFinalData({
            streak: result.count,
            total: result.totalSolved,
            xp: result.xp,
            level: result.level,
          });
        }

        // Confetti only for genuine solves
        const end = Date.now() + 2800;
        const colors = ['#7C3AED', '#F97316', '#34D399', '#38BDF8', '#FCD34D', '#F472B6'];
        const frame = () => {
          confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
          confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
          if (Date.now() < end) requestAnimationFrame(frame);
        };
        frame();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayData = finalData || { streak, total: totalSolved, xp, level };

  // Display values derived from the same helpers the share text uses, so the
  // card the solver sees and the text they paste can never disagree.
  const today = (
    activePuzzle.date ? new Date(`${activePuzzle.date}T12:00:00`) : new Date()
  ).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const solveTimeStr = formatSolveTime(solveTime);
  const blocks = shareBlocks(hintsUsed, wasRevealed);
  const callout = funCallout({ hintsUsed, wasRevealed });

  // The same message as every other game's share, so the cryptic one reads
  // like its siblings in a group chat.
  const puzzleDay = activePuzzle.date ? new Date(`${activePuzzle.date}T12:00:00`) : new Date();
  const shareText = buildGameShare(
    getGame('cryptic'),
    { seconds: solveTime, outcome: wasRevealed ? 'revealed' : 'solved', hints: hintsUsed },
    { date: puzzleDay, streak: isPractice || archive ? 0 : displayData.streak }
  );

  const handleShare = async () => {
    const outcome = await shareOrCopy(shareText);
    if (outcome === 'copied') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } else if (outcome === 'failed') {
      // Say so rather than implying it worked — nothing reached the clipboard.
      setShareError(true);
      setTimeout(() => setShareError(false), 2500);
    }
  };

  const levelTitle = getLevelTitle(displayData.level);

  return (
    <m.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className="space-y-5"
    >
      {/* ── 0. SUCCESS HEADER ── */}
      <div className="text-center py-6">
        <div className="flex justify-center mb-4">
          <Mascot
            mood={wasRevealed ? 'hint' : 'celebrating'}
            size={120}
            speechBubble={wasRevealed ? 'So close! 🤏 Try again tomorrow!' : 'Brilliant solve! 🎉'}
            bubbleDirection="right"
            animate
          />
        </div>
        <m.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
        >
          <h2
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '2.2rem',
              color: wasRevealed ? '#D97706' : '#7C3AED',
              marginBottom: 4,
            }}
          >
            {wasRevealed ? 'Almost there! 🤏' : 'You got it! 🎊'}
          </h2>
          <p
            style={{
              color: isDark ? '#A78BFA' : '#6B7280',
              fontWeight: 600,
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            {wasRevealed
              ? "You peeked at the answer — cryptics are tricky! Give tomorrow's a go 💪"
              : hintsUsed === 0
                ? "No hints needed — you're a natural!"
                : hintsUsed === 1
                  ? 'Solved with just 1 hint. Impressive!'
                  : `Solved with ${hintsUsed} hints. Great effort!`}
          </p>
        </m.div>
      </div>

      {/* ── 1. SHARE CARD ── shown immediately after the header ── */}
      <m.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="rounded-3xl overflow-hidden shadow-lg border-2"
        style={{ borderColor: T.brandBorder }}
      >
        {/* Gradient header strip */}
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)' }}
        >
          <div className="flex items-center gap-2">
            <span
              style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.3rem', color: 'white' }}
            >
              🦉
            </span>
            <div>
              <p
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '1rem',
                  color: 'white',
                  margin: 0,
                }}
              >
                TheCrypticOwl
              </p>
              <p
                style={{
                  fontSize: '0.72rem',
                  color: 'rgba(255,255,255,0.7)',
                  fontFamily: "'Nunito', sans-serif",
                  margin: 0,
                }}
              >
                {isPractice ? 'Practice clue' : 'British Style Cryptics'} · {today}
              </p>
            </div>
          </div>
          <Share2 size={18} style={{ color: 'rgba(255,255,255,0.8)' }} />
        </div>

        <div className="p-5" style={{ background: T.cardBg }}>
          {/* Hint slot grid — each column = one hint, labelled */}
          <div className="mb-4">
            {/* Column labels */}
            <div className="flex justify-center gap-3 mb-1">
              {[1, 2, 3, 4].map(n => (
                <div
                  key={n}
                  style={{
                    width: 44,
                    textAlign: 'center',
                    fontSize: '0.65rem',
                    fontFamily: "'Nunito', sans-serif",
                    fontWeight: 700,
                    color: T.textFaint,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Hint {n}
                </div>
              ))}
            </div>
            {/* Emoji squares */}
            <div className="flex justify-center gap-3 mb-1">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  style={{
                    width: 44,
                    textAlign: 'center',
                    fontSize: '1.9rem',
                    lineHeight: 1,
                  }}
                >
                  {blocks[i]}
                </div>
              ))}
            </div>
            {/* Per-column used/skipped labels */}
            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  style={{
                    width: 44,
                    textAlign: 'center',
                    fontSize: '0.6rem',
                    fontFamily: "'Nunito', sans-serif",
                    fontWeight: 700,
                    color: i < hintsUsed ? (i < 2 ? '#D97706' : '#DC2626') : '#059669',
                  }}
                >
                  {i < hintsUsed ? 'used' : 'skip'}
                </div>
              ))}
            </div>
          </div>

          {/* Explicit count + time */}
          <div
            className="rounded-2xl px-4 py-3 mb-4 text-center"
            style={{
              background: isDark ? '#26242F' : '#F9F7FF',
              border: `1.5px solid ${isDark ? '#4A4560' : '#EDE9FE'}`,
            }}
          >
            <p
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: '1.1rem',
                color: hintsUsed === 0 ? '#059669' : hintsUsed <= 2 ? '#D97706' : '#DC2626',
                marginBottom: 2,
              }}
            >
              {hintsUsed === 0
                ? '✨ No hints used — pure genius!'
                : `💡 ${hintsUsed} of 4 hints used`}
            </p>
            <p
              style={{
                fontSize: '0.8rem',
                color: T.textMuted,
                fontFamily: "'Nunito', sans-serif",
                fontWeight: 600,
              }}
            >
              ⏱️ {solveTimeStr}
              {!isPractice && <>&nbsp;·&nbsp; 🔥 {displayData.streak}-day streak</>}
            </p>
          </div>

          {/* Callout preview */}
          <div
            className="rounded-2xl px-4 py-3 mb-4 text-center"
            style={{
              background: isDark ? '#121118' : '#F5F0FF',
              border: `1.5px dashed ${T.brandBorder}`,
            }}
          >
            <p
              style={{
                fontFamily: "'Nunito', sans-serif",
                fontWeight: 700,
                fontSize: '0.9rem',
                color: T.textSub,
                lineHeight: 1.55,
                marginBottom: 5,
              }}
            >
              "{callout}"
            </p>
            <div className="flex items-center justify-center gap-1">
              <ExternalLink size={11} style={{ color: '#7C3AED' }} />
              <span
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '0.82rem',
                  color: '#7C3AED',
                }}
              >
                thecrypticowl.com
              </span>
            </div>
          </div>

          {/* Share / Copy button */}
          <m.button
            onClick={handleShare}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all"
            style={{
              background: shareError
                ? 'linear-gradient(135deg, #DC2626, #B91C1C)'
                : copied
                  ? 'linear-gradient(135deg, #059669, #047857)'
                  : 'linear-gradient(135deg, #7C3AED, #5B21B6)',
              color: 'white',
              fontFamily: "'Nunito', sans-serif",
              fontWeight: 800,
              fontSize: '0.95rem',
              boxShadow: shareError
                ? '0 4px 14px rgba(220,38,38,0.35)'
                : copied
                  ? '0 4px 14px rgba(5,150,105,0.35)'
                  : '0 4px 14px rgba(124,58,237,0.35)',
            }}
            aria-live="polite"
          >
            {shareError ? (
              <>Couldn't copy — select and copy manually</>
            ) : copied ? (
              <>
                <Check size={17} /> Copied to clipboard!
              </>
            ) : typeof navigator.share === 'function' ? (
              <>
                <Share2 size={17} /> Share my result
              </>
            ) : (
              <>
                <Copy size={17} /> Copy &amp; share result
              </>
            )}
          </m.button>
        </div>
      </m.div>

      {/* ── 2. XP + STATS ── */}
      <m.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.45, type: 'spring', stiffness: 400 }}
        className="rounded-3xl p-5 border-2 text-center"
        style={{
          background: wasRevealed
            ? isDark
              ? '#2A1A00'
              : '#FFFBEB'
            : isDark
              ? '#1D1B26'
              : '#F5F0FF',
          borderColor: wasRevealed
            ? isDark
              ? '#92400E'
              : '#FDE68A'
            : isDark
              ? '#4A4560'
              : '#C4B5FD',
        }}
      >
        {!countsTowardProgress ? (
          <>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.5rem', color: '#D97706' }}>
              {wasRevealed
                ? 'No XP this time 🙈'
                : archive
                  ? 'Archive clue 📅'
                  : 'Practice clue 🎯'}
            </p>
            <p
              style={{
                fontSize: '0.82rem',
                color: isDark ? '#FDE68A' : '#92400E',
                fontWeight: 600,
                marginTop: 4,
              }}
            >
              {wasRevealed
                ? 'XP is only earned when you solve without peeking — come back tomorrow!'
                : archive
                  ? 'Nicely cracked! Archive clues are for fun: they don’t count toward your streak or XP.'
                  : "We couldn't reach today's puzzle, so this one stood in. It counts as today's play, but earns no XP."}
            </p>
          </>
        ) : (
          <>
            <m.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 0.5, delay: 0.6 }}>
              <span
                style={{ fontFamily: "'Outfit', sans-serif", fontSize: '2rem', color: '#7C3AED' }}
              >
                +{xpEarned} XP
              </span>
            </m.div>
            <p
              style={{
                fontSize: '0.85rem',
                color: T.brandStrong,
                fontWeight: 700,
                marginTop: 2,
              }}
            >
              <Zap size={13} className="inline mr-1" />
              {hintsUsed === 0
                ? 'Perfect solve bonus!'
                : `${hintsUsed} hint${hintsUsed > 1 ? 's' : ''} used`}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { emoji: '🔥', value: displayData.streak, label: 'Streak' },
                { emoji: '🧩', value: displayData.total, label: 'Total Solved' },
                { emoji: '⚡', value: `${displayData.xp} XP`, label: levelTitle.split(' ')[0] },
              ].map((s, i) => (
                <div key={i}>
                  <p
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: '1.2rem',
                      color: '#7C3AED',
                    }}
                  >
                    {s.emoji} {s.value}
                  </p>
                  <p
                    style={{
                      fontSize: '0.72rem',
                      color: T.faintText,
                      fontWeight: 600,
                    }}
                  >
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </m.div>

      {/* ── 3. ANSWER + FULL BREAKDOWN ── */}
      <div
        className="rounded-3xl p-6 border shadow-md"
        style={{ background: T.cardBg, borderColor: T.cardBorder }}
      >
        <p
          style={{
            fontSize: '0.78rem',
            color: T.textFaint,
            fontWeight: 700,
            marginBottom: 12,
            textTransform: 'uppercase',
            fontFamily: "'Nunito', sans-serif",
          }}
        >
          The Answer
        </p>
        <div className="flex gap-2 justify-center mb-4">
          {activePuzzle.answer.split('').map((l, i) => (
            <m.div
              key={i}
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1 + i * 0.08, type: 'spring', stiffness: 400 }}
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
                color: 'white',
                fontFamily: "'Outfit', sans-serif",
                fontSize: '1.4rem',
              }}
            >
              {l}
            </m.div>
          ))}
        </div>

        <div className="mt-5">
          <p
            style={{
              fontSize: '0.78rem',
              color: T.textFaint,
              fontWeight: 700,
              marginBottom: 10,
              textTransform: 'uppercase',
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            Full Breakdown
          </p>
          <div
            className="rounded-2xl p-4 mb-4 text-center"
            style={{
              background: isDark ? '#26242F' : '#F9F7FF',
              border: `2px dashed ${T.brandBorder}`,
            }}
          >
            <p
              style={{
                fontFamily: "'Nunito', sans-serif",
                fontWeight: 700,
                fontSize: '1rem',
                color: T.text,
                lineHeight: 1.9,
              }}
            >
              {activePuzzle.clueParts.map((part, i) =>
                part.type ? (
                  <span
                    key={i}
                    style={{
                      background: isDark
                        ? PART_STYLES[part.type].bgDark
                        : PART_STYLES[part.type].bg,
                      color: PART_STYLES[part.type].color,
                      border: `2px solid ${PART_STYLES[part.type].border}`,
                      borderRadius: 8,
                      padding: '2px 7px',
                      marginInline: 2,
                      display: 'inline-block',
                    }}
                  >
                    {part.text}
                  </span>
                ) : (
                  <span key={i}>{part.text}</span>
                )
              )}
            </p>
          </div>

          <div className="space-y-2">
            {activePuzzle.clueParts
              .filter(part => part.type && PART_STYLES[part.type])
              .map((part, i) => {
                const style = PART_STYLES[part.type!];
                return (
                  <m.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="flex items-center gap-3 rounded-xl p-3"
                    style={{
                      background: isDark ? style.bgDark : style.bg,
                      border: `1.5px solid ${style.border}`,
                    }}
                  >
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-bold flex-shrink-0"
                      style={{
                        background: style.border,
                        color: 'white',
                        fontFamily: "'Nunito', sans-serif",
                      }}
                    >
                      {style.label}
                    </span>
                    <span
                      style={{
                        fontSize: '0.85rem',
                        color: style.color,
                        fontFamily: "'Nunito', sans-serif",
                        fontWeight: 600,
                      }}
                    >
                      {part.text}
                    </span>
                  </m.div>
                );
              })}
            <m.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + activePuzzle.clueParts.filter(p => p.type).length * 0.1 }}
              className="flex items-center gap-3 rounded-xl p-3"
              style={{
                background: isDark ? PART_STYLES.wordplay.bgDark : PART_STYLES.wordplay.bg,
                border: `1.5px solid ${PART_STYLES.wordplay.border}`,
              }}
            >
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-bold flex-shrink-0"
                style={{
                  background: PART_STYLES.wordplay.border,
                  color: 'white',
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                Answer
              </span>
              <span
                style={{
                  fontSize: '0.85rem',
                  color: PART_STYLES.wordplay.color,
                  fontFamily: "'Nunito', sans-serif",
                  fontWeight: 600,
                }}
              >
                {activePuzzle.answer} ✓
              </span>
            </m.div>
          </div>
        </div>
      </div>

      {/* Clue feedback — card variant in success state */}
      <ClueReactionWidget
        puzzleNumber={activePuzzle.number}
        userId={user?.id}
        puzzleId={puzzleId}
        isDark={isDark}
        variant="card"
      />

      {/* On to the next puzzle, as every other game's result card offers */}
      {archive ? (
        <Link
          to={archivePath('cryptic')}
          className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl font-extrabold no-underline"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', color: '#FFFFFF' }}
        >
          <CalendarDays size={16} /> More from the archive
        </Link>
      ) : next ? (
        <Link
          to={next.path}
          className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl font-extrabold no-underline"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', color: '#FFFFFF' }}
        >
          Next: {next.name} <ArrowRight size={16} />
        </Link>
      ) : null}

      {/* Next puzzle countdown */}
      <NextPuzzleCountdown isDark={isDark} />

      <button
        onClick={onReset}
        className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 border-2 transition-colors"
        style={{
          borderColor: isDark ? '#393547' : '#EDE9FE',
          background: 'transparent',
          color: '#7C3AED',
          fontFamily: "'Nunito', sans-serif",
          fontWeight: 700,
        }}
      >
        <RotateCcw size={16} /> Practice Again
      </button>
      {!isPractice && (
        <div className="mt-6">
          <DayComplete />
        </div>
      )}
    </m.div>
  );
}
