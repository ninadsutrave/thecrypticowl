import { useRef, useState } from 'react';
import { m } from 'motion/react';
import { ExternalLink, Flag, Lightbulb, Send } from 'lucide-react';
import { useDarkMode } from '../../context/DarkModeContext';
import { getTheme } from '../../theme';
import { GameShell, type PlayApi } from '../GameShell';
import { GameLoading } from '../GameLoading';
import { useDailyPuzzle } from '../useDailyPuzzle';
import { useGameState } from '../useGameState';
import { isCorrectGuess } from '../whatami/match';
import { parseTrivia } from './parse';
import { SAMPLE_TRIVIA, type TriviaPuzzle } from './sample';
import { getTriviaTutorial } from './tutorial';
import { describePattern, triviaGrid } from './logic';
import { LetterPattern } from './LetterPattern';

const MAX_GUESSES = 4;

export function TriviaGame() {
  const { puzzle, isPractice, loading } = useDailyPuzzle('trivia', SAMPLE_TRIVIA, parseTrivia);
  if (loading || !puzzle) return <GameLoading gameId="trivia" />;
  return (
    <GameShell
      gameId="trivia"
      practice={isPractice}
      puzzleId={`${puzzle.answer}:${puzzle.question.slice(0, 40)}`}
      subtitle={`${puzzle.category} · One question`}
      tutorial={getTriviaTutorial()}
    >
      {api => <TriviaBoard puzzle={puzzle} api={api} />}
    </GameShell>
  );
}

function TriviaBoard({ puzzle, api }: { puzzle: TriviaPuzzle; api: PlayApi }) {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const ink = isDark ? '#6EE7B7' : '#047857';
  const [wrong, setWrong] = useGameState<string[]>(api, 'wrong', []);
  const [hintUsed, setHintUsed] = useGameState(api, 'hint', false);
  const [solved, setSolved] = useGameState(api, 'solved', false);
  const [guess, setGuess] = useState('');
  const [shake, setShake] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const left = MAX_GUESSES - wrong.length;
  const hints = hintUsed ? 1 : 0;

  const submit = () => {
    const g = guess.trim();
    if (!g || api.finished) return;
    if (isCorrectGuess(g, puzzle.accepted)) {
      setSolved(true);
      api.complete({
        outcome: 'solved',
        score: `Guess ${wrong.length + 1} of ${MAX_GUESSES}${hintUsed ? ' · hint' : ''}`,
        hints,
        mistakes: wrong.length,
        details: { guesses: wrong.length + 1 },
        grid: triviaGrid(wrong.length, true, hintUsed, MAX_GUESSES),
      });
      return;
    }
    const next = [...wrong, g];
    setWrong(next);
    setGuess('');
    setShake(n => n + 1);
    if (next.length >= MAX_GUESSES) {
      api.complete({
        outcome: 'failed',
        score: 'Not this time',
        hints,
        mistakes: next.length,
        details: { guesses: next.length },
        grid: triviaGrid(next.length, false, hintUsed, MAX_GUESSES),
      });
      return;
    }
    inputRef.current?.focus();
  };

  const giveUp = () => {
    api.complete({
      outcome: 'revealed',
      score: 'Revealed',
      hints,
      mistakes: wrong.length,
      details: { guesses: wrong.length },
      grid: triviaGrid(wrong.length, false, hintUsed, MAX_GUESSES),
    });
  };

  return (
    <div className="space-y-4">
      <article
        className="relative rounded-3xl border p-5 sm:p-6 overflow-hidden"
        style={{ background: T.cardBg, borderColor: T.cardBorder, boxShadow: T.shadowCard }}
      >
        <span
          className="absolute -bottom-8 right-3 select-none pointer-events-none"
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '6rem',
            lineHeight: 1,
            color: ink,
            opacity: 0.12,
          }}
          aria-hidden
        >
          ?
        </span>
        <div className="flex items-center justify-between gap-3 mb-3">
          <span
            className="rounded-full px-2.5 py-1 text-xs font-extrabold"
            style={{ background: T.successBg, color: ink }}
          >
            {puzzle.category}
          </span>
          {!api.finished && (
            <span
              className="flex items-center gap-1.5 text-xs font-extrabold"
              style={{ color: T.textMuted }}
              aria-label={`${left} guess${left === 1 ? '' : 'es'} left`}
            >
              {Array.from({ length: MAX_GUESSES }, (_, i) => (
                <span
                  key={i}
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: i < left ? ink : T.cardBorder }}
                  aria-hidden
                />
              ))}
              <span className="ml-1">{left} left</span>
            </span>
          )}
        </div>
        <p
          className="relative"
          style={{ color: T.text, fontWeight: 600, fontSize: '1.08rem', lineHeight: 1.75 }}
        >
          {puzzle.question}
        </p>
      </article>

      {hintUsed && !api.finished && (
        <p
          className="rounded-2xl px-4 py-2.5 text-sm font-extrabold border flex flex-wrap items-center gap-2"
          style={{ background: T.fodderBg, borderColor: T.streakBorder, color: T.text }}
        >
          <Lightbulb size={15} aria-hidden />
          <span className="sr-only">Hint: {describePattern(puzzle.answer)}</span>
          <LetterPattern answer={puzzle.answer} color={T.text} />
        </p>
      )}

      {wrong.length > 0 && !api.finished && (
        <p className="text-sm" style={{ color: T.textMuted, fontWeight: 700 }}>
          Not it: {wrong.map(w => `“${w}”`).join(', ')}
        </p>
      )}

      {api.finished ? (
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border-2 px-5 py-5 text-center"
          style={{
            background: solved ? T.successBg : T.cardBg,
            borderColor: solved ? T.successBorder : T.cardBorderStrong,
          }}
        >
          <p className="text-xs font-extrabold tracking-wider" style={{ color: T.textMuted }}>
            {solved ? 'CORRECT · THE ANSWER IS' : 'THE ANSWER WAS'}
          </p>
          <p
            className="mt-1"
            style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.9rem', color: T.heading }}
          >
            {puzzle.answer}
          </p>
          <p
            className="mt-3 mb-0 text-sm"
            style={{ color: T.text, fontWeight: 600, lineHeight: 1.6 }}
          >
            {puzzle.fact}
          </p>
          <a
            href={puzzle.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-sm font-bold hover:underline"
            style={{ color: T.brandText }}
          >
            {puzzle.source.label} <ExternalLink size={12} />
          </a>
        </m.div>
      ) : (
        <div className="space-y-3">
          <m.div
            key={shake}
            animate={shake ? { x: [0, -8, 8, -5, 5, 0] } : {}}
            transition={{ duration: 0.35 }}
            className="flex gap-2"
          >
            <input
              ref={inputRef}
              value={guess}
              onChange={e => setGuess(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="Your answer"
              aria-label="Your answer"
              autoComplete="off"
              autoCapitalize="words"
              className="flex-1 min-w-0 py-3 px-4 rounded-2xl border-2 focus:outline-none"
              style={{
                borderColor: T.inputBorder,
                background: T.inputBg,
                color: T.text,
                fontWeight: 700,
                fontSize: '1rem',
              }}
            />
            <button
              onClick={submit}
              disabled={!guess.trim()}
              className="px-4 sm:px-5 rounded-2xl flex items-center gap-2 font-extrabold disabled:opacity-40"
              style={{ background: '#047857', color: 'white' }}
            >
              <Send size={16} /> <span className="hidden sm:inline">Answer</span>
            </button>
          </m.div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setHintUsed(true)}
              disabled={hintUsed}
              className="py-2.5 rounded-2xl border-2 flex items-center justify-center gap-2 font-extrabold text-sm disabled:opacity-40"
              style={{ borderColor: T.streakBorder, color: T.streakText, background: T.fodderBg }}
            >
              <Lightbulb size={15} /> {hintUsed ? 'Hint used' : 'Hint: letter pattern'}
            </button>
            <button
              onClick={giveUp}
              className="py-2.5 rounded-2xl border-2 flex items-center justify-center gap-2 font-extrabold text-sm"
              style={{ borderColor: T.cardBorder, color: T.textMuted, background: 'transparent' }}
            >
              <Flag size={15} /> Give up
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
