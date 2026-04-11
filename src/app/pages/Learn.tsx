import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mascot } from '../components/Mascot';
import { Search, ChevronRight } from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';
import { getTheme } from '../theme';
import learningData from '../data/learning_examples.json';

// ─── TYPES & CONSTANTS ────────────────────────────────────────────────────────

type CluePartKey = 'fodder' | 'indicator' | 'definition' | null;

const PART_COLORS: Record<string, { bg: string; bgDark: string; text: string; border: string }> = {
  definition: { bg: '#EFF6FF', bgDark: '#0D1F35', text: '#1D4ED8', border: '#3B82F6' },
  indicator: { bg: '#F5F3FF', bgDark: '#1A0F35', text: '#5B21B6', border: '#7C3AED' },
  fodder: { bg: '#FFF7ED', bgDark: '#2A1505', text: '#C2410C', border: '#F97316' },
  wordplay: { bg: '#ECFDF5', bgDark: '#062010', text: '#065F46', border: '#10B981' },
};

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
  return (
    <div
      className="rounded-xl flex items-center justify-center font-bold"
      style={{
        width: small ? 28 : 36,
        height: small ? 28 : 36,
        background: color + '22',
        border: `2px solid ${color}`,
        color,
        fontFamily: "'Fredoka One', cursive",
        fontSize: small ? '0.85rem' : '1rem',
        flexShrink: 0,
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
                      color: PART_COLORS[seg.key].text,
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
        {learningData.partsOfClue.map(part => (
          <motion.button
            key={part.key}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() =>
              setActivePart(activePart === part.key ? null : (part.key as CluePartKey))
            }
            className="text-left p-4 rounded-2xl border-2 transition-all"
            style={{
              borderColor:
                activePart === part.key
                  ? PART_COLORS[part.color].border
                  : isDark
                    ? '#3D2A6B'
                    : '#EDE9FE',
              background:
                activePart === part.key
                  ? isDark
                    ? PART_COLORS[part.color].bgDark
                    : PART_COLORS[part.color].bg
                  : T.cardBg,
              boxShadow:
                activePart === part.key
                  ? `0 0 0 3px ${PART_COLORS[part.color].border}22`
                  : undefined,
            }}
          >
            <div className="text-2xl mb-2">{part.emoji}</div>
            <h3
              style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: '1rem',
                color: PART_COLORS[part.color].text,
                marginBottom: 4,
              }}
            >
              {part.label}
            </h3>
            <p
              style={{ fontSize: '0.8rem', color: isDark ? '#9381CC' : '#6B7280', lineHeight: 1.5 }}
            >
              {part.desc}
            </p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function WordplayTab({ type, isDark }: { type: any; isDark: boolean }) {
  const T = getTheme(isDark);
  return (
    <div className="space-y-4">
      <div
        className="p-4 rounded-2xl border-2"
        style={{ borderColor: type.border, background: isDark ? type.bgDark : type.bg }}
      >
        <p
          style={{
            fontSize: '0.9rem',
            color: isDark ? '#C4B5FD' : '#374151',
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
          {type.breakdown.map((b: any, i: number) => {
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
                    color: colors.text,
                    fontFamily: "'Nunito', sans-serif",
                  }}
                >
                  {b.label}:
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    color: colors.text,
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

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1.5">
            {type.visual.map((l: string, i: number) => (
              <LetterBox key={i} letter={l} color={type.color} />
            ))}
          </div>
          <span
            style={{
              color: type.color,
              fontFamily: "'Fredoka One', cursive",
              fontSize: '1.2rem',
              margin: '0 4px',
            }}
          >
            →
          </span>
          <div className="flex gap-1.5">
            {type.visualAnswer.map((l: string, i: number) => (
              <LetterBox key={i} letter={l} color="#059669" />
            ))}
          </div>
          <div
            className="rounded-full px-3 py-1 ml-1"
            style={{ background: isDark ? '#062010' : '#ECFDF5', border: '1.5px solid #34D399' }}
          >
            <span
              style={{ fontFamily: "'Fredoka One', cursive", color: '#059669', fontSize: '0.9rem' }}
            >
              {type.answer}
            </span>
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
            fontFamily: "'Fredoka One', cursive",
            fontSize: '1.8rem',
            color: isDark ? '#C4B5FD' : '#1E1B4B',
          }}
        >
          Types of Wordplay
        </h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {learningData.wordplayTypes.map((topic, i) => (
          <motion.div
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
                fontFamily: "'Fredoka One', cursive",
                fontSize: '1rem',
                color: topic.color,
                marginBottom: 4,
              }}
            >
              {topic.label}
            </h3>
            <p style={{ fontSize: '0.78rem', color: T.textMuted, lineHeight: 1.5 }}>{topic.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

const COMPOUND_EXAMPLES = [
  {
    title: 'Charade',
    subtitle: 'Two abbreviations join end-to-end',
    emoji: '🔗',
    mechanisms: ['Abbreviation', 'Direct'],
    clue: '"Doctor on the sick list makes a boring tool (5)"',
    steps: [
      { text: 'Doctor → DR  (standard abbreviation)', type: 'indicator' as const },
      { text: 'Sick → ILL  (direct synonym)', type: 'fodder' as const },
      { text: 'DR + ILL = DRILL', type: 'definition' as const },
    ],
    answer: 'DRILL',
    tip: "In a charade, there's no single indicator word — each component points to itself.",
  },
  {
    title: 'Charade',
    subtitle: 'Direction abbreviation + animal synonym',
    emoji: '🔗',
    mechanisms: ['Direction', 'Synonym'],
    clue: '"Compass point before a great ape gives the back of the neck (4)"',
    steps: [
      { text: 'Compass point → N  (North)', type: 'indicator' as const },
      { text: 'Great ape → APE', type: 'fodder' as const },
      { text: 'N + APE = NAPE', type: 'definition' as const },
    ],
    answer: 'NAPE',
    tip: 'Compass points (N, S, E, W) are among the most common building blocks in cryptics.',
  },
  {
    title: 'Deletion + Reversal',
    subtitle: 'Remove a letter, then read backwards',
    emoji: '✂️🔄',
    mechanisms: ['Deletion', 'Reversal'],
    clue: '"Star without its head, turned around, is a rodent (3)"',
    steps: [
      { text: 'Word: STAR', type: 'fodder' as const },
      { text: '"Without its head" → remove S → TAR', type: 'indicator' as const },
      { text: '"Turned around" → reverse TAR → RAT ✓', type: 'definition' as const },
    ],
    answer: 'RAT',
    tip: 'Each indicator word does a separate job — "without its head" deletes, "turned around" reverses. Apply them in reading order.',
  },
  {
    title: 'Deletion + Anagram',
    subtitle: "Trim the word, then scramble what's left",
    emoji: '✂️🔀',
    mechanisms: ['Deletion', 'Anagram'],
    clue: '"Mostly earns, scrambled, means close (4)"',
    steps: [
      { text: 'Word: EARNS', type: 'fodder' as const },
      { text: '"Mostly" → remove last letter S → EARN', type: 'indicator' as const },
      { text: '"Scrambled" → anagram EARN → NEAR ✓', type: 'definition' as const },
    ],
    answer: 'NEAR',
    tip: '"Mostly" quietly removes the last letter. Then "scrambled" signals the anagram. Watch for these quiet deletion words.',
  },
  {
    title: 'Reversal + Hidden',
    subtitle: "Reverse the source word, then find what's inside",
    emoji: '🔄👻',
    mechanisms: ['Reversal', 'Hidden'],
    clue: '"Backwards in \'reward\' lies an equal contest (4)"',
    steps: [
      { text: '"Backwards" → reverse REWARD → DRAWER', type: 'indicator' as const },
      { text: '"In" → look for hidden word inside DRAWER', type: 'fodder' as const },
      { text: 'D-R-A-W-e-r → DRAW = a tied game ✓', type: 'definition' as const },
    ],
    answer: 'DRAW',
    tip: 'The two indicators work in order: first reverse, then extract the hidden word from the result.',
  },
];

// ─── SYNONYMS ─────────────────────────────────────────────────────────────────

const SYNONYMS = [
  { word: 'flower', cryptic: 'river', note: 'something that flows' },
  { word: 'doctor', cryptic: 'DR / MB / MD', note: 'medical title' },
  { word: 'east', cryptic: 'E', note: 'compass point' },
  { word: 'left', cryptic: 'L', note: 'compass / direction' },
  { word: 'north', cryptic: 'N', note: 'compass point' },
  { word: 'south', cryptic: 'S', note: 'compass point' },
  { word: 'west', cryptic: 'W', note: 'compass point' },
  { word: 'king', cryptic: 'K / R / ER', note: 'royalty' },
  { word: 'queen', cryptic: 'Q / HM / R', note: 'royalty' },
  { word: 'article', cryptic: 'A / AN / THE', note: 'grammar word' },
  { word: 'hundred', cryptic: 'C / TON', note: 'number' },
  { word: 'note', cryptic: 'A–G / DO / RE / MI', note: 'musical note' },
  { word: 'old', cryptic: 'O / EX', note: 'prefix meaning former' },
  { word: 'river', cryptic: 'NILE / EXE / DEE', note: 'UK rivers (short names)' },
  { word: 'saint', cryptic: 'ST', note: 'abbreviation' },
  { word: 'street', cryptic: 'ST / RD', note: 'abbreviation' },
  { word: 'small', cryptic: 'S / WEE', note: 'size' },
  { word: 'large', cryptic: 'L / BIG', note: 'size' },
  { word: 'number', cryptic: 'NO / NB', note: 'abbreviation' },
  { word: 'gold', cryptic: 'OR / AU', note: 'heraldry / chemistry' },
  { word: 'silver', cryptic: 'AG', note: 'chemistry symbol' },
  { word: 'right', cryptic: 'R / RT', note: 'direction / correct' },
  { word: 'answer', cryptic: 'A / ANS', note: 'abbreviated' },
  { word: 'about', cryptic: 'C / CA / RE', note: 'circa / regarding' },
  { word: 'one', cryptic: 'I', note: 'Roman numeral' },
  { word: 'five', cryptic: 'V', note: 'Roman numeral' },
  { word: 'ten', cryptic: 'X', note: 'Roman numeral' },
  { word: 'fifty', cryptic: 'L', note: 'Roman numeral' },
  { word: 'hundred', cryptic: 'C', note: 'Roman numeral' },
  { word: 'five hundred', cryptic: 'D', note: 'Roman numeral' },
  { word: 'thousand', cryptic: 'M', note: 'Roman numeral' },
];

// ─── MAIN LEARN PAGE ──────────────────────────────────────────────────────────

const SECTIONS = ['Intro', 'Parts', 'Wordplay', 'Compound', 'Synonyms'];

export function Learn() {
  const [activeSection, setActiveSection] = useState(0);
  const [activeWordplayTab, setActiveWordplayTab] = useState(learningData.wordplayTypes[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);

  const filteredSynonyms = learningData.synonyms.filter(
    s =>
      s.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.cryptic.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentWordplay = learningData.wordplayTypes.find(t => t.id === activeWordplayTab);

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
            fontFamily: "'Fredoka One', cursive",
            fontSize: '2.2rem',
            color: isDark ? '#C4B5FD' : '#1E1B4B',
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
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          {SECTIONS.map((s, i) => (
            <motion.button
              key={s}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setActiveSection(i)}
              className="flex-shrink-0 px-4 py-2 rounded-full text-sm transition-all"
              style={{
                fontFamily: "'Nunito', sans-serif",
                fontWeight: 700,
                background: activeSection === i ? '#7C3AED' : T.cardBg,
                color: activeSection === i ? 'white' : isDark ? '#C4B5FD' : '#6D28D9',
                border: `2px solid ${activeSection === i ? '#7C3AED' : isDark ? '#3D2A6B' : '#EDE9FE'}`,
                boxShadow: activeSection === i ? '0 4px 12px rgba(124,58,237,0.3)' : undefined,
              }}
            >
              {s}
            </motion.button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.25 }}
        >
          {/* ── SECTION 0: Intro ── */}
          {activeSection === 0 && (
            <div className="space-y-6">
              <div
                className="rounded-3xl p-6 border shadow-sm"
                style={{ background: T.cardBg, borderColor: T.cardBorder }}
              >
                <h2
                  style={{
                    fontFamily: "'Fredoka One', cursive",
                    fontSize: '1.5rem',
                    color: isDark ? '#C4B5FD' : '#1E1B4B',
                    marginBottom: 12,
                  }}
                >
                  What is a Cryptic Clue? 🔍
                </h2>
                <p
                  style={{
                    fontSize: '0.95rem',
                    color: isDark ? '#C4B5FD' : '#374151',
                    lineHeight: 1.8,
                    fontWeight: 500,
                  }}
                >
                  A cryptic clue is like a little word puzzle within a puzzle. Unlike regular
                  crossword clues which are simple synonyms,{' '}
                  <strong>every cryptic clue has two parts</strong>:
                </p>
                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                  <div
                    className="flex-1 rounded-2xl p-4"
                    style={{
                      background: isDark ? '#0D1F35' : '#EFF6FF',
                      border: '2px solid #3B82F6',
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "'Fredoka One', cursive",
                        color: '#1D4ED8',
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
                      background: isDark ? '#2A1505' : '#FFF7ED',
                      border: '2px solid #F97316',
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "'Fredoka One', cursive",
                        color: '#C2410C',
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

              <div
                className="rounded-3xl p-6 border shadow-sm"
                style={{ background: T.cardBg, borderColor: T.cardBorder }}
              >
                <h3
                  style={{
                    fontFamily: "'Fredoka One', cursive",
                    fontSize: '1.2rem',
                    color: isDark ? '#C4B5FD' : '#1E1B4B',
                    marginBottom: 4,
                  }}
                >
                  The Golden Rule
                </h3>
                <div
                  className="rounded-2xl p-4 mb-4"
                  style={{
                    background: isDark ? '#261845' : '#F9F7FF',
                    border: `2px dashed ${isDark ? '#4C3580' : '#C4B5FD'}`,
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
                        background: isDark ? '#2A1505' : '#FFF7ED',
                        color: '#C2410C',
                        border: '1.5px solid #F97316',
                        borderRadius: 6,
                        padding: '1px 5px',
                      }}
                    >
                      Stone
                    </span>{' '}
                    <span
                      style={{
                        background: isDark ? '#1A0F35' : '#F5F3FF',
                        color: '#5B21B6',
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
                        background: isDark ? '#0D1F35' : '#EFF6FF',
                        color: '#1D4ED8',
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
                          color: isDark ? '#C4B5FD' : '#374151',
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
                onClick={() => setActiveSection(1)}
                className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
                  color: 'white',
                  fontFamily: "'Nunito', sans-serif",
                  fontWeight: 800,
                }}
              >
                Learn about Parts of a Clue <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* ── SECTION 1: Parts of a Clue ── */}
          {activeSection === 1 && (
            <div className="space-y-6">
              <PartsOfClue isDark={isDark} />
              <button
                onClick={() => setActiveSection(2)}
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
                onClick={() => setActiveSection(3)}
                className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
                  color: 'white',
                  fontFamily: "'Nunito', sans-serif",
                  fontWeight: 800,
                }}
              >
                Master Compound Clues <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* ── SECTION 3: Compound Clues ── */}
          {activeSection === 3 && (
            <div className="space-y-6">
              <div
                className="rounded-3xl p-6 border shadow-sm"
                style={{ background: T.cardBg, borderColor: T.cardBorder }}
              >
                <h2
                  style={{
                    fontFamily: "'Fredoka One', cursive",
                    fontSize: '1.5rem',
                    color: isDark ? '#C4B5FD' : '#1E1B4B',
                    marginBottom: 12,
                  }}
                >
                  Mastering Compound Clues 🧩
                </h2>
                <p
                  style={{
                    fontSize: '0.95rem',
                    color: isDark ? '#C4B5FD' : '#374151',
                    lineHeight: 1.8,
                    fontWeight: 500,
                  }}
                >
                  Professional cryptic clues often combine <strong>multiple mechanisms</strong>.
                  Don't panic! Just break them down step-by-step.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {learningData.compoundExamples.map((ex, i) => (
                  <div
                    key={i}
                    className="rounded-3xl p-6 border shadow-sm flex flex-col"
                    style={{ background: T.cardBg, borderColor: T.cardBorder }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="text-3xl">{ex.emoji}</div>
                      <div>
                        <h3
                          style={{
                            fontFamily: "'Fredoka One', cursive",
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
                        background: isDark ? '#1A0F35' : '#F5F3FF',
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

                    <div className="space-y-3 flex-grow mb-4">
                      {ex.steps.map((step, si) => (
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
                          <p style={{ fontSize: '0.85rem', color: T.text, lineHeight: 1.5 }}>
                            {step.text}
                          </p>
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
                          style={{ color: '#059669', fontFamily: "'Fredoka One', cursive" }}
                        >
                          {ex.answer}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: T.textMuted, fontStyle: 'italic' }}>
                        💡 {ex.tip}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SECTION 4: Synonyms ── */}
          {activeSection === 4 && (
            <div className="space-y-6">
              <div
                className="rounded-3xl p-6 border shadow-sm"
                style={{ background: T.cardBg, borderColor: T.cardBorder }}
              >
                <h2
                  style={{
                    fontFamily: "'Fredoka One', cursive",
                    fontSize: '1.5rem',
                    color: isDark ? '#C4B5FD' : '#1E1B4B',
                    marginBottom: 12,
                  }}
                >
                  Cryptic Abbreviations & Synonyms 📖
                </h2>
                <div className="relative mb-6">
                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                  <input
                    type="text"
                    placeholder="Search for a word (e.g. 'doctor', 'east')..."
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
                  {filteredSynonyms.map((s, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-2xl border flex items-center justify-between transition-all hover:scale-[1.02]"
                      style={{
                        background: isDark ? '#00000020' : '#F9FAFB',
                        borderColor: T.cardBorder,
                      }}
                    >
                      <div>
                        <p
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: T.textFaint,
                            textTransform: 'uppercase',
                            marginBottom: 2,
                          }}
                        >
                          {s.word}
                        </p>
                        <p
                          style={{
                            fontFamily: "'Fredoka One', cursive",
                            fontSize: '1.1rem',
                            color: '#7C3AED',
                          }}
                        >
                          {s.cryptic}
                        </p>
                      </div>
                      <div className="text-right">
                        <p style={{ fontSize: '0.72rem', color: T.textMuted }}>{s.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
