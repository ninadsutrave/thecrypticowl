import { m } from 'motion/react';
import { ArrowDown, ArrowRight, ArrowUp, Check, ExternalLink, Lightbulb, X } from 'lucide-react';
import { useDarkMode } from '../../context/DarkModeContext';
import { getTheme, type Theme } from '../../theme';
import { GameShell, type PlayApi } from '../GameShell';
import { GameLoading } from '../GameLoading';
import { useDailyPuzzle } from '../useDailyPuzzle';
import { useGameState } from '../useGameState';
import { formatValue, isHigher, rounds, roundsGrid } from './logic';
import { parseHigherLower } from './parse';
import { SAMPLE_HIGHER_LOWER, type HigherLowerItem, type HigherLowerPuzzle } from './sample';
import { getHigherLowerTutorial } from './tutorial';

const ACCENT = '#0F766E';
const ACCENT_SOFT = '#14B8A6';

export function HigherLowerGame() {
  const { puzzle, isPractice, loading } = useDailyPuzzle(
    'higher-lower',
    SAMPLE_HIGHER_LOWER,
    parseHigherLower
  );
  if (loading || !puzzle) return <GameLoading gameId="higher-lower" />;
  const n = rounds(puzzle);
  return (
    <GameShell
      gameId="higher-lower"
      practice={isPractice}
      puzzleId={puzzle.items.map(x => x.id).join('|')}
      subtitle={`${n} rounds · Medium`}
      tutorial={getHigherLowerTutorial(puzzle)}
    >
      {api => <HigherLowerBoard puzzle={puzzle} api={api} />}
    </GameShell>
  );
}

function HigherLowerBoard({ puzzle, api }: { puzzle: HigherLowerPuzzle; api: PlayApi }) {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const n = rounds(puzzle);
  const [round, setRound] = useGameState(api, 'round', 0);
  const [results, setResults] = useGameState<boolean[]>(api, 'results', []);
  const [hintRound, setHintRound] = useGameState<number | null>(api, 'hint', null);

  const answered = results.length > round;
  const known = puzzle.items[round];
  const hidden = puzzle.items[round + 1];
  const score = results.filter(Boolean).length;
  const ink = isDark ? '#5EEAD4' : ACCENT;

  const guess = (up: boolean) => {
    if (answered || api.finished) return;
    const next = [...results, up === isHigher(puzzle, round)];
    setResults(next);
    if (next.length === n) {
      const right = next.filter(Boolean).length;
      api.complete({
        // A majority right counts as a solve (and keeps the streak going).
        outcome: right * 2 > n ? 'solved' : 'failed',
        score: `${right}/${n} right${hintRound !== null ? ' · hint' : ''}`,
        hints: hintRound !== null ? 1 : 0,
        mistakes: n - right,
        details: { theme: puzzle.theme, right },
        grid: roundsGrid(next),
      });
    }
  };

  if (api.finished) return <Chain puzzle={puzzle} results={results} T={T} ink={ink} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div
          className="flex gap-1 flex-1 max-w-[260px]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={n}
          aria-valuenow={results.length}
          aria-label={`Round ${round + 1} of ${n}`}
        >
          {Array.from({ length: n }, (_, i) => (
            <span
              key={i}
              className="h-2 flex-1 rounded-full"
              style={{
                background:
                  i < results.length
                    ? results[i]
                      ? '#10B981'
                      : '#EF4444'
                    : i === round
                      ? ACCENT_SOFT
                      : T.cardBorder,
              }}
            />
          ))}
        </div>
        <span className="text-xs font-extrabold whitespace-nowrap" style={{ color: T.textMuted }}>
          {round + 1}/{n} · {score} right
        </span>
      </div>

      <h2
        className="text-center m-0"
        style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 'clamp(1.15rem, 4.5vw, 1.4rem)',
          color: T.heading,
        }}
      >
        {puzzle.title}
      </h2>

      <div className="relative grid grid-cols-2 gap-2 sm:gap-3">
        <ItemCard
          item={known}
          label={puzzle.noun}
          // No numbers while you decide: both stay hidden until you answer
          // (or the hint reveals this one).
          value={answered || hintRound === round ? formatValue(known.value, puzzle.format) : '?'}
          T={T}
        />
        <span
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[0.65rem] sm:text-xs font-extrabold"
          style={{ background: ACCENT, color: '#FFFFFF', boxShadow: T.shadowCard }}
          aria-hidden
        >
          vs
        </span>
        <ItemCard
          key={hidden.id}
          item={hidden}
          label={puzzle.noun}
          value={answered ? formatValue(hidden.value, puzzle.format) : '?'}
          tone={answered ? (results[round] ? 'good' : 'bad') : 'mystery'}
          T={T}
        />
      </div>

      {hintRound === round && !answered && (
        <p
          className="m-0 rounded-2xl px-4 py-2.5 text-sm font-extrabold border flex items-center gap-2"
          style={{ background: T.fodderBg, borderColor: T.streakBorder, color: T.text }}
        >
          <Lightbulb size={15} aria-hidden /> {known.name}:{' '}
          {formatValue(known.value, puzzle.format)}
        </p>
      )}

      {!answered ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            {[
              { up: true, label: puzzle.higher, Icon: ArrowUp },
              { up: false, label: puzzle.lower, Icon: ArrowDown },
            ].map(({ up, label, Icon }) => (
              <button
                key={label}
                onClick={() => guess(up)}
                className="min-h-[52px] rounded-2xl font-extrabold text-base flex items-center justify-center gap-2 transition-transform active:scale-[0.97]"
                style={{ background: ACCENT, color: 'white' }}
              >
                <Icon size={18} aria-hidden /> {label}
              </button>
            ))}
          </div>
          {hintRound === null && (
            <button
              onClick={() => setHintRound(round)}
              className="w-full py-2.5 rounded-2xl border-2 text-sm font-extrabold flex items-center justify-center gap-2"
              style={{ borderColor: T.streakBorder, color: T.streakText, background: T.fodderBg }}
            >
              <Lightbulb size={15} /> Hint: show one number (once per game)
            </button>
          )}
        </>
      ) : (
        <m.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <p
            className="m-0 text-center text-sm font-extrabold flex items-center justify-center gap-1.5"
            style={{ color: results[round] ? (isDark ? '#6EE7B7' : '#047857') : '#EF4444' }}
            role="status"
          >
            {results[round] ? <Check size={16} /> : <X size={16} />}
            {results[round] ? 'Right!' : 'Not this time.'} {hidden.name}:{' '}
            {formatValue(hidden.value, puzzle.format)}
          </p>
          {round < n - 1 && (
            <button
              onClick={() => setRound(round + 1)}
              className="w-full min-h-[52px] rounded-2xl font-extrabold flex items-center justify-center gap-2"
              style={{ background: T.brand, color: '#FFFFFF' }}
              autoFocus
            >
              Next round <ArrowRight size={16} />
            </button>
          )}
        </m.div>
      )}
    </div>
  );
}

function ItemCard({
  item,
  label,
  value,
  tone = 'known',
  T,
}: {
  item: HigherLowerItem;
  label: string;
  value: string;
  tone?: 'known' | 'mystery' | 'good' | 'bad';
  T: Theme;
}) {
  const border =
    tone === 'good'
      ? T.successBorder
      : tone === 'bad'
        ? T.wrongBorder
        : tone === 'mystery'
          ? ACCENT_SOFT
          : T.cardBorder;
  return (
    <article
      className="rounded-2xl sm:rounded-3xl border-2 px-2.5 py-3 sm:px-4 sm:py-5 flex flex-col items-center text-center min-w-0"
      style={{
        background: tone === 'good' ? T.successBg : tone === 'bad' ? T.wrongBg : T.cardBg,
        borderColor: border,
        borderStyle: tone === 'mystery' ? 'dashed' : 'solid',
        boxShadow: T.shadowCard,
      }}
    >
      <h3
        className="m-0 break-words max-w-full"
        style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 'clamp(0.95rem, 4vw, 1.3rem)',
          color: T.heading,
          lineHeight: 1.2,
        }}
      >
        {item.name}
      </h3>
      {item.description && (
        <p
          className="m-0 mt-1 text-[0.7rem] sm:text-xs font-bold line-clamp-2"
          style={{ color: T.textMuted, lineHeight: 1.4 }}
        >
          {item.description}
        </p>
      )}
      <p
        className="m-0 mt-auto pt-2 sm:pt-3"
        style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: 'clamp(1.15rem, 5.6vw, 2rem)',
          color: tone === 'mystery' ? ACCENT_SOFT : T.heading,
          lineHeight: 1.1,
        }}
        aria-live="polite"
      >
        {value}
      </p>
      <p
        className="m-0 text-[0.6rem] sm:text-[0.7rem] font-extrabold uppercase tracking-wider"
        style={{ color: T.textMuted }}
      >
        {label}
      </p>
    </article>
  );
}

/** After the last round: the whole chain, every value shown, with sources. */
function Chain({
  puzzle,
  results,
  T,
  ink,
}: {
  puzzle: HigherLowerPuzzle;
  results: boolean[];
  T: Theme;
  ink: string;
}) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-extrabold" style={{ color: T.textMuted }}>
        TODAY'S CHAIN · {puzzle.title.toUpperCase()}
      </h2>
      <ol className="list-none p-0 space-y-1.5">
        {puzzle.items.map((item, i) => (
          <li
            key={item.id}
            className="rounded-2xl border px-3 py-2 flex items-center gap-3"
            style={{ background: T.cardBg, borderColor: T.cardBorder }}
          >
            <span
              className="w-5 text-center flex-shrink-0"
              aria-label={i === 0 ? 'Start' : results[i - 1] ? 'Right' : 'Wrong'}
            >
              {i === 0 ? '•' : results[i - 1] ? '🟩' : '🟥'}
            </span>
            <span className="flex-1 min-w-0 font-bold truncate" style={{ color: T.text }}>
              {item.name}
            </span>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 inline-flex items-center gap-1 text-sm font-extrabold hover:underline"
              style={{ color: ink }}
            >
              {formatValue(item.value, puzzle.format)} <ExternalLink size={11} aria-hidden />
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}
