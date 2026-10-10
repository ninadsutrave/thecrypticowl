import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { m, AnimatePresence } from 'motion/react';
import { Mascot } from '../components/Mascot';
import { Search, ChevronRight, Eye } from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';
import { getTheme, type Theme } from '../theme';
import learningData from '../data/learning_examples.json';

// ─── TYPES & CONSTANTS ────────────────────────────────────────────────────────

type CluePartKey = 'fodder' | 'indicator' | 'definition' | null;

interface CluePart {
  key: CluePartKey;
  label: string;
  emoji: string;
  desc: string;
  color: string;
}

interface WordplayBreakdown {
  label: string;
  text: string;
  color: string;
}

interface WordplayType {
  id: string;
  label: string;
  emoji: string;
  color: string;
  bg: string;
  bgDark: string;
  border: string;
  desc: string;
  clue: string;
  breakdown: WordplayBreakdown[];
  answer: string;
  visual: string[];
  visualAnswer: string[];
  indicators: string[];
}

interface CompoundStep {
  text: string;
  type: string;
}

interface CompoundExample {
  title: string;
  subtitle: string;
  emoji: string;
  mechanisms: string[];
  clue: string;
  steps: CompoundStep[];
  answer: string;
  tip: string;
}

interface Synonym {
  word: string;
  cryptic: string;
  note: string;
}

interface LearningData {
  partsOfClue: CluePart[];
  wordplayTypes: WordplayType[];
  compoundExamples: CompoundExample[];
  synonyms: Synonym[];
}

const data = learningData as LearningData;

const PART_COLORS: Record<
  string,
  { bg: string; bgDark: string; text: string; textDark: string; border: string }
> = {
  definition: {
    bg: '#EFF6FF',
    bgDark: '#0D1F35',
    text: '#1D4ED8',
    textDark: '#93C5FD',
    border: '#3B82F6',
  },
  indicator: {
    bg: '#F5F3FF',
    bgDark: '#1D1B26',
    text: '#5B21B6',
    textDark: '#C4B5FD',
    border: '#7C3AED',
  },
  fodder: {
    bg: '#FFF7ED',
    bgDark: '#2A1505',
    text: '#C2410C',
    textDark: '#FDBA74',
    border: '#F97316',
  },
  wordplay: {
    bg: '#ECFDF5',
    bgDark: '#062010',
    text: '#065F46',
    textDark: '#6EE7B7',
    border: '#10B981',
  },
};

/** Part ink for the current theme: the light inks fail contrast on the dark tints. */
const partText = (key: string, isDark: boolean) =>
  isDark ? PART_COLORS[key].textDark : PART_COLORS[key].text;

const CLUE_SEGMENTS = [
  { key: 'fodder', text: 'Stone' },
  { key: null, text: ' ' },
  { key: 'indicator', text: 'broken' },
  { key: null, text: ', becomes ' },
  { key: 'definition', text: 'musical sounds' },
  { key: null, text: ' (5)' },
] as { key: CluePartKey; text: string }[];

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function LetterBox({ letter, color, small }: { letter: string; color: string; small?: boolean }) {
  // Mobile-first sizing: tighter on small screens so long hidden-word examples
  // (10+ letters) don't overflow the viewport.
  const sizeClass = small
    ? 'w-6 h-6 sm:w-7 sm:h-7 text-[0.75rem] sm:text-[0.85rem]'
    : 'w-7 h-7 sm:w-9 sm:h-9 text-[0.85rem] sm:text-base';
  return (
    <div
      className={`rounded-xl flex items-center justify-center font-bold flex-shrink-0 ${sizeClass}`}
      style={{
        background: color + '22',
        border: `2px solid ${color}`,
        color,
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      {letter}
    </div>
  );
}

function PartsOfClue({ isDark }: { isDark: boolean }) {
  const [activePart, setActivePart] = useState<CluePartKey>(null);
  const T = getTheme(isDark);

  return (
    <div>
      <div
        className="rounded-2xl p-5 mb-5 border shadow-sm text-center"
        style={{ background: T.cardBg, borderColor: T.cardBorder }}
      >
        <p
          style={{
            fontSize: '0.8rem',
            color: T.textFaint,
            fontWeight: 700,
            marginBottom: 8,
            fontFamily: "'Nunito', sans-serif",
          }}
        >
          SAMPLE CLUE — CLICK THE CARDS BELOW
        </p>
        <p
          className="text-lg"
          style={{
            fontFamily: "'Nunito', sans-serif",
            fontWeight: 700,
            color: T.text,
            lineHeight: 1.8,
          }}
        >
          {CLUE_SEGMENTS.map((seg, i) => (
            <span
              key={i}
              style={
                seg.key && seg.key === activePart
                  ? {
                      background: isDark ? PART_COLORS[seg.key].bgDark : PART_COLORS[seg.key].bg,
                      color: partText(seg.key as string, isDark),
                      border: `2px solid ${PART_COLORS[seg.key].border}`,
                      borderRadius: 8,
                      padding: '2px 6px',
                      display: 'inline-block',
                      marginInline: 1,
                      fontWeight: 800,
                      transition: 'all 0.2s',
                    }
                  : seg.key
                    ? { opacity: activePart ? 0.4 : 1, transition: 'opacity 0.2s' }
                    : {}
              }
            >
              {seg.text}
            </span>
          ))}
        </p>
        {activePart === null && (
          <p
            style={{
              fontSize: '0.8rem',
              color: T.textFaint,
              marginTop: 8,
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            ☝️ Click a card below to highlight that part
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {data.partsOfClue.map((part: CluePart) => (
          <m.button
            key={part.key}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setActivePart(part.key === activePart ? null : part.key)}
            className="text-left p-4 rounded-2xl border-2 transition-all shadow-sm"
            style={{
              borderColor:
                activePart === part.key ? PART_COLORS[part.key as string].border : T.cardBorder,
              background:
                activePart === part.key
                  ? isDark
                    ? PART_COLORS[part.key as string].bgDark
                    : PART_COLORS[part.key as string].bg
                  : T.cardBg,
              boxShadow:
                activePart === part.key
                  ? `0 0 0 3px ${PART_COLORS[part.key as string].border}22`
                  : undefined,
            }}
          >
            <div className="text-2xl mb-2">{part.emoji}</div>
            <h3
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: '1rem',
                color: activePart === part.key ? partText(part.key as string, isDark) : T.text,
                marginBottom: 4,
              }}
            >
              {part.label}
            </h3>
            <p
              style={{
                fontSize: '0.8rem',
                color: activePart === part.key ? partText(part.key as string, isDark) : T.textMuted,
                lineHeight: 1.5,
              }}
            >
              {part.desc}
            </p>
          </m.button>
        ))}
      </div>
    </div>
  );
}

function WordplayTab({ type, isDark }: { type: WordplayType; isDark: boolean }) {
  const T = getTheme(isDark);

  return (
    <div className="space-y-4">
      <div
        className="p-4 rounded-2xl border-2"
        style={{
          borderColor: type.border,
          background: isDark ? type.bgDark : type.bg,
        }}
      >
        <p
          style={{
            fontSize: '0.9rem',
            color: T.bodyText,
            fontWeight: 600,
            lineHeight: 1.7,
            fontFamily: "'Nunito', sans-serif",
          }}
        >
          {type.desc}
        </p>
      </div>

      <div
        className="rounded-2xl p-4 border shadow-sm"
        style={{ background: T.cardBg, borderColor: T.cardBorder }}
      >
        <p
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: T.textFaint,
            marginBottom: 6,
            fontFamily: "'Nunito', sans-serif",
          }}
        >
          EXAMPLE CLUE
        </p>
        <p
          style={{
            fontFamily: "'Nunito', sans-serif",
            fontWeight: 700,
            color: T.text,
            fontSize: '0.95rem',
            marginBottom: 12,
          }}
        >
          {type.clue}
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {type.breakdown.map((b: WordplayBreakdown, i: number) => {
            const colors = PART_COLORS[b.color] || PART_COLORS.fodder;
            return (
              <div
                key={i}
                className="flex items-center gap-1.5 rounded-full px-3 py-1"
                style={{
                  background: isDark ? colors.bgDark : colors.bg,
                  border: `1.5px solid ${colors.border}`,
                }}
              >
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: isDark ? colors.textDark : colors.text,
                    fontFamily: "'Nunito', sans-serif",
                  }}
                >
                  {b.label}:
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    color: isDark ? colors.textDark : colors.text,
                    fontFamily: "'Nunito', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  {b.text}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:flex-wrap gap-3 sm:gap-2">
          <div className="flex gap-1 sm:gap-1.5 flex-wrap">
            {type.visual.map((l: string, i: number) => (
              <LetterBox key={i} letter={l} color={type.color} />
            ))}
          </div>
          <span
            className="hidden sm:inline"
            style={{
              color: type.color,
              fontFamily: "'Outfit', sans-serif",
              fontSize: '1.2rem',
              margin: '0 4px',
            }}
          >
            →
          </span>
          <span
            className="sm:hidden self-center"
            style={{
              color: type.color,
              fontFamily: "'Outfit', sans-serif",
              fontSize: '1.2rem',
            }}
          >
            ↓
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1 sm:gap-1.5 flex-wrap">
              {type.visualAnswer.map((l: string, i: number) => (
                <LetterBox key={i} letter={l} color="#059669" />
              ))}
            </div>
            <div
              className="rounded-full px-3 py-1"
              style={{ background: T.successBg, border: '1.5px solid #34D399' }}
            >
              <span
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  color: '#059669',
                  fontSize: '0.9rem',
                }}
              >
                {type.answer}
              </span>
            </div>
          </div>
        </div>
      </div>

      {type.indicators && type.indicators.length > 0 && (
        <div
          className="rounded-2xl p-4 border"
          style={{ background: isDark ? type.bgDark : type.bg, borderColor: type.border }}
        >
          <p
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: type.color,
              marginBottom: 8,
              fontFamily: "'Nunito', sans-serif",
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Common indicator words
          </p>
          <div className="flex flex-wrap gap-2">
            {type.indicators.map((w: string, i: number) => (
              <span
                key={i}
                className="px-3 py-1 rounded-full text-sm font-semibold"
                style={{
                  background: isDark ? '#00000030' : '#ffffff60',
                  color: type.color,
                  border: `1.5px solid ${type.border}`,
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                {w}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WordplayPreview({
  isDark,
  onSelect,
}: {
  isDark: boolean;
  onSelect: (id: string) => void;
}) {
  const T = getTheme(isDark);

  return (
    <div className="max-w-4xl mx-auto pb-4">
      <div className="flex items-center justify-between mb-6">
        <h2
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '1.8rem',
            color: T.heading,
          }}
        >
          Types of Wordplay
        </h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {data.wordplayTypes.map((topic: WordplayType, i) => (
          <m.div
            key={i}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
            onClick={() => onSelect(topic.id)}
            className="rounded-2xl p-4 cursor-pointer border-2 transition-all shadow-sm"
            style={{
              background: isDark ? topic.bgDark : topic.bg,
              borderColor: topic.color + '44',
            }}
          >
            <div className="text-2xl mb-2">{topic.emoji}</div>
            <h3
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: '1rem',
                color: topic.color,
                marginBottom: 4,
              }}
            >
              {topic.label}
            </h3>
            <p style={{ fontSize: '0.78rem', color: T.textMuted, lineHeight: 1.5 }}>{topic.desc}</p>
          </m.div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN LEARN PAGE ──────────────────────────────────────────────────────────

/**
 * Tabs in reading order. `index` is the panel each shows; `key` is its
 * deep link (e.g. /learn#examples).
 */
const TABS = [
  { key: 'intro', label: 'Intro', index: 0 },
  { key: 'parts', label: 'Parts', index: 1 },
  { key: 'wordplay', label: 'Wordplay', index: 2 },
  { key: 'examples', label: 'Sample clues', index: 3 },
  { key: 'cheatsheet', label: 'Cheat sheet', index: 4 },
];

function CompoundExampleCard({
  ex,
  isDark,
  T,
}: {
  ex: CompoundExample;
  isDark: boolean;
  T: Theme;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div
      className="rounded-3xl p-6 border shadow-sm flex flex-col"
      style={{ background: T.cardBg, borderColor: T.cardBorder }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl">{ex.emoji}</div>
        <div>
          <h3
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '1.1rem',
              color: T.text,
            }}
          >
            {ex.title}
          </h3>
          <p style={{ fontSize: '0.8rem', color: T.textMuted }}>{ex.subtitle}</p>
        </div>
      </div>

      <div
        className="rounded-2xl p-4 mb-4"
        style={{
          background: T.indicatorBg,
          border: '1.5px solid #7C3AED',
        }}
      >
        <p
          style={{
            fontFamily: "'Nunito', sans-serif",
            fontWeight: 700,
            fontSize: '0.95rem',
            color: T.text,
            lineHeight: 1.6,
          }}
        >
          {ex.clue}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!revealed ? (
          <m.div
            key="hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-grow flex items-center justify-center py-8"
          >
            <button
              onClick={() => setRevealed(true)}
              className="px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all hover:scale-105"
              style={{
                background: isDark ? '#2F2C3D' : '#F5F3FF',
                border: `2px solid ${isDark ? '#7C3AED' : '#C4B5FD'}`,
                color: T.brandText,
                fontFamily: "'Nunito', sans-serif",
                fontWeight: 800,
              }}
            >
              <Eye size={18} />
              Reveal Explanation
            </button>
          </m.div>
        ) : (
          <m.div
            key="revealed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col flex-grow"
          >
            <div className="space-y-3 flex-grow mb-4">
              {ex.steps.map((step: CompoundStep, si: number) => (
                <div key={si} className="flex items-start gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[0.65rem] font-bold mt-0.5 flex-shrink-0"
                    style={{
                      background: PART_COLORS[step.type]?.bg || '#7C3AED',
                      color: PART_COLORS[step.type]?.text || 'white',
                      border: `1.5px solid ${PART_COLORS[step.type]?.border || '#7C3AED'}`,
                    }}
                  >
                    {si + 1}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: T.text, lineHeight: 1.5 }}>{step.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-4 border-t" style={{ borderColor: T.cardBorder }}>
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: T.textFaint }}
                >
                  Answer
                </span>
                <span
                  className="font-black text-lg"
                  style={{ color: '#059669', fontFamily: "'Outfit', sans-serif" }}
                >
                  {ex.answer}
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: T.textMuted, fontStyle: 'italic' }}>
                💡 {ex.tip}
              </p>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Learn() {
  const { hash } = useLocation();
  const [activeSection, setActiveSection] = useState(
    () => TABS.find(t => `#${t.key}` === hash)?.index ?? 0
  );
  // Follow links to a tab while already on the page.
  useEffect(() => {
    const tab = TABS.find(t => `#${t.key}` === hash);
    if (tab) setActiveSection(tab.index);
  }, [hash]);
  const openTab = (index: number) => {
    setActiveSection(index);
    const key = TABS.find(t => t.index === index)?.key;
    if (key) window.history.replaceState(null, '', `#${key}`);
  };
  const [activeWordplayTab, setActiveWordplayTab] = useState(learningData.wordplayTypes[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);

  const currentWordplay = learningData.wordplayTypes.find(t => t.id === activeWordplayTab);

  useEffect(() => {
    document.title = 'How to solve cryptic crosswords · The Cryptic Owl';
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 pb-20">
      {/* Header */}
      <div className="pt-12 pb-8 text-center">
        <div className="flex justify-center mb-6">
          <Mascot
            mood="thinking"
            size={90}
            speechBubble="Let's crack the code together! 🔍"
            bubbleDirection="right"
            animate
          />
        </div>
        <h1
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '2.2rem',
            color: T.heading,
            marginBottom: 8,
          }}
        >
          Learn Cryptics
        </h1>
        <p style={{ color: T.textMuted, fontWeight: 600, fontSize: '1rem' }}>
          Your beginner's guide to cryptic crossword clues
        </p>
      </div>

      {/* Section Nav */}
      <div
        className="sticky top-16 z-30 py-3 mb-8"
        style={{ background: T.stickyNavBg, backdropFilter: 'blur(12px)' }}
      >
        <div
          className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar [mask-image:linear-gradient(to_right,black_85%,transparent)] sm:[mask-image:none]"
          role="tablist"
          aria-label="Guide sections"
          onKeyDown={e => {
            // Arrow keys move between tabs, as screen-reader users expect.
            const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
            if (!step) return;
            e.preventDefault();
            const next = (activeSection + step + TABS.length) % TABS.length;
            openTab(next);
            document.getElementById(`learn-tab-${next}`)?.focus();
          }}
        >
          {TABS.map(({ key, label, index: i }) => (
            <m.button
              key={key}
              id={`learn-tab-${i}`}
              role="tab"
              aria-selected={activeSection === i}
              aria-controls="learn-panel"
              tabIndex={activeSection === i ? 0 : -1}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => openTab(i)}
              className="flex-shrink-0 px-4 py-2 rounded-full text-sm transition-all"
              style={{
                fontFamily: "'Nunito', sans-serif",
                fontWeight: 700,
                background: activeSection === i ? '#7C3AED' : T.cardBg,
                color: activeSection === i ? 'white' : T.brandText,
                border: `2px solid ${activeSection === i ? '#7C3AED' : isDark ? '#393547' : '#EDE9FE'}`,
                boxShadow: activeSection === i ? '0 4px 12px rgba(124,58,237,0.3)' : undefined,
              }}
            >
              {label}
            </m.button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <m.div
          key={activeSection}
          id="learn-panel"
          role="tabpanel"
          aria-labelledby={`learn-tab-${activeSection}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.25 }}
        >
          {/* ── SECTION 1: Intro ── */}
          {activeSection === 0 && (
            <div className="space-y-6">
              <div
                className="rounded-3xl p-8 border shadow-sm"
                style={{ background: T.cardBg, borderColor: T.cardBorder }}
              >
                <h2
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '1.6rem',
                    color: T.heading,
                    marginBottom: 16,
                  }}
                >
                  What is a Cryptic Clue? 🧩
                </h2>
                <div className="space-y-4" style={{ color: T.textMuted, lineHeight: 1.8 }}>
                  <p>
                    A cryptic clue is like a little word puzzle within a puzzle. Unlike regular
                    crossword clues which are simple synonyms,{' '}
                    <strong>every cryptic clue has two parts</strong>:
                  </p>
                  <div className="mt-4 flex flex-col sm:flex-row gap-3">
                    <div
                      className="flex-1 rounded-2xl p-4"
                      style={{
                        background: T.definitionBg,
                        border: '2px solid #3B82F6',
                      }}
                    >
                      <p
                        style={{
                          fontFamily: "'Outfit', sans-serif",
                          color: T.definitionText,
                          fontSize: '1rem',
                          marginBottom: 4,
                        }}
                      >
                        1. The Definition
                      </p>
                      <p
                        style={{
                          fontSize: '0.85rem',
                          color: isDark ? '#93C5FD' : '#1E40AF',
                          lineHeight: 1.6,
                        }}
                      >
                        A straightforward clue to the answer, always at the very start or end of the
                        clue.
                      </p>
                    </div>
                    <div
                      className="flex-1 rounded-2xl p-4"
                      style={{
                        background: T.fodderBg,
                        border: '2px solid #F97316',
                      }}
                    >
                      <p
                        style={{
                          fontFamily: "'Outfit', sans-serif",
                          color: T.fodderText,
                          fontSize: '1rem',
                          marginBottom: 4,
                        }}
                      >
                        2. The Wordplay
                      </p>
                      <p
                        style={{
                          fontSize: '0.85rem',
                          color: isDark ? '#FED7AA' : '#9A3412',
                          lineHeight: 1.6,
                        }}
                      >
                        A clever trick — anagram, hidden word, reversal — that arrives at the same
                        answer differently.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="rounded-3xl p-6 border shadow-sm"
                style={{ background: T.cardBg, borderColor: T.cardBorder }}
              >
                <h3
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '1.2rem',
                    color: T.heading,
                    marginBottom: 4,
                  }}
                >
                  The Golden Rule
                </h3>
                <div
                  className="rounded-2xl p-4 mb-4"
                  style={{
                    background: isDark ? '#26242F' : '#F9F7FF',
                    border: `2px dashed ${T.brandBorder}`,
                  }}
                >
                  <p
                    style={{
                      fontFamily: "'Nunito', sans-serif",
                      fontWeight: 700,
                      fontSize: '1.05rem',
                      color: T.text,
                      textAlign: 'center',
                    }}
                  >
                    <span
                      style={{
                        background: T.fodderBg,
                        color: T.fodderText,
                        border: '1.5px solid #F97316',
                        borderRadius: 6,
                        padding: '1px 5px',
                      }}
                    >
                      Stone
                    </span>{' '}
                    <span
                      style={{
                        background: T.indicatorBg,
                        color: T.indicatorText,
                        border: '1.5px solid #7C3AED',
                        borderRadius: 6,
                        padding: '1px 5px',
                      }}
                    >
                      broken
                    </span>
                    {', becomes '}
                    <span
                      style={{
                        background: T.definitionBg,
                        color: T.definitionText,
                        border: '1.5px solid #3B82F6',
                        borderRadius: 6,
                        padding: '1px 5px',
                      }}
                    >
                      musical sounds
                    </span>{' '}
                    (5)"
                  </p>
                </div>
                <div className="space-y-2">
                  {[
                    { dot: '#3B82F6', text: '"musical sounds" is the definition (= TONES)' },
                    { dot: '#7C3AED', text: '"broken" tells you to make an anagram' },
                    {
                      dot: '#F97316',
                      text: '"Stone" is the fodder — rearrange its letters → TONES!',
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div
                        className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                        style={{ background: item.dot }}
                      />
                      <p
                        style={{
                          fontSize: '0.88rem',
                          color: T.bodyText,
                          lineHeight: 1.6,
                        }}
                      >
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => openTab(1)}
                className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
                  color: 'white',
                  fontFamily: "'Nunito', sans-serif",
                  fontWeight: 800,
                }}
              >
                Learn the Anatomy of a Clue <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* ── SECTION 2: Parts ── */}
          {activeSection === 1 && (
            <div className="space-y-8">
              <div>
                <h2
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '1.5rem',
                    color: T.heading,
                    marginBottom: 4,
                  }}
                >
                  Anatomy of a Clue 🔬
                </h2>
                <p style={{ fontSize: '0.9rem', color: T.textMuted, fontWeight: 600 }}>
                  Cryptic clues are built from these three fundamental parts.
                </p>
              </div>

              <PartsOfClue isDark={isDark} />

              <button
                onClick={() => openTab(2)}
                className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
                  color: 'white',
                  fontFamily: "'Nunito', sans-serif",
                  fontWeight: 800,
                }}
              >
                Explore Wordplay Types <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* ── SECTION 2: Wordplay Deep Dive ── */}
          {activeSection === 2 && (
            <div className="space-y-8">
              <WordplayPreview
                isDark={isDark}
                onSelect={id => {
                  setActiveWordplayTab(id);
                  const el = document.getElementById('wordplay-content');
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              />

              <div id="wordplay-content" className="pt-4">
                <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar mb-6">
                  {learningData.wordplayTypes.map(type => (
                    <button
                      key={type.id}
                      onClick={() => setActiveWordplayTab(type.id)}
                      className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all border-2"
                      style={{
                        background: activeWordplayTab === type.id ? type.color : T.cardBg,
                        color: activeWordplayTab === type.id ? 'white' : type.color,
                        borderColor: activeWordplayTab === type.id ? type.color : type.color + '22',
                        fontFamily: "'Nunito', sans-serif",
                      }}
                    >
                      {type.emoji} {type.label}
                    </button>
                  ))}
                </div>

                {currentWordplay && <WordplayTab type={currentWordplay} isDark={isDark} />}
              </div>

              <button
                onClick={() => openTab(3)}
                className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
                  color: 'white',
                  fontFamily: "'Nunito', sans-serif",
                  fontWeight: 800,
                }}
              >
                See sample clues <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* ── SECTION 4: Compound Examples ── */}
          {activeSection === 3 && (
            <div className="space-y-8">
              <div>
                <h2
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '1.5rem',
                    color: T.heading,
                    marginBottom: 4,
                  }}
                >
                  Compound Clues �
                </h2>
                <p style={{ fontSize: '0.9rem', color: T.textMuted, fontWeight: 600 }}>
                  Real-world clues often combine multiple mechanisms.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {learningData.compoundExamples.map((ex, i) => (
                  <CompoundExampleCard key={i} ex={ex} isDark={isDark} T={T} />
                ))}
              </div>

              <button
                onClick={() => openTab(4)}
                className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
                  color: 'white',
                  fontFamily: "'Nunito', sans-serif",
                  fontWeight: 800,
                }}
              >
                View Synonyms Cheat Sheet <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* ── SECTION 5: Synonyms Cheat Sheet ── */}
          {activeSection === 4 && (
            <div className="space-y-6">
              <div>
                <h2
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '1.5rem',
                    color: T.heading,
                    marginBottom: 4,
                  }}
                >
                  The Cheat Sheet 📚
                </h2>
                <p style={{ fontSize: '0.9rem', color: T.textMuted, fontWeight: 600 }}>
                  Common cryptic substitutions you'll see everywhere.
                </p>
              </div>

              <div className="relative mb-6">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  size={18}
                  style={{ color: T.textFaint }}
                />
                <input
                  type="text"
                  placeholder="Search common synonyms..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 transition-all outline-none"
                  style={{
                    background: T.cardBg,
                    borderColor: T.cardBorder,
                    color: T.text,
                    fontFamily: "'Nunito', sans-serif",
                  }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.synonyms
                  .filter(
                    (s: Synonym) =>
                      s.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      s.cryptic.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .sort((a: Synonym, b: Synonym) => {
                    if (a.note === 'NATO Phonetic' && b.note !== 'NATO Phonetic') return -1;
                    if (a.note !== 'NATO Phonetic' && b.note === 'NATO Phonetic') return 1;
                    return 0;
                  })
                  .map((s: Synonym, i: number) => (
                    <div
                      key={i}
                      className="p-4 rounded-2xl border flex items-center justify-between group transition-all"
                      style={{ background: T.cardBg, borderColor: T.cardBorder }}
                    >
                      <div className="flex flex-col">
                        <div
                          style={{
                            fontSize: '1.25rem',
                            fontFamily: "'Outfit', sans-serif",
                            color: T.brandStrong,
                            lineHeight: 1.2,
                          }}
                        >
                          {s.word}
                        </div>
                        <div
                          className="text-[0.7rem] font-bold uppercase tracking-wider mt-1"
                          style={{ color: T.textFaint }}
                        >
                          {s.note}
                        </div>
                      </div>
                      <div
                        className="text-lg font-black"
                        style={{
                          color: '#059669',
                          fontFamily: "'Outfit', sans-serif",
                        }}
                      >
                        {s.cryptic}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </m.div>
      </AnimatePresence>
    </div>
  );
}
