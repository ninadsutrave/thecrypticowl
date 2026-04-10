import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Mascot } from '../components/Mascot';
import { BookOpen, Zap, ChevronRight, Trophy, Clock, Star, Send } from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';
import { getTheme } from '../theme';
import { useStreak, getLevelTitle, getXPToNextLevel } from '../hooks/useStreak';
import { useEffect, useState } from 'react';
import { fetchPuzzleByDate } from '../../lib/supabase';
import { useAuth } from '../context/AuthContext';

// ─── FLOATING BG ──────────────────────────────────────────────────────────────

const FLOAT_ITEMS = [
  { char: 'E', x: '5%', y: '10%', size: 52, delay: 0, color: '#C4B5FD' },
  { char: 'A', x: '88%', y: '7%', size: 40, delay: 0.5, color: '#A7F3D0' },
  { char: '?', x: '92%', y: '35%', size: 46, delay: 1, color: '#FDE68A' },
  { char: 'T', x: '3%', y: '50%', size: 38, delay: 1.5, color: '#BAE6FD' },
  { char: 'R', x: '90%', y: '60%', size: 50, delay: 0.8, color: '#FCA5A5' },
  { char: 'S', x: '7%', y: '78%', size: 44, delay: 1.2, color: '#C4B5FD' },
  { char: '★', x: '85%', y: '82%', size: 36, delay: 0.3, color: '#FDE68A' },
  { char: 'N', x: '14%', y: '28%', size: 30, delay: 0.7, color: '#A7F3D0' },
  { char: 'I', x: '78%', y: '18%', size: 28, delay: 1.8, color: '#BAE6FD' },
];

function FloatingBg({ isDark }: { isDark: boolean }) {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden>
      {FLOAT_ITEMS.map((item, i) => (
        <motion.div
          key={i}
          className="absolute select-none"
          style={{
            left: item.x,
            top: item.y,
            fontSize: item.size,
            color: item.color,
            fontFamily: "'Fredoka One', cursive",
            opacity: isDark ? 0.06 : 0.12,
          }}
          animate={{ y: [0, -18, 0], rotate: [0, 5, -5, 0] }}
          transition={{
            duration: 5 + i * 0.4,
            delay: item.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {item.char}
        </motion.div>
      ))}
    </div>
  );
}

// ─── COUNTDOWN TIMER ──────────────────────────────────────────────────────────

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
    <div className="flex items-center gap-1.5">
      <Clock size={13} style={{ color: isDark ? '#9381CC' : '#6B7280' }} />
      <span style={{ fontSize: '0.78rem', color: isDark ? '#9381CC' : '#6B7280', fontWeight: 600 }}>
        Next puzzle in{' '}
        <span
          style={{
            fontFamily: "'Fredoka One', cursive",
            color: isDark ? '#C4B5FD' : '#7C3AED',
            fontSize: '0.85rem',
          }}
        >
          {timeLeft}
        </span>
      </span>
    </div>
  );
}

// ─── TODAY'S PUZZLE HERO ──────────────────────────────────────────────────────

interface TodayPuzzleData {
  number: number;
  clue: string;
  letterCount: number;
}

const FALLBACK_PUZZLE: TodayPuzzleData = {
  number: 42,
  clue: 'Pears mixed up to form a weapon (5)',
  letterCount: 5,
};

function TodaysPuzzleHero({
  onNavigate,
  isDark,
  puzzle,
}: {
  onNavigate: () => void;
  isDark: boolean;
  puzzle: TodayPuzzleData;
}) {
  const T = getTheme(isDark);
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="w-full max-w-lg mx-auto"
    >
      <div
        className="rounded-3xl overflow-hidden shadow-2xl border-2"
        style={{ background: T.cardBg, borderColor: T.cardBorderStrong }}
      >
        {/* Card top bar */}
        <div
          className="px-6 py-4 flex items-center justify-between border-b"
          style={{ background: isDark ? '#261845' : '#F5F0FF', borderColor: T.cardBorder }}
        >
          <div>
            <p
              style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: '0.9rem',
                color: '#7C3AED',
              }}
            >
              🧩 CRYPTIC #{puzzle.number}
            </p>
            <p style={{ fontSize: '0.78rem', color: T.textMuted, fontWeight: 600, marginTop: 1 }}>
              {today}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="rounded-full px-3 py-1"
              style={{
                background: isDark ? '#1A0F35' : '#EDE9FE',
                border: `1.5px solid ${isDark ? '#4C3580' : '#C4B5FD'}`,
              }}
            >
              <span style={{ fontSize: '0.78rem', color: '#7C3AED', fontWeight: 700 }}>
                {puzzle.letterCount} letters
              </span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Clue */}
          <div
            className="rounded-2xl p-5 text-center mb-6"
            style={{ background: T.clueBg, border: `2px solid ${T.clueAreaBorder}` }}
          >
            <p
              style={{
                fontSize: '0.75rem',
                color: T.textFaint,
                fontWeight: 700,
                textTransform: 'uppercase',
                marginBottom: 8,
                letterSpacing: '0.05em',
              }}
            >
              Today's clue
            </p>
            <p
              style={{
                fontFamily: "'Nunito', sans-serif",
                fontSize: 'clamp(1rem, 3vw, 1.15rem)',
                color: T.text,
                fontWeight: 700,
                lineHeight: 1.7,
              }}
            >
              "{puzzle.clue}"
            </p>
          </div>

          {/* Answer boxes preview */}
          <div className="flex gap-2 justify-center mb-6">
            {[...Array(puzzle.letterCount)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3 + i * 0.07, type: 'spring', stiffness: 400 }}
                className="rounded-xl border-2 flex items-center justify-center"
                style={{
                  width: 48,
                  height: 48,
                  borderColor: isDark ? '#4C3580' : '#C4B5FD',
                  background: isDark ? '#261845' : '#F5F0FF',
                }}
              >
                <span
                  style={{
                    fontFamily: "'Fredoka One', cursive",
                    color: isDark ? '#4C3580' : '#C4B5FD',
                    fontSize: '1.4rem',
                  }}
                >
                  ?
                </span>
              </motion.div>
            ))}
          </div>

          {/* CTA Button */}
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={onNavigate}
            className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all"
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
              color: 'white',
              fontFamily: "'Nunito', sans-serif",
              fontWeight: 800,
              fontSize: '1.05rem',
            }}
          >
            <Zap size={19} /> Solve Today's Clue
          </motion.button>

          {/* Next puzzle countdown */}
          <div className="mt-4 flex justify-center">
            <NextPuzzleCountdown isDark={isDark} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── STATS STRIP ──────────────────────────────────────────────────────────────

function StatsStrip({ isDark }: { isDark: boolean }) {
  const T = getTheme(isDark);
  const { count, totalSolved, xp, level } = useStreak();
  const { label: levelLabel } = getXPToNextLevel(xp);
  const title = getLevelTitle(level);

  const stats = [
    { icon: '🔥', value: count.toString(), label: 'Day Streak', color: '#EA580C' },
    { icon: '🧩', value: totalSolved.toString(), label: 'Puzzles Solved', color: '#7C3AED' },
    { icon: '⚡', value: `${xp} XP`, label: levelLabel, color: '#0EA5E9' },
    { icon: '🏅', value: title.split(' ')[0], label: 'Rank', color: '#D97706' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="flex flex-wrap gap-3 justify-center mt-6"
    >
      {stats.map((s, i) => (
        <motion.div
          key={i}
          whileHover={{ y: -3, scale: 1.04 }}
          transition={{ type: 'spring', stiffness: 400 }}
          className="flex flex-col items-center gap-1 rounded-3xl px-5 py-4 shadow-sm border"
          style={{ background: T.cardBg, borderColor: T.cardBorder }}
        >
          <span className="text-2xl">{s.icon}</span>
          <span
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: '1.4rem',
              color: s.color,
            }}
          >
            {s.value}
          </span>
          <span style={{ fontSize: '0.75rem', color: T.textMuted, fontWeight: 600 }}>
            {s.label}
          </span>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ─── NEW PLAYER JOURNEY ───────────────────────────────────────────────────────

function NewPlayerJourney({ onNavigate, isDark }: { onNavigate: () => void; isDark: boolean }) {
  const T = getTheme(isDark);
  const [isExpanded, setIsExpanded] = useState(false);

  const steps = [
    {
      num: '1',
      emoji: '📖',
      title: 'Read the clue',
      desc: 'Every cryptic clue has two paths to the answer: a straight definition AND wordplay.',
      color: '#3B82F6',
      bg: '#EFF6FF',
      dbg: '#0D1F35',
    },
    {
      num: '2',
      emoji: '🚦',
      title: 'Spot the indicator',
      desc: 'Signal words like "mixed up" or "back" tell you what trick is being used.',
      color: '#7C3AED',
      bg: '#F5F0FF',
      dbg: '#1A0F35',
    },
    {
      num: '3',
      emoji: '🔧',
      title: 'Work the wordplay',
      desc: 'Rearrange, hide, reverse or remove letters as instructed.',
      color: '#F97316',
      bg: '#FFF7ED',
      dbg: '#2A1505',
    },
    {
      num: '4',
      emoji: '✅',
      title: 'Confirm with the definition',
      desc: "Your answer should match both the wordplay AND the plain definition. That's the double-check!",
      color: '#059669',
      bg: '#ECFDF5',
      dbg: '#062010',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="max-w-lg mx-auto w-full rounded-3xl border-2 overflow-hidden shadow-sm"
      style={{ background: T.cardBg, borderColor: isDark ? '#3D2A6B' : '#C4B5FD' }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-4 p-5 text-left transition-colors"
        style={{ background: isDark ? '#261845' : '#F5F0FF' }}
      >
        <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-[#7C3AED] flex-shrink-0">
          <span className="text-xl">🦉</span>
        </div>
        <div className="flex-1">
          <p
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: '1rem',
              color: isDark ? '#C4B5FD' : '#5B21B6',
              marginBottom: 2,
            }}
          >
            New to cryptics? Start here!
          </p>
          <p style={{ fontSize: '0.8rem', color: T.textMuted, fontWeight: 600 }}>
            Learn to crack clues in 4 easy steps
          </p>
        </div>
        <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronRight size={20} style={{ color: isDark ? '#A78BFA' : '#7C3AED' }} />
        </motion.div>
      </button>

      <motion.div
        initial={false}
        animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
        className="overflow-hidden"
      >
        <div className="p-5 space-y-3">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={isExpanded ? { opacity: 1, x: 0 } : { opacity: 0, x: -12 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-start gap-3 rounded-2xl p-3"
              style={{
                background: isDark ? step.dbg : step.bg,
                border: `1.5px solid ${step.color}33`,
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{
                  background: step.color,
                  color: 'white',
                  fontFamily: "'Fredoka One', cursive",
                  fontSize: '0.9rem',
                }}
              >
                {step.num}
              </div>
              <div>
                <p
                  style={{
                    fontFamily: "'Fredoka One', cursive",
                    fontSize: '0.95rem',
                    color: step.color,
                    marginBottom: 2,
                  }}
                >
                  {step.emoji} {step.title}
                </p>
                <p style={{ fontSize: '0.82rem', color: T.textSub, lineHeight: 1.6 }}>
                  {step.desc}
                </p>
              </div>
            </motion.div>
          ))}
          <motion.button
            initial={{ opacity: 0 }}
            animate={isExpanded ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={onNavigate}
            className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 mt-2 transition-all"
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
              color: 'white',
              fontFamily: "'Nunito', sans-serif",
              fontWeight: 800,
              fontSize: '0.92rem',
            }}
          >
            <BookOpen size={16} /> Full Learning Guide
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── HOW IT WORKS ─────────────────────────────────────────────────────────────

function HowItWorks({ isDark }: { isDark: boolean }) {
  const T = getTheme(isDark);
  const steps = [
    {
      emoji: '🔍',
      title: 'Read the Clue',
      desc: 'Every cryptic clue has two parts: a definition and wordplay.',
    },
    {
      emoji: '🧩',
      title: 'Decode the Wordplay',
      desc: 'Spot anagram indicators, hidden words, and other tricks.',
    },
    {
      emoji: '💡',
      title: 'Use Hints',
      desc: 'Stuck? Our hints reveal the clue step-by-step without spoiling everything.',
    },
    {
      emoji: '🎉',
      title: 'Celebrate!',
      desc: 'Solve it and share your result — just like Wordle, but nerdier.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h2
          style={{
            fontFamily: "'Fredoka One', cursive",
            fontSize: '1.8rem',
            color: isDark ? '#C4B5FD' : '#1E1B4B',
          }}
        >
          How it works
        </h2>
        <p style={{ color: T.textMuted, fontWeight: 600, marginTop: 4, fontSize: '0.95rem' }}>
          Four simple steps to cryptic crossword mastery
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -4 }}
            className="rounded-3xl p-6 text-center shadow-sm border"
            style={{ background: T.cardBg, borderColor: T.cardBorder }}
          >
            <div className="text-3xl mb-3">{step.emoji}</div>
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{
                background: '#7C3AED',
                color: 'white',
                fontFamily: "'Fredoka One', cursive",
                fontSize: '0.85rem',
              }}
            >
              {i + 1}
            </div>
            <h3
              style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: '1.05rem',
                color: isDark ? '#C4B5FD' : '#1E1B4B',
                marginBottom: 6,
              }}
            >
              {step.title}
            </h3>
            <p style={{ fontSize: '0.83rem', color: T.textMuted, lineHeight: 1.6 }}>{step.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── WORDPLAY TYPES PREVIEW ───────────────────────────────────────────────────

function WordplayPreview({ onNavigate, isDark }: { onNavigate: () => void; isDark: boolean }) {
  const T = getTheme(isDark);
  const topics = [
    {
      icon: '🔀',
      title: 'Anagram',
      color: '#A78BFA',
      bg: '#F5F0FF',
      dbg: '#1A0F35',
      desc: 'Letters scrambled to form a new word',
    },
    {
      icon: '📝',
      title: 'Double Def',
      color: '#34D399',
      bg: '#ECFDF5',
      dbg: '#062015',
      desc: 'Two separate definitions, one answer',
    },
    {
      icon: '🔄',
      title: 'Reversal',
      color: '#38BDF8',
      bg: '#F0F9FF',
      dbg: '#021520',
      desc: 'Read a word backwards for the answer',
    },
    {
      icon: '🎙️',
      title: 'Homophone',
      color: '#FB923C',
      bg: '#FFF7ED',
      dbg: '#1A0A00',
      desc: 'The answer sounds like another word',
    },
    {
      icon: '👻',
      title: 'Hidden Word',
      color: '#F472B6',
      bg: '#FDF2F8',
      dbg: '#1F0818',
      desc: 'Answer concealed within the clue',
    },
    {
      icon: '✂️',
      title: 'Deletion',
      color: '#FBBF24',
      bg: '#FFFBEB',
      dbg: '#1A1000',
      desc: 'Remove letters to find the answer',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 pb-16">
      <div className="flex items-center justify-between mb-6">
        <h2
          style={{
            fontFamily: "'Fredoka One', cursive",
            fontSize: '1.8rem',
            color: isDark ? '#C4B5FD' : '#1E1B4B',
          }}
        >
          Types of Wordplay
        </h2>
        <button
          onClick={onNavigate}
          className="flex items-center gap-1.5 text-sm font-bold transition-colors"
          style={{
            color: '#7C3AED',
            fontFamily: "'Nunito', sans-serif",
          }}
        >
          Learn all <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {topics.map((topic, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={onNavigate}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
            className="rounded-2xl p-4 cursor-pointer border-2 transition-all shadow-sm"
            style={{
              background: isDark ? topic.dbg : topic.bg,
              borderColor: topic.color + '44',
            }}
          >
            <div className="text-2xl mb-2">{topic.icon}</div>
            <h3
              style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: '1rem',
                color: topic.color,
                marginBottom: 4,
              }}
            >
              {topic.title}
            </h3>
            <p style={{ fontSize: '0.78rem', color: T.textMuted, lineHeight: 1.5 }}>{topic.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── ACHIEVEMENT TOAST ────────────────────────────────────────────────────────

function LeaderboardTeaser({ isDark }: { isDark: boolean }) {
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
      className="max-w-2xl mx-auto px-4 pb-16"
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

// ─── BOTTOM CTA ───────────────────────────────────────────────────────────────

function BottomCTA({ onNavigate, isDark: _isDark }: { onNavigate: () => void; isDark: boolean }) {
  return (
    <div className="relative z-10 px-4 pb-16">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-3xl p-8 text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)' }}
        >
          <div
            className="absolute top-0 right-0 opacity-10 text-[120px] select-none"
            style={{ fontFamily: "'Fredoka One', cursive", color: 'white', lineHeight: 1 }}
          >
            ?
          </div>
          <div className="relative z-10">
            <div className="flex justify-center mb-4">
              <Mascot mood="hint" size={80} animate={false} />
            </div>
            <h2
              style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: '1.7rem',
                color: 'white',
                marginBottom: 8,
              }}
            >
              Ready to become a cryptic master?
            </h2>
            <p
              style={{
                color: 'rgba(255,255,255,0.85)',
                fontWeight: 600,
                marginBottom: 20,
                fontSize: '0.95rem',
              }}
            >
              Start with our beginner guide — we promise it's not as scary as it sounds!
            </p>
            <button
              onClick={onNavigate}
              className="px-8 py-3 rounded-full bg-white hover:bg-[#F5F0FF] transition-all font-bold"
              style={{
                color: '#7C3AED',
                fontFamily: "'Nunito', sans-serif",
                fontSize: '0.95rem',
                fontWeight: 800,
              }}
            >
              Start Learning →
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ─── MAIN HOME ────────────────────────────────────────────────────────────────

export function Home() {
  const navigate = useNavigate();
  const { isDark } = useDarkMode();
  const { isSignedIn } = useAuth();
  const T = getTheme(isDark);
  const [todaysPuzzle, setTodaysPuzzle] = useState<TodayPuzzleData>(FALLBACK_PUZZLE);

  useEffect(() => {
    const isoDate = new Date().toISOString().split('T')[0];
    const cacheKey = `tco-puzzle-${isoDate}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      try {
        const p = JSON.parse(cached);
        setTodaysPuzzle({ number: p.number, clue: p.clue_text, letterCount: p.answer_length });
        return;
      } catch (e) {
        localStorage.removeItem(cacheKey);
      }
    }

    fetchPuzzleByDate(isoDate).then(p => {
      if (p) {
        setTodaysPuzzle({ number: p.number, clue: p.clue_text, letterCount: p.answer_length });
        localStorage.setItem(cacheKey, JSON.stringify(p));
      }
    });
  }, []);

  return (
    <div className="relative overflow-hidden">
      <FloatingBg isDark={isDark} />

      {/* ── HERO: App tagline + Today's Puzzle ── */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 pt-8 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-6"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Star size={14} style={{ color: '#7C3AED' }} fill="#7C3AED" />
            <span
              style={{
                fontSize: '0.8rem',
                color: isDark ? '#A78BFA' : '#5B21B6',
                fontWeight: 700,
                fontFamily: "'Nunito', sans-serif",
              }}
            >
              One cryptic clue, every day
            </span>
            <Star size={14} style={{ color: '#7C3AED' }} fill="#7C3AED" />
          </div>
          <h1
            style={{
              fontFamily: "'Fredoka One', cursive",
              fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
              color: isDark ? '#F0EAFF' : '#1E1B4B',
              lineHeight: 1.2,
              marginBottom: 6,
            }}
          >
            Cryptic crosswords, <span style={{ color: '#7C3AED' }}>finally fun.</span>
          </h1>
          <p
            style={{
              fontSize: '0.95rem',
              color: T.textMuted,
              lineHeight: 1.6,
              fontWeight: 600,
              maxWidth: 440,
              margin: '0 auto',
            }}
          >
            Solve one clue a day, build your streak, and become a cryptic genius. No experience
            needed!
          </p>
        </motion.div>

        {/* ── Submission Prompt ────────────────────────────────────── */}
        {!isSignedIn && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-12 rounded-3xl p-6 border text-center flex flex-col md:flex-row items-center justify-between gap-6"
            style={{
              background: isDark ? '#1A1035' : '#F5F3FF',
              borderColor: isDark ? '#4C3580' : '#C4B5FD',
            }}
          >
            <div className="flex items-center gap-4 text-left">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: isDark ? '#2D1B69' : 'white' }}
              >
                <Send size={24} style={{ color: '#7C3AED' }} />
              </div>
              <div>
                <h3
                  style={{
                    fontFamily: "'Fredoka One', cursive",
                    fontSize: '1.1rem',
                    color: isDark ? '#F0EAFF' : '#1E1B4B',
                  }}
                >
                  Become a Contributor!
                </h3>
                <p style={{ color: T.textMuted, fontSize: '0.85rem', margin: 0 }}>
                  Sign in to submit your own cryptic clues for our daily rotation.
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/history')}
              className="px-6 py-3 rounded-2xl font-bold text-white whitespace-nowrap"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)' }}
            >
              Sign In to Start
            </motion.button>
          </motion.div>
        )}

        {/* TODAY'S PUZZLE — front and centre */}
        <TodaysPuzzleHero
          onNavigate={() => navigate('/puzzle')}
          isDark={isDark}
          puzzle={todaysPuzzle}
        />

        {/* Stats strip */}
        <StatsStrip isDark={isDark} />
      </div>

      {/* ── NEW PLAYER JOURNEY ── */}
      <div className="relative z-10 px-4 py-8">
        <NewPlayerJourney onNavigate={() => navigate('/learn')} isDark={isDark} />
      </div>

      {/* ── HOW IT WORKS ── */}
      <div className="relative z-10">
        <HowItWorks isDark={isDark} />
      </div>

      {/* ── ACHIEVEMENTS ── */}
      <LeaderboardTeaser isDark={isDark} />

      {/* ── WORDPLAY TYPES ── */}
      <div className="relative z-10">
        <WordplayPreview onNavigate={() => navigate('/learn')} isDark={isDark} />
      </div>

      {/* ── BOTTOM CTA ── */}
      <div className="relative z-10">
        <BottomCTA onNavigate={() => navigate('/learn')} isDark={isDark} />
      </div>
    </div>
  );
}
