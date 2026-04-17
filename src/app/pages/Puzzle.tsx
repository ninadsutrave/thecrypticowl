import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mascot, MascotMood } from '../components/Mascot';
import {
  Lightbulb,
  Send,
  RotateCcw,
  Copy,
  Check,
  ChevronDown,
  Share2,
  Timer,
  Zap,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Trophy,
} from 'lucide-react';
import { useParams } from 'react-router';
import { useClueReaction } from '../hooks/useClueReaction';
import confetti from 'canvas-confetti';
import { useDarkMode } from '../context/DarkModeContext';
import { getTheme } from '../theme';
import { useStreak, getXPForSolve, getLevelTitle, hasSolvedToday } from '../hooks/useStreak';
import { useAuth } from '../context/AuthContext';
import {
  fetchPuzzleByDate,
  fetchPuzzleByNumber,
  type DbDailyPuzzle,
  type PuzzleHint,
  type ClueWordplayType,
} from '../../lib/supabase';

// ─── ACHIEVEMENTS ─────────────────────────────────────────────────────────────

function Achievements({ isDark }: { isDark: boolean }) {
  const T = getTheme(isDark);
  const { count, bestStreak } = useStreak();

  const milestones = [
    { label: 'First solve!', target: 1, emoji: '🎉', achieved: bestStreak >= 1 },
    { label: '3-day streak', target: 3, emoji: '🔥', achieved: count >= 3 || bestStreak >= 3 },
    { label: '7-day streak', target: 7, emoji: '🏅', achieved: count >= 7 || bestStreak >= 7 },
    { label: '30-day streak', target: 30, emoji: '🏆', achieved: count >= 30 || bestStreak >= 30 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="max-w-2xl mx-auto px-4 pb-4"
    >
      <div
        className="rounded-3xl p-6 border shadow-sm"
        style={{ background: T.cardBg, borderColor: T.cardBorder }}
      >
        <div className="flex items-center gap-3 mb-5">
          <Trophy size={22} style={{ color: '#D97706' }} />
          <h3
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: '1.2rem',
              color: isDark ? '#C4B5FD' : '#1E1B4B',
            }}
          >
            Your Achievements
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {milestones.map((m, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.05 }}
              className="text-center rounded-2xl p-3 border-2 transition-all"
              style={{
                background: m.achieved
                  ? isDark
                    ? '#1A0F35'
                    : '#F5F0FF'
                  : isDark
                    ? '#1A1035'
                    : '#F9F9F9',
                borderColor: m.achieved ? '#7C3AED' : isDark ? '#3D2A6B' : '#E5E7EB',
                opacity: m.achieved ? 1 : 0.6,
              }}
            >
              <div
                className="text-2xl mb-1"
                style={{ filter: m.achieved ? 'none' : 'grayscale(100%)' }}
              >
                {m.emoji}
              </div>
              <p
                style={{
                  fontSize: '0.75rem',
                  color: m.achieved ? '#7C3AED' : T.textMuted,
                  fontWeight: 700,
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                {m.label}
              </p>
              {m.achieved && (
                <div
                  className="mt-1.5 rounded-full px-2 py-0.5"
                  style={{ background: '#7C3AED', display: 'inline-block' }}
                >
                  <span style={{ fontSize: '0.65rem', color: 'white', fontWeight: 700 }}>
                    EARNED
                  </span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
        <p
          className="mt-4 text-center"
          style={{ fontSize: '0.8rem', color: T.textMuted, fontWeight: 600 }}
        >
          Solve daily puzzles to unlock achievements 🦉
        </p>
      </div>
    </motion.div>
  );
}

// ─── PUZZLE DATA ──────────────────────────────────────────────────────────────

const PUZZLE = {
  number: 42,
  clue: 'Pears mixed up to form a weapon (5)',
  answer: 'SPEAR',
  letterCount: 5,
  hints: [
    {
      id: 1,
      title: 'Definition Location',
      text: 'The definition is at the end of the clue.',
      highlight: 'a weapon',
      mascotComment:
        'The definition is always at the start or end of a cryptic clue. Look at the end! 👀',
      color: '#3B82F6',
      bg: '#EFF6FF',
      bgDark: '#0D1F35',
      border: '#93C5FD',
    },
    {
      id: 2,
      title: 'Spot the Indicator',
      text: '"Mixed up" is an anagram indicator! That means some letters need to be rearranged.',
      highlight: 'mixed up',
      mascotComment: '"Mixed up" signals an anagram — letters are getting scrambled! 🔀',
      color: '#7C3AED',
      bg: '#F5F3FF',
      bgDark: '#1A0F35',
      border: '#C4B5FD',
    },
    {
      id: 3,
      title: 'Find the Fodder',
      text: '"PEARS" is the fodder — these are the letters you need to rearrange!',
      highlight: 'Pears',
      mascotComment: 'P-E-A-R-S... these are your building blocks! Try shuffling them around! ✨',
      color: '#F97316',
      bg: '#FFF7ED',
      bgDark: '#2A1505',
      border: '#FED7AA',
    },
    {
      id: 4,
      title: 'Full Breakdown',
      text: 'Rearrange the letters of PEARS to get a 5-letter weapon. Think of a long pointed weapon used by knights...',
      highlight: null,
      mascotComment: "You've got all the pieces! P-E-A-R-S → _ _ _ _ _ 🎯",
      color: '#059669',
      bg: '#ECFDF5',
      bgDark: '#062010',
      border: '#6EE7B7',
    },
  ],
};

const CLUE_PARTS = [
  { text: 'Pears', type: 'fodder' },
  { text: ' mixed up ', type: 'indicator' },
  { text: 'to form ', type: null },
  { text: 'a weapon', type: 'definition' },
  { text: ' (5)', type: null },
];

const PART_STYLES: Record<
  string,
  { bg: string; bgDark: string; color: string; border: string; label: string }
> = {
  definition: {
    bg: '#EFF6FF',
    bgDark: '#0D1F35',
    color: '#1D4ED8',
    border: '#3B82F6',
    label: 'Definition',
  },
  indicator: {
    bg: '#F5F3FF',
    bgDark: '#1A0F35',
    color: '#5B21B6',
    border: '#7C3AED',
    label: 'Indicator',
  },
  fodder: {
    bg: '#FFF7ED',
    bgDark: '#2A1505',
    color: '#C2410C',
    border: '#F97316',
    label: 'Fodder',
  },
  wordplay: {
    bg: '#ECFDF5',
    bgDark: '#062010',
    color: '#065F46',
    border: '#10B981',
    label: 'Wordplay',
  },
};

// ─── CLUE REACTION ────────────────────────────────────────────────────────────

function ClueReactionWidget({
  puzzleNumber,
  userId,
  puzzleId,
  isDark,
  variant = 'inline',
}: {
  puzzleNumber: number;
  userId?: string;
  puzzleId?: string;
  isDark: boolean;
  variant?: 'inline' | 'card';
}) {
  const T = getTheme(isDark);
  const { reaction, vote } = useClueReaction(puzzleNumber, userId, puzzleId);
  const [flash, setFlash] = useState<'like' | 'dislike' | null>(null);

  const handleVote = (r: 'like' | 'dislike') => {
    const isDeselect = reaction === r;
    vote(r);
    if (!isDeselect) {
      setFlash(r);
      setTimeout(() => setFlash(null), 1800);
    }
  };

  const likeActive = reaction === 'like';
  const dislikeActive = reaction === 'dislike';

  const buttons = (
    <div className="flex items-center gap-2">
      {/* 👍 */}
      <motion.button
        onClick={() => handleVote('like')}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.88 }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors"
        style={{
          background: likeActive ? (isDark ? '#062010' : '#ECFDF5') : 'transparent',
          borderColor: likeActive ? '#10B981' : isDark ? '#3D2A6B' : '#E0E7FF',
          color: likeActive ? '#10B981' : T.textMuted,
        }}
        aria-label="Like this clue"
        aria-pressed={likeActive}
      >
        <ThumbsUp size={14} />
      </motion.button>

      {/* 👎 */}
      <motion.button
        onClick={() => handleVote('dislike')}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.88 }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors"
        style={{
          background: dislikeActive ? (isDark ? '#2A0F15' : '#FFF1F2') : 'transparent',
          borderColor: dislikeActive ? '#EF4444' : isDark ? '#3D2A6B' : '#E0E7FF',
          color: dislikeActive ? '#EF4444' : T.textMuted,
        }}
        aria-label="Dislike this clue"
        aria-pressed={dislikeActive}
      >
        <ThumbsDown size={14} />
      </motion.button>

      {/* Thank-you flash */}
      <AnimatePresence>
        {flash && (
          <motion.span
            key="thanks"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: flash === 'like' ? '#10B981' : '#EF4444',
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            {flash === 'like' ? 'Thanks! 🙏' : 'Noted! 📝'}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );

  if (variant === 'card') {
    return (
      <motion.div
        className="rounded-3xl border p-4"
        style={{ background: T.cardBg, borderColor: T.cardBorder }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between">
          <p
            style={{
              fontFamily: "'Nunito', sans-serif",
              fontWeight: 700,
              fontSize: '0.88rem',
              color: T.textMuted,
              margin: 0,
            }}
          >
            How was this clue?
          </p>
          {buttons}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-3">
      <span
        style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: T.textFaint,
          fontFamily: "'Nunito', sans-serif",
        }}
      >
        Rate this clue
      </span>
      {buttons}
    </div>
  );
}

// ─── TIMER ────────────────────────────────────────────────────────────────────

function SolveTimer({ startTime, stopped }: { startTime: number; stopped: boolean }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (stopped || !startTime) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startTime, stopped]);

  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return (
    <span style={{ fontFamily: "'Fredoka One', cursive" }}>
      {m}:{s.toString().padStart(2, '0')}
    </span>
  );
}

// ─── NEXT PUZZLE COUNTDOWN ────────────────────────────────────────────────────

function NextPuzzleCountdown({ isDark }: { isDark: boolean }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="rounded-2xl p-4 text-center border"
      style={{
        background: isDark ? '#1A0F35' : '#F5F0FF',
        borderColor: isDark ? '#3D2A6B' : '#C4B5FD',
      }}
    >
      <p
        style={{
          fontSize: '0.78rem',
          color: isDark ? '#9381CC' : '#6B7280',
          fontWeight: 700,
          marginBottom: 4,
        }}
      >
        NEXT PUZZLE IN
      </p>
      <p
        style={{
          fontFamily: "'Fredoka One', cursive",
          fontSize: '1.8rem',
          color: '#7C3AED',
          letterSpacing: '0.04em',
        }}
      >
        {timeLeft}
      </p>
      <p
        style={{
          fontSize: '0.78rem',
          color: isDark ? '#9381CC' : '#6B7280',
          fontWeight: 600,
          marginTop: 2,
        }}
      >
        Come back tomorrow for #43 🦉
      </p>
    </div>
  );
}

// ─── HINT CARD ────────────────────────────────────────────────────────────────

function HintCard({
  hint,
  index,
  isNew,
  isDark,
}: {
  hint: (typeof PUZZLE.hints)[0];
  index: number;
  isNew: boolean;
  isDark: boolean;
}) {
  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: 20, scale: 0.95 } : { opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="rounded-3xl border-2 overflow-hidden shadow-sm"
      style={{ borderColor: hint.border, background: isDark ? hint.bgDark : hint.bg }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{
              background: hint.color,
              color: 'white',
              fontFamily: "'Fredoka One', cursive",
              fontSize: '0.85rem',
            }}
          >
            {index + 1}
          </div>
          <div className="flex-1">
            <h3
              style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: '1rem',
                color: hint.color,
                marginBottom: 4,
              }}
            >
              Hint {index + 1}: {hint.title}
            </h3>
            <p
              style={{
                fontSize: '0.88rem',
                color: isDark ? '#C4B5FD' : '#374151',
                lineHeight: 1.6,
                fontFamily: "'Nunito', sans-serif",
                fontWeight: 600,
              }}
            >
              {hint.text}
            </p>
          </div>
        </div>
        <div
          className="mt-3 flex items-center gap-2.5 rounded-2xl p-3"
          style={{ background: isDark ? 'rgba(26,16,53,0.8)' : 'rgba(255,255,255,0.7)' }}
        >
          <Mascot mood={index < 2 ? 'hint' : 'thinking'} size={40} animate={false} />
          <p
            style={{
              fontSize: '0.82rem',
              color: isDark ? '#C4B5FD' : '#4C1D95',
              fontFamily: "'Nunito', sans-serif",
              fontWeight: 700,
              lineHeight: 1.5,
            }}
          >
            {hint.mascotComment}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── SUCCESS STATE ────────────────────────────────────────────────────────────

function SuccessState({
  hintsUsed,
  wrongAttemptsCount,
  solveTime,
  puzzleId,
  onReset,
  isDark,
  activePuzzle,
  wasRevealed,
}: {
  hintsUsed: number;
  wrongAttemptsCount: number;
  solveTime: number;
  puzzleId?: string;
  onReset: () => void;
  isDark: boolean;
  activePuzzle: ActivePuzzle;
  wasRevealed: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const runConfetti = useRef(false);
  const T = getTheme(isDark);
  const { count: streak, totalSolved, xp, level, recordSolve } = useStreak();
  const { user } = useAuth();
  const xpEarned = wasRevealed ? 0 : getXPForSolve(hintsUsed);
  const [finalData, setFinalData] = useState<{
    streak: number;
    total: number;
    xp: number;
    level: number;
  } | null>(null);

  useEffect(() => {
    if (!runConfetti.current) {
      runConfetti.current = true;

      if (wasRevealed) {
        // Don't record a solve or award XP when the user peeked at the answer
        setFinalData({ streak, total: totalSolved, xp, level });
      } else {
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

  /** 🟩 = didn't need hint | 🟨 = early hint (1-2) | 🟥 = late hint (3-4) | 🟫 = revealed */
  const getShareEmoji = (slotIndex: number) => {
    if (wasRevealed) return '🟫';
    if (slotIndex >= hintsUsed) return '🟩';
    return slotIndex < 2 ? '🟨' : '🟥';
  };
  const getShareBlocks = () => [...Array(4)].map((_, i) => getShareEmoji(i)).join('');

  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const solveTimeStr =
    solveTime < 60 ? `${solveTime}s` : `${Math.floor(solveTime / 60)}m ${solveTime % 60}s`;

  const getFunCallout = () => {
    if (wasRevealed) return "Today's clue stumped me — can you crack it without peeking? 🫣";
    if (hintsUsed === 0) return "I cracked today's cryptic with zero hints 🧠 Can you?";
    if (hintsUsed === 1) return "Just 1 hint to crack today's cryptic — your turn 👀";
    if (hintsUsed <= 3) return 'Tricky clue, but I got there! Think you can crack it? 🔍';
    return "Today's cryptic nearly had me — reckon you can solve it? 🤯";
  };

  const shareText = wasRevealed
    ? [
        `🦉 TheCrypticOwl #${activePuzzle.number}`,
        ``,
        `🟫🟫🟫🟫  (revealed the answer)`,
        ``,
        getFunCallout(),
        ``,
        `One cryptic clue a day — try it yourself:`,
        `👉 thecrypticowl.com`,
      ].join('\n')
    : [
        `🦉 TheCrypticOwl #${activePuzzle.number}`,
        ``,
        `${getShareBlocks()}  (${hintsUsed}/4 hints used)`,
        `⏱️ ${solveTimeStr}  🔥 ${displayData.streak}-day streak`,
        ``,
        getFunCallout(),
        ``,
        `One cryptic clue a day — try it yourself:`,
        `👉 thecrypticowl.com`,
      ].join('\n');

  const handleShare = async () => {
    const canNativeShare = typeof navigator.share === 'function';
    if (canNativeShare) {
      try {
        await navigator.share({ text: shareText });
        return;
      } catch {
        // fell through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const levelTitle = getLevelTitle(displayData.level);

  return (
    <motion.div
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
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
        >
          <h2
            style={{
              fontFamily: "'Fredoka One', cursive",
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
        </motion.div>
      </div>

      {/* ── 1. SHARE CARD ── shown immediately after the header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="rounded-3xl overflow-hidden shadow-lg border-2"
        style={{ borderColor: isDark ? '#4C3580' : '#C4B5FD' }}
      >
        {/* Gradient header strip */}
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)' }}
        >
          <div className="flex items-center gap-2">
            <span
              style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.3rem', color: 'white' }}
            >
              🦉
            </span>
            <div>
              <p
                style={{
                  fontFamily: "'Fredoka One', cursive",
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
                Puzzle #{activePuzzle.number} · {today}
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
                  {getShareEmoji(i)}
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
              background: isDark ? '#261845' : '#F9F7FF',
              border: `1.5px solid ${isDark ? '#4C3580' : '#EDE9FE'}`,
            }}
          >
            <p
              style={{
                fontFamily: "'Fredoka One', cursive",
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
              ⏱️ {solveTimeStr} &nbsp;·&nbsp; 🔥 {displayData.streak}-day streak
            </p>
          </div>

          {/* Callout preview */}
          <div
            className="rounded-2xl px-4 py-3 mb-4 text-center"
            style={{
              background: isDark ? '#100820' : '#F5F0FF',
              border: `1.5px dashed ${isDark ? '#3D2A6B' : '#C4B5FD'}`,
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
              "{getFunCallout()}"
            </p>
            <div className="flex items-center justify-center gap-1">
              <ExternalLink size={11} style={{ color: '#7C3AED' }} />
              <span
                style={{
                  fontFamily: "'Fredoka One', cursive",
                  fontSize: '0.82rem',
                  color: '#7C3AED',
                }}
              >
                thecrypticowl.com
              </span>
            </div>
          </div>

          {/* Share / Copy button */}
          <motion.button
            onClick={handleShare}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all"
            style={{
              background: copied
                ? 'linear-gradient(135deg, #059669, #047857)'
                : 'linear-gradient(135deg, #7C3AED, #5B21B6)',
              color: 'white',
              fontFamily: "'Nunito', sans-serif",
              fontWeight: 800,
              fontSize: '0.95rem',
              boxShadow: copied
                ? '0 4px 14px rgba(5,150,105,0.35)'
                : '0 4px 14px rgba(124,58,237,0.35)',
            }}
          >
            {copied ? (
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
          </motion.button>
        </div>
      </motion.div>

      {/* ── 2. XP + STATS ── */}
      <motion.div
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
              ? '#1A0F35'
              : '#F5F0FF',
          borderColor: wasRevealed
            ? isDark
              ? '#92400E'
              : '#FDE68A'
            : isDark
              ? '#4C3580'
              : '#C4B5FD',
        }}
      >
        {wasRevealed ? (
          <>
            <p
              style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.5rem', color: '#D97706' }}
            >
              No XP this time 🙈
            </p>
            <p
              style={{
                fontSize: '0.82rem',
                color: isDark ? '#FDE68A' : '#92400E',
                fontWeight: 600,
                marginTop: 4,
              }}
            >
              XP is only earned when you solve without peeking — come back tomorrow!
            </p>
          </>
        ) : (
          <>
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <span
                style={{ fontFamily: "'Fredoka One', cursive", fontSize: '2rem', color: '#7C3AED' }}
              >
                +{xpEarned} XP
              </span>
            </motion.div>
            <p
              style={{
                fontSize: '0.85rem',
                color: isDark ? '#A78BFA' : '#5B21B6',
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
                      fontFamily: "'Fredoka One', cursive",
                      fontSize: '1.2rem',
                      color: '#7C3AED',
                    }}
                  >
                    {s.emoji} {s.value}
                  </p>
                  <p
                    style={{
                      fontSize: '0.72rem',
                      color: isDark ? '#9381CC' : '#9CA3AF',
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
      </motion.div>

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
            <motion.div
              key={i}
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1 + i * 0.08, type: 'spring', stiffness: 400 }}
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
              style={{
                background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
                color: 'white',
                fontFamily: "'Fredoka One', cursive",
                fontSize: '1.4rem',
              }}
            >
              {l}
            </motion.div>
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
              background: isDark ? '#261845' : '#F9F7FF',
              border: `2px dashed ${isDark ? '#4C3580' : '#C4B5FD'}`,
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
                  <motion.div
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
                  </motion.div>
                );
              })}
            <motion.div
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
            </motion.div>
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

      {/* Next puzzle countdown */}
      <NextPuzzleCountdown isDark={isDark} />

      <button
        onClick={onReset}
        className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 border-2 transition-colors"
        style={{
          borderColor: isDark ? '#3D2A6B' : '#EDE9FE',
          background: 'transparent',
          color: '#7C3AED',
          fontFamily: "'Nunito', sans-serif",
          fontWeight: 700,
        }}
      >
        <RotateCcw size={16} /> Practice Again
      </button>
    </motion.div>
  );
}

// ─── WRONG ANSWER FEEDBACK ────────────────────────────────────────────────────

function WrongFeedback({
  attempt,
  onDismiss,
  isDark,
}: {
  attempt: string;
  onDismiss: () => void;
  isDark: boolean;
}) {
  const messages = [
    'Hmm… not quite! Try again? 🤔',
    'Ooh, close but no cigar! Give it another go! 🎯',
    "Not this time — but you're thinking the right way! 💡",
    'Keep going! The answer is closer than you think! 🔍',
  ];
  const msg = messages[Math.floor(Math.random() * messages.length)];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.96 }}
      className="rounded-2xl p-4 flex items-start gap-3"
      style={{
        background: isDark ? '#2A0F15' : '#FFF1F2',
        border: `2px solid ${isDark ? '#F87171' : '#FCA5A5'}`,
      }}
    >
      <Mascot mood="wrong" size={48} animate={false} />
      <div className="flex-1">
        <p
          style={{
            fontFamily: "'Fredoka One', cursive",
            fontSize: '0.95rem',
            color: '#BE123C',
            marginBottom: 2,
          }}
        >
          Not quite!
        </p>
        <p
          style={{
            fontSize: '0.83rem',
            color: isDark ? '#FCA5A5' : '#9F1239',
            fontFamily: "'Nunito', sans-serif",
            fontWeight: 600,
          }}
        >
          "{attempt.toUpperCase()}" — {msg}
        </p>
      </div>
      <button
        onClick={onDismiss}
        style={{ color: '#FDA4AF' }}
        className="hover:text-[#FB7185] transition-colors mt-0.5"
      >
        ✕
      </button>
    </motion.div>
  );
}

// ─── ALREADY SOLVED BANNER ���───────────────────────────────────────────────────

function AlreadySolvedBanner({
  isDark,
  onSolvePractice: _onSolvePractice,
}: {
  isDark: boolean;
  onSolvePractice: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 mb-4 border-2 flex items-center gap-3"
      style={{ background: isDark ? '#1A2A10' : '#ECFDF5', borderColor: '#6EE7B7' }}
    >
      <span className="text-2xl">✅</span>
      <div className="flex-1">
        <p style={{ fontFamily: "'Fredoka One', cursive", fontSize: '0.95rem', color: '#059669' }}>
          You've already solved today's puzzle!
        </p>
        <p
          style={{
            fontSize: '0.82rem',
            color: isDark ? '#6EE7B7' : '#065F46',
            fontFamily: "'Nunito', sans-serif",
            fontWeight: 600,
          }}
        >
          Come back tomorrow for a new clue, or practice again below.
        </p>
      </div>
    </motion.div>
  );
}

// ─── ACTIVE PUZZLE TYPE ───────────────────────────────────────────────────────

interface ActivePuzzle {
  id?: string;
  number: number;
  clue: string;
  answer: string;
  letterCount: number;
  hints: typeof PUZZLE.hints;
  clueParts: typeof CLUE_PARTS;
  date?: string;
  author?: string | null;
  authorSocial?: string | null;
  authorProfile?: {
    name: string;
    social_link: string | null;
    avatar_url: string | null;
  } | null;
}

// ─── HINT BUILDER ────────────────────────────────────────────────────────────

/** Fixed colour scheme per hint slot (1→blue, 2→purple, 3→orange, 4→green). */
const HINT_STYLES = [
  { color: '#3B82F6', bg: '#EFF6FF', bgDark: '#0D1F35', border: '#93C5FD' },
  { color: '#7C3AED', bg: '#F5F3FF', bgDark: '#1A0F35', border: '#C4B5FD' },
  { color: '#F97316', bg: '#FFF7ED', bgDark: '#2A1505', border: '#FED7AA' },
  { color: '#059669', bg: '#ECFDF5', bgDark: '#062010', border: '#6EE7B7' },
] as const;

/** Human-readable descriptions for each wordplay mechanism (Hint 4). */
const MECHANISM_DESCRIPTIONS: Record<string, string> = {
  anagram:
    'This is an anagram clue — the letters of the fodder are rearranged to spell the answer.',
  reversal: 'This is a reversal clue — a word or phrase is read backwards to give the answer.',
  container: 'This is a container clue — one word is placed inside another to form the answer.',
  hidden:
    'This is a hidden word clue — the answer is literally spelled out consecutively inside the clue.',
  deletion:
    'This is a deletion clue — removing one or more letters from a word produces the answer.',
  initial_letters:
    'This is an initial-letters clue — the first letter of each consecutive word in the fodder spells the answer.',
  final_letters:
    'This is a final-letters clue — the last letter of each consecutive word in the fodder spells the answer.',
  alternating_letters:
    'This is an alternating-letters clue — every other letter (odds or evens) of the fodder spells the answer.',
  spoonerism:
    'This is a spoonerism — swapping the initial sounds of two words produces the answer (in the style of Reverend Spooner).',
  charade:
    'This is a charade clue — two or more parts are assembled consecutively to spell the answer.',
  homophone: 'This is a homophone clue — the answer sounds like another word or phrase.',
  double_definition:
    'This is a double definition clue — two separate meanings both independently define the same answer.',
  cryptic_definition:
    'This is a cryptic definition — a single cleverly phrased definition that misdirects before revealing the answer.',
  andlit:
    'This is an &lit clue — the entire clue simultaneously serves as both definition and wordplay.',
  compound:
    'This is a compound clue — two or more cryptic mechanisms are combined to arrive at the answer.',
};

/** Mascot quips per hint slot. */
const HINT_MASCOT_COMMENTS = [
  'The definition is always at the start or end of a cryptic clue. Found it? 👀',
  'The indicator tells you what trick to apply — look for the signal word! 🔍',
  'Now you have the raw material — apply the mechanism to it! ✨',
  "You've got all the pieces now — put it together! 🎯",
];

/**
 * Build the 4 progressive hints from normalised clue_components data.
 * Falls back to the legacy PuzzleHint[] JSONB if no components are present.
 *
 * Hint slot meanings:
 *   1 → definition (what the answer means)
 *   2 → indicator / second-definition for double_def
 *   3 → fodder (the raw wordplay material)
 *   4 → mechanism description
 */
function buildHintsFromComponents(
  components: DbDailyPuzzle['clue_components'],
  primaryType: ClueWordplayType,
  legacyHints: PuzzleHint[]
): typeof PUZZLE.hints {
  // Fall back to legacy JSONB hints if the lambda hasn't written components yet
  if (!components || components.length === 0) {
    if (legacyHints.length > 0) {
      return legacyHints.map(h => ({
        id: h.id,
        title: h.title,
        text: h.text,
        highlight: h.highlight ?? null,
        mascotComment: h.mascot_comment,
        color: h.color,
        bg: h.bg,
        bgDark: h.bg_dark,
        border: h.border,
      }));
    }
    // No legacy hints either — return 4 generic fallback hints
    return [
      {
        id: 1,
        title: 'Definition',
        text: 'The definition is at the very start or end of the clue.',
        highlight: null,
        mascotComment: HINT_MASCOT_COMMENTS[0],
        ...HINT_STYLES[0],
      },
      {
        id: 2,
        title: 'Indicator',
        text: 'Look for a word that signals the cryptic trick (e.g. "mixed", "back", "hidden in").',
        highlight: null,
        mascotComment: HINT_MASCOT_COMMENTS[1],
        ...HINT_STYLES[1],
      },
      {
        id: 3,
        title: 'Fodder',
        text: 'The wordplay material is somewhere in the clue — apply the mechanism to it.',
        highlight: null,
        mascotComment: HINT_MASCOT_COMMENTS[2],
        ...HINT_STYLES[2],
      },
      {
        id: 4,
        title: 'Mechanism',
        text:
          MECHANISM_DESCRIPTIONS[primaryType] ?? 'Apply the cryptic mechanism to find the answer.',
        highlight: null,
        mascotComment: HINT_MASCOT_COMMENTS[3],
        ...HINT_STYLES[3],
      },
    ];
  }

  const defs = components.filter(c => c.role === 'definition');
  const inds = components.filter(c => c.role === 'indicator');
  // Fodder-like roles the solver manipulates (container inner/outer count too).
  const fods = components.filter(
    c => c.role === 'fodder' || c.role === 'container_inner' || c.role === 'container_outer'
  );

  const def = defs[0];
  // For double_definition the model stores the 2nd definition in the indicator slot.
  const ind = inds[0];
  const fod = fods[0];

  const isDoubleDef = primaryType === 'double_definition';
  const isCrypticDef = primaryType === 'cryptic_definition';
  const isAndlit = primaryType === 'andlit';
  const noFodder = isDoubleDef || isCrypticDef || isAndlit;

  const prettyType = (t: string | null | undefined) => (t ? t.replace(/_/g, ' ') : null);

  const formatIndicatorList = (items: typeof inds) =>
    items
      .map(i => {
        const sub = prettyType(i.indicator_type);
        return sub ? `"${i.clue_text}" (${sub})` : `"${i.clue_text}"`;
      })
      .join(' and ');

  const formatFodderList = (items: typeof fods) => items.map(f => `"${f.clue_text}"`).join(' + ');

  // ── Hint 1: Definition ─────────────────────────────────────────────────────
  let hint1Text: string;
  let hint1Highlight: string | null;

  if (isDoubleDef) {
    hint1Text =
      def && ind
        ? `This clue has two definitions: "${def.clue_text}" and "${ind.clue_text}". The answer satisfies both.`
        : def
          ? `One definition is: "${def.clue_text}". Find the second one at the other end of the clue.`
          : 'Both ends of this clue are plain definitions — the answer satisfies both simultaneously.';
    hint1Highlight = def?.clue_text ?? null;
  } else if (isCrypticDef || isAndlit) {
    hint1Text = def
      ? `The entire clue is a cleverly worded definition: "${def.clue_text}". Think laterally!`
      : 'The whole clue is a single, cleverly phrased definition — there is no separate wordplay section.';
    hint1Highlight = def?.clue_text ?? null;
  } else {
    hint1Text = def
      ? `The definition part of this clue is: "${def.clue_text}"`
      : 'Look at the very start or end of the clue — one of them is a plain definition of the answer.';
    hint1Highlight = def?.clue_text ?? null;
  }

  // ── Hint 2: Indicator(s) ───────────────────────────────────────────────────
  let hint2Text: string;
  let hint2Highlight: string | null;

  if (isDoubleDef) {
    hint2Text =
      'There is no indicator word in this clue — both halves are plain definitions. Look for the boundary between them.';
    hint2Highlight = null;
  } else if (isCrypticDef || isAndlit) {
    hint2Text =
      'There is no separate indicator — the wordplay and definition are one and the same. Re-read the clue from a different angle.';
    hint2Highlight = null;
  } else if (inds.length >= 2) {
    hint2Text = `This clue has multiple indicators: ${formatIndicatorList(inds)}. Each one signals a different trick — apply them in the order they appear.`;
    hint2Highlight = ind.clue_text;
  } else if (ind) {
    const sub = prettyType(ind.indicator_type);
    hint2Text = sub
      ? `"${ind.clue_text}" is the indicator (a ${sub} indicator) — it signals which wordplay trick to apply.`
      : `"${ind.clue_text}" is the indicator — it tells you which wordplay trick to apply.`;
    hint2Highlight = ind.clue_text;
  } else {
    hint2Text =
      'Look for a signal word or phrase that tells you the cryptic trick (e.g. "mixed up", "back", "hidden in", "sounds like").';
    hint2Highlight = null;
  }

  // ── Hint 3: Fodder(s) ──────────────────────────────────────────────────────
  let hint3Text: string;
  let hint3Highlight: string | null;

  if (noFodder) {
    hint3Text = isDoubleDef
      ? 'Double definitions have no fodder. The trick is that both parts of the clue, read separately, define the same word.'
      : 'This clue type has no separate fodder — the cleverness is all in the phrasing.';
    hint3Highlight = null;
  } else if (fods.length >= 2) {
    hint3Text = `The wordplay uses multiple pieces of material: ${formatFodderList(fods)}. Apply each indicator to its fodder, then combine the results.`;
    hint3Highlight = fod?.clue_text ?? null;
  } else if (fod) {
    hint3Text = `The wordplay material is: "${fod.clue_text}"`;
    hint3Highlight = fod.clue_text;
  } else {
    hint3Text =
      'The wordplay material is somewhere in the clue — it may appear as a word, phrase, or synonym.';
    hint3Highlight = null;
  }

  // ── Hint 4: Mechanism(s) ───────────────────────────────────────────────────
  let hint4Text =
    MECHANISM_DESCRIPTIONS[primaryType] ??
    'Apply the cryptic mechanism to the fodder to produce the answer.';

  // Compound clues benefit from a per-indicator sub-type roll-up.
  if (primaryType === 'compound') {
    const uniqueSubtypes = Array.from(
      new Set(inds.map(i => i.indicator_type).filter(Boolean) as string[])
    );
    if (uniqueSubtypes.length >= 2) {
      hint4Text += ` Tricks at play: ${uniqueSubtypes.map(s => s.replace(/_/g, ' ')).join(' + ')}.`;
    }
  }

  return [
    {
      id: 1,
      title: 'Find the Definition',
      text: hint1Text,
      highlight: hint1Highlight,
      mascotComment: HINT_MASCOT_COMMENTS[0],
      ...HINT_STYLES[0],
    },
    {
      id: 2,
      title: 'Spot the Indicator',
      text: hint2Text,
      highlight: hint2Highlight,
      mascotComment: HINT_MASCOT_COMMENTS[1],
      ...HINT_STYLES[1],
    },
    {
      id: 3,
      title: 'Find the Fodder',
      text: hint3Text,
      highlight: hint3Highlight,
      mascotComment: HINT_MASCOT_COMMENTS[2],
      ...HINT_STYLES[2],
    },
    {
      id: 4,
      title: 'Mechanism Type',
      text: hint4Text,
      highlight: null,
      mascotComment: HINT_MASCOT_COMMENTS[3],
      ...HINT_STYLES[3],
    },
  ];
}

function mapDbPuzzle(p: DbDailyPuzzle): ActivePuzzle {
  return {
    id: p.id,
    number: p.number,
    clue: p.clue_text,
    answer: p.answer,
    letterCount: p.answer_length,
    hints: buildHintsFromComponents(p.clue_components, p.primary_type, p.hints ?? []),
    clueParts: (p.clue_parts ?? []).map(cp => ({ text: cp.text, type: cp.type as string | null })),
    date: p.date,
    author: p.author,
    authorSocial: p.author_social,
    authorProfile: p.author_profile,
  };
}

const DEFAULT_PUZZLE: ActivePuzzle = {
  id: undefined,
  number: PUZZLE.number,
  clue: PUZZLE.clue,
  answer: PUZZLE.answer,
  letterCount: PUZZLE.letterCount,
  hints: PUZZLE.hints,
  clueParts: CLUE_PARTS,
};

// ─── MAIN PUZZLE PAGE ─────────────────────────────────────────────────────────

export function Puzzle() {
  const { number: puzzleNumberParam } = useParams<{ number?: string }>();
  const requestedNumber = puzzleNumberParam ? parseInt(puzzleNumberParam, 10) : undefined;
  // isArchive = true whenever a puzzle number is in the URL (even if it equals the hardcoded
  // fallback number). This ensures /puzzle/42 always fetches puzzle #42 from the DB.
  const isArchive = requestedNumber !== undefined;

  // The puzzle to play: archive puzzle (if loaded) or today's hardcoded puzzle
  const [activePuzzle, setActivePuzzle] = useState<ActivePuzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);

    if (isArchive && requestedNumber) {
      fetchPuzzleByNumber(requestedNumber).then(p => {
        if (p) {
          setActivePuzzle(mapDbPuzzle(p));
          setPuzzleId(p.id);
          setStartTime(Date.now());
        } else {
          setNotFound(true);
        }
        setLoading(false);
      });
    } else {
      // Fetch today's puzzle with caching
      const isoDate = new Date().toISOString().split('T')[0];
      const cacheKey = `tco-puzzle-${isoDate}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        try {
          const p = JSON.parse(cached);
          setActivePuzzle(mapDbPuzzle(p));
          setPuzzleId(p.id);
          setStartTime(Date.now());
          setLoading(false);
          return;
        } catch {
          localStorage.removeItem(cacheKey);
        }
      }

      fetchPuzzleByDate(isoDate).then(p => {
        if (p) {
          setActivePuzzle(mapDbPuzzle(p));
          setPuzzleId(p.id);
          setStartTime(Date.now());
          // Cache for the rest of the day
          localStorage.setItem(cacheKey, JSON.stringify(p));
        } else {
          // Fallback to hardcoded if DB is empty/unconfigured
          setActivePuzzle(DEFAULT_PUZZLE);
          setStartTime(Date.now());
        }
        setLoading(false);
      });
    }
  }, [requestedNumber, isArchive]);

  const [answer, setAnswer] = useState('');
  const [hintsUnlocked, setHintsUnlocked] = useState(0);
  const [isCorrect, setIsCorrect] = useState(false);
  const [wasRevealed, setWasRevealed] = useState(false);
  const [wrongAttempt, setWrongAttempt] = useState<string | null>(null);
  const [wrongAttemptsCount, setWrongAttemptsCount] = useState(0);
  const [newHintIndex, setNewHintIndex] = useState<number | null>(null);
  const [showAllHints, setShowAllHints] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [solveTime, setSolveTime] = useState(0);
  const [puzzleId, setPuzzleId] = useState<string | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const { user } = useAuth();
  const alreadySolved = isArchive ? false : hasSolvedToday();
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Fetch today's puzzle UUID from Supabase so we can write solve records and reactions.
  // Game logic stays on the hardcoded PUZZLE constant; this is purely for the DB foreign key.
  useEffect(() => {
    // Handled in the main loading effect above
  }, [isArchive]);

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
            fontFamily: "'Fredoka One', cursive",
            fontSize: '1.6rem',
            color: isDark ? '#C4B5FD' : '#5B21B6',
            marginBottom: 8,
          }}
        >
          Puzzle #{requestedNumber} not found
        </h2>
        <p
          style={{
            color: isDark ? '#9381CC' : '#6B7280',
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
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold"
          style={{
            background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
            color: 'white',
            fontFamily: "'Nunito', sans-serif",
            fontWeight: 800,
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
    if (hintsUnlocked === 2) return 'Can you see the anagram now? 🔀';
    if (hintsUnlocked === 3) return 'Shuffle those letters! ✨';
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
  };

  const visibleHints = activePuzzle?.hints.slice(0, hintsUnlocked) || [];

  const handleReveal = () => {
    setWasRevealed(true);
    setIsCorrect(true);
    setSolveTime(Math.floor((Date.now() - startTime) / 1000));
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pb-20 pt-6">
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
                      style={{ background: isDark ? '#261845' : '#EDE9FE' }}
                    />
                    <div
                      className="h-3 w-24 rounded-md"
                      style={{ background: isDark ? '#1A0F35' : '#F5F3FF' }}
                    />
                  </div>
                ) : (
                  <>
                    <p
                      style={{
                        fontFamily: "'Fredoka One', cursive",
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
                      {today}
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
                                color: isDark ? '#A78BFA' : '#7C3AED',
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
                              color: isDark ? '#A78BFA' : '#7C3AED',
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
                  <Timer size={13} style={{ color: isDark ? '#FB923C' : '#EA580C' }} />
                  <span style={{ fontSize: '0.85rem', color: isDark ? '#FB923C' : '#EA580C' }}>
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
                      style={{ background: isDark ? '#261845' : '#EDE9FE' }}
                    />
                    <div
                      className="h-5 w-3/4 max-w-[300px] rounded-md"
                      style={{ background: isDark ? '#261845' : '#EDE9FE' }}
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
                          borderColor: isDark ? '#3D2A6B' : '#E0E7FF',
                          background: isDark ? '#1A1035' : '#FAFAFA',
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  activePuzzle &&
                  [...Array(activePuzzle.letterCount)].map((_, i) => {
                    const char = answer[i];
                    return (
                      <motion.div
                        key={i}
                        animate={char ? { scale: [1, 1.15, 1] } : {}}
                        transition={{ duration: 0.15 }}
                        className="w-11 h-11 rounded-xl border-2 flex items-center justify-center"
                        style={{
                          borderColor: char ? '#7C3AED' : isDark ? '#3D2A6B' : '#E0E7FF',
                          background: char
                            ? isDark
                              ? '#261845'
                              : '#F5F0FF'
                            : isDark
                              ? '#1A1035'
                              : '#FAFAFA',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "'Fredoka One', cursive",
                            color: '#5B21B6',
                            fontSize: '1.2rem',
                          }}
                        >
                          {char?.toUpperCase() || ''}
                        </span>
                      </motion.div>
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
                placeholder={loading ? 'Loading…' : 'Enter your answer ...'}
                className="flex-1 py-3 sm:py-4 px-3 sm:px-4 rounded-2xl border-2 focus:outline-none transition-all min-w-0"
                style={{
                  borderColor: isDark ? '#4C3580' : '#E0E7FF',
                  fontFamily: "'Fredoka One', cursive",
                  // 16px minimum prevents iOS Safari from zooming on input focus
                  fontSize: '1rem',
                  color: T.text,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  background: isDark ? '#1A1035' : '#FAFAFA',
                  textTransform: 'uppercase',
                  textAlign: 'left',
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#7C3AED';
                  e.target.style.boxShadow = '0 0 0 4px rgba(124,58,237,0.15)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = isDark ? '#4C3580' : '#E0E7FF';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSubmit}
                disabled={loading || answer.length !== (activePuzzle?.letterCount || 0)}
                className="px-3 sm:px-6 py-3 rounded-2xl flex items-center gap-2 transition-all disabled:opacity-40 shadow-md shrink-0"
                style={{
                  background:
                    !loading && answer.length === activePuzzle?.letterCount
                      ? 'linear-gradient(135deg, #7C3AED, #5B21B6)'
                      : isDark
                        ? '#261845'
                        : '#E5E7EB',
                  color:
                    !loading && answer.length === activePuzzle?.letterCount
                      ? 'white'
                      : isDark
                        ? '#4C3580'
                        : '#9CA3AF',
                  fontFamily: "'Nunito', sans-serif",
                  fontWeight: 800,
                }}
              >
                <Send size={18} />
                <span className="hidden sm:inline">Submit</span>
              </motion.button>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleHint}
              disabled={loading || hintsUnlocked >= (activePuzzle?.hints.length || 0)}
              className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 border-2 transition-all disabled:opacity-40"
              style={{
                borderColor: isDark ? '#92400E' : '#FED7AA',
                background: isDark ? '#2A1505' : '#FFF7ED',
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
            </motion.button>

            {/* Reveal Button — only after all hints are used */}
            {!loading && activePuzzle && hintsUnlocked >= activePuzzle.hints.length && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleReveal}
                className="w-full py-3 mt-3 rounded-2xl flex items-center justify-center gap-2 border-2 transition-all"
                style={{
                  borderColor: isDark ? '#4C3580' : '#E0E7FF',
                  background: isDark ? '#1A1035' : '#F9FAFB',
                  color: isDark ? '#A78BFA' : '#6B7280',
                  fontFamily: "'Nunito', sans-serif",
                  fontWeight: 800,
                }}
              >
                <RotateCcw size={16} />
                I'm stuck, reveal the answer
              </motion.button>
            )}
          </div>

          {/* Hints */}
          <AnimatePresence>
            {visibleHints.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3
                    style={{
                      fontFamily: "'Fredoka One', cursive",
                      fontSize: '1rem',
                      color: isDark ? '#C4B5FD' : '#1E1B4B',
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
                      <motion.span
                        animate={{ rotate: showAllHints ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex"
                      >
                        <ChevronDown size={14} />
                      </motion.span>
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
              </motion.div>
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
          />
        )
      )}

      {/* Mobile sticky input bar */}
      {!isCorrect && (
        <div
          className="md:hidden fixed bottom-0 left-0 right-0 p-3 border-t flex gap-2 z-40"
          style={{
            background: T.mobileBarBg,
            backdropFilter: 'blur(12px)',
            borderColor: T.cardBorder,
          }}
        >
          <input
            type="text"
            disabled={loading}
            maxLength={activePuzzle?.letterCount || 0}
            value={answer}
            onChange={e => setAnswer(e.target.value.replace(/[^a-zA-Z]/g, ''))}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder={loading ? '…' : 'Answer…'}
            className="flex-1 py-3 px-4 rounded-2xl border-2 focus:outline-none"
            style={{
              borderColor: isDark ? '#4C3580' : '#E0E7FF',
              fontFamily: "'Nunito', sans-serif",
              fontWeight: 700,
              fontSize: '0.95rem',
              textTransform: 'uppercase',
              background: T.inputBg,
              color: T.text,
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={loading || answer.length !== (activePuzzle?.letterCount || 0)}
            className="px-4 py-3 rounded-2xl disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', color: 'white' }}
          >
            <Send size={18} />
          </button>
          <button
            onClick={handleHint}
            disabled={loading || hintsUnlocked >= (activePuzzle?.hints.length || 0)}
            className="px-4 py-3 rounded-2xl disabled:opacity-40"
            style={{
              background: isDark ? '#2A1505' : '#FFF7ED',
              border: `2px solid ${isDark ? '#92400E' : '#FED7AA'}`,
              color: '#C2410C',
            }}
          >
            <Lightbulb size={18} />
          </button>
        </div>
      )}

      {/* Achievements at the bottom */}
      <div className="mt-8">
        <Achievements isDark={isDark} />
      </div>
    </div>
  );
}
