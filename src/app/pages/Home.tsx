import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Mascot } from '../components/Mascot';
import { Zap, Star, Send, Clock } from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';
import { getTheme } from '../theme';
import { useEffect, useState } from 'react';
import { fetchPuzzleByDate, fetchAppLikesCount, addAppLike } from '../../lib/supabase';
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
                fontSize: 'clamp(0.95rem, 4vw, 1.15rem)',
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

// ─── HOW IT WORKS ───

function HowItWorks({ isDark }: { isDark: boolean }) {
  const T = getTheme(isDark);
  const steps = [
    {
      emoji: '🔍',
      title: 'Analyze the Clue',
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
    <div className="max-w-4xl mx-auto px-4 py-4">
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

// ─── BOTTOM CTA ───

function BottomCTA({ onNavigate, isDark: _isDark }: { onNavigate: () => void; isDark: boolean }) {
  return (
    <div className="relative z-10 px-4 pb-4">
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

// ─── APP LIKE BUTTON ─────────────────────────────────────────────────────────

function AppLikeButton({ isDark }: { isDark: boolean }) {
  const T = getTheme(isDark);
  const [count, setCount] = useState<number | null>(null);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user already liked this session (session-scoped to avoid re-voting on reload)
    setLiked(sessionStorage.getItem('tco-app-liked') === '1');
    fetchAppLikesCount().then(setCount);
  }, []);

  const handleLike = async () => {
    if (liked || loading) return;
    setLoading(true);
    const ok = await addAppLike();
    if (ok) {
      setLiked(true);
      sessionStorage.setItem('tco-app-liked', '1');
      setCount(c => (c ?? 0) + 1);
    }
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="flex items-center justify-center gap-3 py-4"
    >
      <motion.button
        onClick={handleLike}
        disabled={liked || loading}
        whileHover={liked ? {} : { scale: 1.08, y: -1 }}
        whileTap={liked ? {} : { scale: 0.92 }}
        className="flex items-center gap-2 px-5 py-2.5 rounded-full border-2 transition-all font-bold"
        style={{
          background: liked ? (isDark ? '#2A0F15' : '#FFF1F2') : isDark ? '#1A1035' : '#FFF7F7',
          borderColor: liked ? '#EF4444' : isDark ? '#3D2A6B' : '#FCA5A5',
          color: liked ? '#EF4444' : T.textMuted,
          cursor: liked ? 'default' : 'pointer',
          fontFamily: "'Nunito', sans-serif",
          fontSize: '0.88rem',
        }}
        aria-label={liked ? 'You liked this app' : 'Like this app'}
      >
        <span style={{ fontSize: '1.1rem' }}>{liked ? '❤️' : '🤍'}</span>
        <span>{liked ? 'You love it!' : 'Love this app?'}</span>
        {count !== null && (
          <span
            className="rounded-full px-2 py-0.5"
            style={{
              background: liked ? '#EF4444' : isDark ? '#261845' : '#EDE9FE',
              color: liked ? 'white' : isDark ? '#C4B5FD' : '#7C3AED',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            {count.toLocaleString()}
          </span>
        )}
      </motion.button>
    </motion.div>
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
      } catch {
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
    <div className="relative overflow-hidden pb-8" style={{ background: T.pageBg }}>
      <FloatingBg isDark={isDark} />

      {/* ── HERO: App tagline + Today's Puzzle ── */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 pt-8">
        <header className="text-center mb-10">
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
        </header>

        {/* TODAY'S PUZZLE — front and centre */}
        <TodaysPuzzleHero onNavigate={() => navigate('/')} isDark={isDark} puzzle={todaysPuzzle} />
      </div>

      {/* ── HOW IT WORKS ── */}
      <div className="relative z-10 pt-8">
        <HowItWorks isDark={isDark} />
      </div>

      {/* ── BOTTOM CTA ── */}
      <div className="relative z-10 my-8">
        <BottomCTA onNavigate={() => navigate('/learn')} isDark={isDark} />
      </div>

      {/* ── APP LIKES ── */}
      <div className="relative z-10">
        <AppLikeButton isDark={isDark} />
      </div>

      {/* ── SUBMISSION PROMPT: At the very end ── */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 pb-4">
        {!isSignedIn ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="rounded-3xl p-6 border text-center flex flex-col md:flex-row items-center justify-between gap-6"
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
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl p-6 border text-center flex flex-col md:flex-row items-center justify-between gap-6"
            style={{
              background: isDark ? '#1A1035' : '#F5F3FF',
              borderColor: isDark ? '#4C3580' : '#C4B5FD',
            }}
            onClick={() => navigate('/submit')}
          >
            <div className="flex items-center gap-4 text-left cursor-pointer group">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
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
                  Contribute a Clue
                </h3>
                <p style={{ color: T.textMuted, fontSize: '0.85rem', margin: 0 }}>
                  Share your cryptic creativity with the CrypticOwl community.
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 rounded-2xl font-bold text-white whitespace-nowrap"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)' }}
            >
              Submit Now
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
