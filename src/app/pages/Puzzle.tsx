import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mascot, MascotMood } from '../components/Mascot';
import { Lightbulb, Send, RotateCcw, Copy, Check, ChevronDown, Share2, Timer, Zap } from 'lucide-react';
// @ts-ignore
import confetti from 'canvas-confetti';
import { useDarkMode } from '../context/DarkModeContext';
import { getTheme } from '../theme';
import { useStreak, getXPForSolve, getLevelTitle, getLevelFromXP, hasSolvedToday } from '../hooks/useStreak';

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
      mascotComment: 'The definition is always at the start or end of a cryptic clue. Look at the end! 👀',
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

const PART_STYLES: Record<string, { bg: string; bgDark: string; color: string; border: string; label: string }> = {
  definition: { bg: '#EFF6FF', bgDark: '#0D1F35', color: '#1D4ED8', border: '#3B82F6', label: 'Definition' },
  indicator: { bg: '#F5F3FF', bgDark: '#1A0F35', color: '#5B21B6', border: '#7C3AED', label: 'Indicator' },
  fodder: { bg: '#FFF7ED', bgDark: '#2A1505', color: '#C2410C', border: '#F97316', label: 'Fodder' },
  wordplay: { bg: '#ECFDF5', bgDark: '#062010', color: '#065F46', border: '#10B981', label: 'Wordplay' },
};

// ─── TIMER ────────────────────────────────────────────────────────────────────

function SolveTimer({ startTime, stopped }: { startTime: number; stopped: boolean }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (stopped) return;
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
      <p style={{ fontSize: '0.78rem', color: isDark ? '#9381CC' : '#6B7280', fontWeight: 700, marginBottom: 4 }}>
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
      <p style={{ fontSize: '0.78rem', color: isDark ? '#9381CC' : '#6B7280', fontWeight: 600, marginTop: 2 }}>
        Come back tomorrow for #43 🦉
      </p>
    </div>
  );
}

// ─── SCRAMBLE LETTERS ─────────────────────────────────────────────────────────

function ScrambleLetters({ isDark }: { isDark: boolean }) {
  const [shuffled, setShuffled] = useState(true);
  const letters = ['P', 'E', 'A', 'R', 'S'];
  const answer = ['S', 'P', 'E', 'A', 'R'];
  const colors = ['#7C3AED', '#F97316', '#0284C7', '#059669', '#DB2777'];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2">
        {(shuffled ? letters : answer).map((l, i) => (
          <motion.div
            key={`${shuffled}-${i}`}
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: i * 0.05, type: 'spring', stiffness: 400 }}
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-sm"
            style={{
              background: colors[i] + '22',
              border: `2px solid ${colors[i]}`,
              color: colors[i],
              fontFamily: "'Fredoka One', cursive",
              fontSize: '1.2rem',
            }}
          >
            {l}
          </motion.div>
        ))}
      </div>
      <button
        onClick={() => setShuffled(!shuffled)}
        className="text-xs font-bold px-3 py-1.5 rounded-full transition-all hover:opacity-80"
        style={{
          background: isDark ? '#1A0F35' : '#F5F0FF',
          color: '#7C3AED',
          border: `1.5px solid ${isDark ? '#4C3580' : '#C4B5FD'}`,
          fontFamily: "'Nunito', sans-serif",
        }}
      >
        {shuffled ? '🔀 Rearrange!' : '↩️ Shuffle back'}
      </button>
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
            {hint.id === 3 && (
              <div className="mt-3">
                <ScrambleLetters isDark={isDark} />
              </div>
            )}
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
  solveTime,
  onReset,
  isDark,
}: {
  hintsUsed: number;
  solveTime: number;
  onReset: () => void;
  isDark: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const runConfetti = useRef(false);
  const T = getTheme(isDark);
  const { count: streak, totalSolved, xp, level, recordSolve } = useStreak();
  const xpEarned = getXPForSolve(hintsUsed);
  const [finalData, setFinalData] = useState<{ streak: number; total: number; xp: number; level: number } | null>(null);

  useEffect(() => {
    if (!runConfetti.current) {
      runConfetti.current = true;

      // Record the solve in streak
      const result = recordSolve(hintsUsed, PUZZLE.number);
      if (result) {
        setFinalData({ streak: result.count, total: result.totalSolved, xp: result.xp, level: result.level });
      }

      const end = Date.now() + 2800;
      const colors = ['#7C3AED', '#F97316', '#34D399', '#38BDF8', '#FCD34D', '#F472B6'];
      const frame = () => {
        confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  }, []);

  const displayData = finalData || { streak, total: totalSolved, xp, level };

  const getShareBlocks = () =>
    [...Array(4)].map((_, i) => (i < hintsUsed ? '🟨' : '🟩')).join('');

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const solveTimeStr =
    solveTime < 60
      ? `${solveTime}s`
      : `${Math.floor(solveTime / 60)}m ${solveTime % 60}s`;

  const shareText = [
    `🦉 The Cryptic Owl #${PUZZLE.number}`,
    `📅 ${today}`,
    ``,
    getShareBlocks(),
    ``,
    hintsUsed === 0
      ? `✨ Solved with no hints — pure genius!`
      : `💡 Solved with ${hintsUsed} hint${hintsUsed !== 1 ? 's' : ''}`,
    `⏱ Time: ${solveTimeStr} | 🔥 Streak: ${displayData.streak}`,
    ``,
    `Think you can crack today's cryptic clue?`,
    `Challenge yourself — solve one clue a day 🧩`,
    `👉 thecrypticowl.com`,
  ].join('\n');

  const handleCopy = async () => {
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
      {/* Success header */}
      <div className="text-center py-6">
        <div className="flex justify-center mb-4">
          <Mascot mood="celebrating" size={120} speechBubble="Brilliant solve! 🎉" bubbleDirection="right" animate />
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
              color: '#7C3AED',
              marginBottom: 4,
            }}
          >
            You got it! 🎊
          </h2>
          <p style={{ color: isDark ? '#A78BFA' : '#6B7280', fontWeight: 600, fontFamily: "'Nunito', sans-serif" }}>
            {hintsUsed === 0
              ? "No hints needed — you're a natural!"
              : hintsUsed === 1
              ? 'Solved with just 1 hint. Impressive!'
              : `Solved with ${hintsUsed} hints. Great effort!`}
          </p>
        </motion.div>
      </div>

      {/* XP earned */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 400 }}
        className="rounded-3xl p-5 border-2 text-center"
        style={{ background: isDark ? '#1A0F35' : '#F5F0FF', borderColor: isDark ? '#4C3580' : '#C4B5FD' }}
      >
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <span
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: '2rem',
              color: '#7C3AED',
            }}
          >
            +{xpEarned} XP
          </span>
        </motion.div>
        <p style={{ fontSize: '0.85rem', color: isDark ? '#A78BFA' : '#5B21B6', fontWeight: 700, marginTop: 2 }}>
          <Zap size={13} className="inline mr-1" />
          {hintsUsed === 0 ? 'Perfect solve bonus!' : `${hintsUsed} hint${hintsUsed > 1 ? 's' : ''} used`}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { emoji: '🔥', value: displayData.streak, label: 'Streak' },
            { emoji: '🧩', value: displayData.total, label: 'Total Solved' },
            { emoji: '⚡', value: `${displayData.xp} XP`, label: levelTitle.split(' ')[0] },
          ].map((s, i) => (
            <div key={i}>
              <p style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.2rem', color: '#7C3AED' }}>
                {s.emoji} {s.value}
              </p>
              <p style={{ fontSize: '0.72rem', color: isDark ? '#9381CC' : '#9CA3AF', fontWeight: 600 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Answer reveal */}
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
          {PUZZLE.answer.split('').map((l, i) => (
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

        {/* Full breakdown */}
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
            style={{ background: isDark ? '#261845' : '#F9F7FF', border: `2px dashed ${isDark ? '#4C3580' : '#C4B5FD'}` }}
          >
            <p style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: '1rem', color: T.text, lineHeight: 1.9 }}>
              {CLUE_PARTS.map((part, i) =>
                part.type ? (
                  <span
                    key={i}
                    style={{
                      background: isDark ? PART_STYLES[part.type].bgDark : PART_STYLES[part.type].bg,
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
            {[
              { label: 'Fodder', value: 'PEARS �� the letters to rearrange', style: PART_STYLES.fodder },
              { label: 'Indicator', value: '"mixed up" → signals an anagram', style: PART_STYLES.indicator },
              { label: 'Definition', value: '"a weapon" → confirms SPEAR', style: PART_STYLES.definition },
              { label: 'Wordplay', value: 'PEARS → anagram → SPEAR ✓', style: PART_STYLES.wordplay },
            ].map((row, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-center gap-3 rounded-xl p-3"
                style={{
                  background: isDark ? row.style.bgDark : row.style.bg,
                  border: `1.5px solid ${row.style.border}`,
                }}
              >
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-bold flex-shrink-0"
                  style={{ background: row.style.border, color: 'white', fontFamily: "'Nunito', sans-serif" }}
                >
                  {row.label}
                </span>
                <span
                  style={{
                    fontSize: '0.85rem',
                    color: row.style.color,
                    fontFamily: "'Nunito', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  {row.value}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Share card */}
      <div
        className="rounded-3xl p-5 border shadow-sm"
        style={{ background: T.cardBg, borderColor: T.cardBorder }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Share2 size={16} className="text-[#7C3AED]" />
          <p style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1rem', color: isDark ? '#C4B5FD' : '#1E1B4B' }}>
            Challenge your friends!
          </p>
        </div>
        <div
          className="rounded-2xl p-4 mb-4"
          style={{
            background: T.shareCardBg,
            border: `2px dashed ${T.shareCardBorder}`,
          }}
        >
          <p style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1rem', color: '#5B21B6', marginBottom: 4 }}>
            🦉 The Cryptic Owl #{PUZZLE.number}
          </p>
          <p className="text-2xl mb-2">{getShareBlocks()}</p>
          <p style={{ fontSize: '0.85rem', color: isDark ? '#A78BFA' : '#4B5563', fontFamily: "'Nunito', sans-serif", fontWeight: 600, lineHeight: 1.5 }}>
            {hintsUsed === 0
              ? '✨ Solved with no hints — pure genius!'
              : `💡 Solved with ${hintsUsed} hint${hintsUsed !== 1 ? 's' : ''}`}
          </p>
          <p style={{ fontSize: '0.8rem', color: isDark ? '#6D5FA8' : '#9CA3AF', fontFamily: "'Nunito', sans-serif", marginTop: 4, fontStyle: 'italic' }}>
            Think you can crack today's cryptic clue?
          </p>
          <p style={{ fontSize: '0.8rem', color: isDark ? '#6D5FA8' : '#9CA3AF', fontFamily: "'Nunito', sans-serif" }}>
            Challenge yourself — solve one clue a day 🧩
          </p>
          <p style={{ fontSize: '0.82rem', color: '#7C3AED', fontFamily: "'Fredoka One', cursive", marginTop: 2 }}>
            👉 thecrypticowl.com
          </p>
        </div>

        <div className="flex gap-4 mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-lg">🟩</span>
            <span style={{ fontSize: '0.78rem', color: isDark ? '#9381CC' : '#6B7280', fontFamily: "'Nunito', sans-serif" }}>
              = No hint needed
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-lg">🟨</span>
            <span style={{ fontSize: '0.78rem', color: isDark ? '#9381CC' : '#6B7280', fontFamily: "'Nunito', sans-serif" }}>
              = Used a hint
            </span>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 transition-all hover:opacity-90"
          style={{
            background: copied ? 'linear-gradient(135deg, #059669, #047857)' : 'linear-gradient(135deg, #7C3AED, #5B21B6)',
            color: 'white',
            fontFamily: "'Nunito', sans-serif",
            fontWeight: 800,
          }}
        >
          {copied ? <><Check size={16} /> Copied to clipboard!</> : <><Copy size={16} /> Copy & Share Result</>}
        </button>
      </div>

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
    'Not this time — but you\'re thinking the right way!',
    'Nope! But don\'t give up — the answer is SPEAR-ingly close! 😄',
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
        <p style={{ fontFamily: "'Fredoka One', cursive", fontSize: '0.95rem', color: '#BE123C', marginBottom: 2 }}>
          Not quite!
        </p>
        <p style={{ fontSize: '0.83rem', color: isDark ? '#FCA5A5' : '#9F1239', fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>
          "{attempt.toUpperCase()}" — {msg}
        </p>
      </div>
      <button onClick={onDismiss} style={{ color: '#FDA4AF' }} className="hover:text-[#FB7185] transition-colors mt-0.5">
        ✕
      </button>
    </motion.div>
  );
}

// ─── ALREADY SOLVED BANNER ���───────────────────────────────────────────────────

function AlreadySolvedBanner({ isDark, onSolvePractice }: { isDark: boolean; onSolvePractice: () => void }) {
  const T = getTheme(isDark);
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
        <p style={{ fontSize: '0.82rem', color: isDark ? '#6EE7B7' : '#065F46', fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>
          Come back tomorrow for a new clue, or practice again below.
        </p>
      </div>
    </motion.div>
  );
}

// ─── MAIN PUZZLE PAGE ─────────────────────────────────────────────────────────

export function Puzzle() {
  const [answer, setAnswer] = useState('');
  const [hintsUnlocked, setHintsUnlocked] = useState(0);
  const [isCorrect, setIsCorrect] = useState(false);
  const [wrongAttempt, setWrongAttempt] = useState<string | null>(null);
  const [newHintIndex, setNewHintIndex] = useState<number | null>(null);
  const [showAllHints, setShowAllHints] = useState(false);
  const [startTime] = useState(Date.now());
  const [solveTime, setSolveTime] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const alreadySolved = hasSolvedToday();
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

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
    if (!answer.trim()) return;
    if (answer.trim().toUpperCase() === PUZZLE.answer) {
      setSolveTime(Math.floor((Date.now() - startTime) / 1000));
      setIsCorrect(true);
      setWrongAttempt(null);
    } else {
      setWrongAttempt(answer.trim());
      setAnswer('');
      inputRef.current?.focus();
    }
  };

  const handleHint = () => {
    if (hintsUnlocked < PUZZLE.hints.length) {
      setNewHintIndex(hintsUnlocked);
      setHintsUnlocked(prev => prev + 1);
      setWrongAttempt(null);
    }
  };

  const handleReset = () => {
    setAnswer('');
    setHintsUnlocked(0);
    setIsCorrect(false);
    setWrongAttempt(null);
    setNewHintIndex(null);
  };

  const visibleHints = PUZZLE.hints.slice(0, hintsUnlocked);

  return (
    <div className="max-w-2xl mx-auto px-4 pb-32 pt-6">
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
                <p style={{ fontFamily: "'Fredoka One', cursive", fontSize: '0.85rem', color: '#7C3AED', marginBottom: 2 }}>
                  🧩 CRYPTIC #{PUZZLE.number}
                </p>
                <p style={{ fontSize: '0.8rem', color: T.textFaint, fontWeight: 600, fontFamily: "'Nunito', sans-serif" }}>
                  {today}
                </p>
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
                className="w-full rounded-2xl p-5 text-center"
                style={{ background: T.clueBg, border: `2px solid ${T.clueAreaBorder}` }}
              >
                <p
                  style={{
                    fontFamily: "'Nunito', sans-serif",
                    fontWeight: 800,
                    fontSize: 'clamp(1rem, 3vw, 1.2rem)',
                    color: T.text,
                    lineHeight: 1.7,
                  }}
                >
                  "{PUZZLE.clue}"
                </p>
              </div>

              {/* Answer boxes */}
              <div className="flex gap-2">
                {[...Array(PUZZLE.letterCount)].map((_, i) => {
                  const char = answer[i];
                  return (
                    <motion.div
                      key={i}
                      animate={char ? { scale: [1, 1.15, 1] } : {}}
                      transition={{ duration: 0.15 }}
                      className="w-11 h-11 rounded-xl border-2 flex items-center justify-center"
                      style={{
                        borderColor: char ? '#7C3AED' : isDark ? '#3D2A6B' : '#E0E7FF',
                        background: char ? (isDark ? '#261845' : '#F5F0FF') : (isDark ? '#1A1035' : '#FAFAFA'),
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
                })}
              </div>
            </div>
          </div>

          {/* Wrong attempt feedback */}
          <AnimatePresence>
            {wrongAttempt && (
              <WrongFeedback attempt={wrongAttempt} onDismiss={() => setWrongAttempt(null)} isDark={isDark} />
            )}
          </AnimatePresence>

          {/* Input + Buttons */}
          <div
            className="rounded-3xl p-4 shadow-sm border"
            style={{ background: T.cardBg, borderColor: T.cardBorder }}
          >
            <div className="flex gap-2 mb-3">
              <input
                ref={inputRef}
                type="text"
                maxLength={PUZZLE.letterCount}
                value={answer}
                onChange={e => setAnswer(e.target.value.replace(/[^a-zA-Z]/g, ''))}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Enter your answer…"
                className="flex-1 py-3 px-4 rounded-2xl border-2 focus:outline-none transition-colors"
                style={{
                  borderColor: isDark ? '#4C3580' : '#E0E7FF',
                  fontFamily: "'Nunito', sans-serif",
                  fontSize: '1rem',
                  color: T.text,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  background: T.inputBg,
                  textTransform: 'uppercase',
                }}
                onFocus={e => (e.target.style.borderColor = '#7C3AED')}
                onBlur={e => (e.target.style.borderColor = isDark ? '#4C3580' : '#E0E7FF')}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSubmit}
                disabled={answer.length !== PUZZLE.letterCount}
                className="px-5 py-3 rounded-2xl flex items-center gap-2 transition-all disabled:opacity-40"
                style={{
                  background:
                    answer.length === PUZZLE.letterCount
                      ? 'linear-gradient(135deg, #7C3AED, #5B21B6)'
                      : isDark ? '#261845' : '#E5E7EB',
                  color: answer.length === PUZZLE.letterCount ? 'white' : isDark ? '#4C3580' : '#9CA3AF',
                  fontFamily: "'Nunito', sans-serif",
                  fontWeight: 800,
                }}
              >
                <Send size={16} />
                Submit
              </motion.button>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleHint}
              disabled={hintsUnlocked >= PUZZLE.hints.length}
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
              {hintsUnlocked >= PUZZLE.hints.length
                ? 'No more hints!'
                : `Get Hint ${hintsUnlocked + 1} of ${PUZZLE.hints.length}`}
              {hintsUnlocked > 0 && hintsUnlocked < PUZZLE.hints.length && (
                <span className="ml-1 flex gap-1">
                  {[...Array(PUZZLE.hints.length)].map((_, i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: i < hintsUnlocked ? '#F97316' : isDark ? '#92400E' : '#FED7AA' }}
                    />
                  ))}
                </span>
              )}
            </motion.button>
          </div>

          {/* Hints */}
          <AnimatePresence>
            {visibleHints.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1rem', color: isDark ? '#C4B5FD' : '#1E1B4B' }}>
                    💡 Hints Unlocked ({hintsUnlocked}/{PUZZLE.hints.length})
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
        <SuccessState hintsUsed={hintsUnlocked} solveTime={solveTime} onReset={handleReset} isDark={isDark} />
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
            maxLength={PUZZLE.letterCount}
            value={answer}
            onChange={e => setAnswer(e.target.value.replace(/[^a-zA-Z]/g, ''))}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="Your answer…"
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
            disabled={answer.length !== PUZZLE.letterCount}
            className="px-4 py-3 rounded-2xl disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', color: 'white' }}
          >
            <Send size={18} />
          </button>
          <button
            onClick={handleHint}
            disabled={hintsUnlocked >= PUZZLE.hints.length}
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
    </div>
  );
}
