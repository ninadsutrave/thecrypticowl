import { useRef, useState } from 'react';
import { m, AnimatePresence } from 'motion/react';
import { ExternalLink, Eye, Lightbulb, Lock, Send } from 'lucide-react';
import { useDarkMode } from '../../context/DarkModeContext';
import { getTheme } from '../../theme';
import { GameShell, type PlayApi } from '../GameShell';
import { GameLoading } from '../GameLoading';
import { useDailyPuzzle } from '../useDailyPuzzle';
import { useGameState } from '../useGameState';
import { parseWhatAmI } from './parse';
import { isCorrectGuess } from './match';
import { SAMPLE_WHAT_AM_I, type WhatAmIPuzzle } from './sample';
import { getWhatAmITutorial } from './tutorial';

const ACCENT = '#F97316';
const MAX_POINTS = 5;

export function WhatAmIGame() {
  const {
    puzzle: puzzle,
    isPractice,
    loading,
  } = useDailyPuzzle('what-am-i', SAMPLE_WHAT_AM_I, parseWhatAmI);
  if (loading || !puzzle) return <GameLoading gameId="what-am-i" />;
  return (
    <GameShell
      gameId="what-am-i"
      practice={isPractice}
      puzzleId={`${puzzle.answer}:${puzzle.clues[0]}`}
      subtitle={`Category: ${puzzle.category}`}
      tutorial={getWhatAmITutorial()}
      rules={
        <>
          <p>
            Something is hiding behind five clues: a country, a celebrity, a band, a brand, a
            festival… The category is shown above.
          </p>
          <p>
            You start with the hardest clue. Guess at any time, or reveal the next clue. Getting it
            on clue 1 scores {MAX_POINTS} points, clue 2 scores {MAX_POINTS - 1}, and so on.
          </p>
          <p>A wrong guess reveals the next clue too, so guess boldly but not wildly!</p>
          <p>
            You get one hint: the answer's first letter and length. It costs a point (you always
            keep at least one for a correct answer).
          </p>
        </>
      }
    >
      {api => <WhatAmIBoard puzzle={puzzle} api={api} />}
    </GameShell>
  );
}

function WhatAmIBoard({ puzzle, api }: { puzzle: WhatAmIPuzzle; api: PlayApi }) {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const [shown, setShown] = useGameState(api, 'shown', 1);
  const [wrong, setWrong] = useGameState<string[]>(api, 'wrong', []);
  const [hintUsed, setHintUsed] = useGameState(api, 'hint', false);
  const [guess, setGuess] = useState('');
  const [won, setWon] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // The hint costs a point, but a correct answer always scores at least one.
  const points = Math.max(1, MAX_POINTS + 1 - shown - (hintUsed ? 1 : 0));
  const lastClue = shown === puzzle.clues.length;

  const submit = () => {
    if (!guess.trim() || api.finished) return;
    if (isCorrectGuess(guess, puzzle.accepted)) {
      setWon(true);
      api.complete({
        outcome: 'solved',
        score: `${points}/${MAX_POINTS} points${hintUsed ? ' · hint' : ''}`,
        hints: hintUsed ? 1 : 0,
        mistakes: wrong.length,
        details: { points, cluesSeen: shown },
        grid: cluesGrid(shown, true),
      });
      return;
    }
    setWrong(w => [...w, guess.trim()]);
    setGuess('');
    if (lastClue) {
      api.complete({
        outcome: 'failed',
        score: `0/${MAX_POINTS} points`,
        hints: hintUsed ? 1 : 0,
        mistakes: wrong.length + 1,
        details: { points: 0, cluesSeen: shown },
        grid: cluesGrid(shown, false),
      });
    } else {
      setShown(s => s + 1);
    }
    inputRef.current?.focus();
  };

  const revealNext = () => {
    if (lastClue) {
      api.complete({
        outcome: 'revealed',
        score: `0/${MAX_POINTS} points`,
        hints: hintUsed ? 1 : 0,
        mistakes: wrong.length,
        details: { points: 0, cluesSeen: shown },
        grid: cluesGrid(shown, false),
      });
    } else {
      setShown(s => s + 1);
    }
  };

  return (
    <div className="space-y-4">
      <ol className="space-y-2.5 list-none p-0 m-0">
        {puzzle.clues.map((clue, i) => {
          const visible = i < shown || api.finished;
          const worth = MAX_POINTS - i;
          return (
            <li key={i}>
              <AnimatePresence mode="wait" initial={false}>
                <m.div
                  key={visible ? 'open' : 'locked'}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border-2 px-4 py-3 flex gap-3 items-start"
                  style={{
                    background: visible ? T.cardBg : T.inputBg,
                    borderColor:
                      visible && i === shown - 1 && !api.finished ? ACCENT : T.cardBorder,
                  }}
                >
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
                    style={{
                      fontFamily: "'Fredoka One', cursive",
                      background: visible ? `${ACCENT}22` : 'transparent',
                      color: visible ? ACCENT : T.textMuted,
                      border: `2px solid ${visible ? ACCENT : T.cardBorder}`,
                    }}
                  >
                    {i + 1}
                  </span>
                  {visible ? (
                    <p style={{ color: T.text, fontWeight: 700, lineHeight: 1.55, margin: 0 }}>
                      {clue}
                    </p>
                  ) : (
                    <p
                      className="flex items-center gap-1.5"
                      style={{ color: T.textMuted, fontWeight: 700, margin: 0 }}
                    >
                      <Lock size={14} /> Clue {i + 1} · worth {worth} point{worth === 1 ? '' : 's'}
                    </p>
                  )}
                </m.div>
              </AnimatePresence>
            </li>
          );
        })}
      </ol>

      {hintUsed && !api.finished && (
        <p
          className="rounded-2xl px-4 py-2.5 text-sm font-extrabold border"
          style={{ background: T.fodderBg, borderColor: T.streakBorder, color: T.text }}
        >
          💡 Starts with “{puzzle.answer[0].toUpperCase()}” · {answerShape(puzzle.answer)}
        </p>
      )}

      {wrong.length > 0 && (
        <p className="text-sm" style={{ color: T.textMuted, fontWeight: 700 }}>
          Not it: {wrong.map(w => `“${w}”`).join(', ')}
        </p>
      )}

      {api.finished ? (
        <div
          className="rounded-2xl border-2 px-4 py-4 text-center"
          style={{
            background: won ? T.successBg : T.cardBg,
            borderColor: won ? T.successBorder : T.cardBorderStrong,
          }}
        >
          <p style={{ color: T.textMuted, fontWeight: 800, fontSize: '0.75rem', margin: 0 }}>
            THE ANSWER WAS
          </p>
          <p style={{ fontFamily: "'Fredoka One', cursive", fontSize: '1.8rem', color: T.heading }}>
            {puzzle.answer}
          </p>
          <a
            href={puzzle.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-bold hover:underline"
            style={{ color: T.brandText }}
          >
            {puzzle.source.label} <ExternalLink size={12} />
          </a>
        </div>
      ) : (
        <div
          className="rounded-3xl p-4 border-2"
          style={{ background: T.cardBg, borderColor: ACCENT }}
        >
          <p className="mb-2 text-sm font-extrabold" style={{ color: T.textMuted }}>
            Guess now for {points} point{points === 1 ? '' : 's'}
          </p>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={guess}
              onChange={e => setGuess(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="What am I?"
              aria-label="Your guess"
              autoComplete="off"
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
              style={{ background: ACCENT, color: 'white' }}
            >
              <Send size={16} /> <span className="hidden sm:inline">Guess</span>
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={revealNext}
              className="py-2.5 rounded-2xl border-2 flex items-center justify-center gap-2 font-extrabold text-sm"
              style={{ borderColor: T.cardBorder, color: T.brandText, background: 'transparent' }}
            >
              <Eye size={15} /> {lastClue ? 'Give up' : `Reveal clue ${shown + 1}`}
            </button>
            <button
              onClick={() => setHintUsed(true)}
              disabled={hintUsed}
              className="py-2.5 rounded-2xl border-2 flex items-center justify-center gap-2 font-extrabold text-sm disabled:opacity-40"
              style={{ borderColor: T.streakBorder, color: T.streakText, background: T.fodderBg }}
            >
              <Lightbulb size={15} /> {hintUsed ? 'Hint used' : 'Hint (−1 pt)'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** "7 letters", or "2 words: 6, 5" for multi-word answers. */
function answerShape(answer: string): string {
  const words = answer.split(/\s+/).filter(Boolean);
  if (words.length === 1) return `${answer.replace(/[^\p{L}\p{N}]/gu, '').length} letters`;
  return `${words.length} words: ${words.map(w => w.replace(/[^\p{L}\p{N}]/gu, '').length).join(', ')}`;
}

/** 🟥 for each clue that went by, 🟩 for the one it was solved on, ⬜ unused. */
function cluesGrid(shown: number, solved: boolean) {
  return Array.from({ length: MAX_POINTS }, (_, i) =>
    i < shown - 1 ? '🟥' : i === shown - 1 ? (solved ? '🟩' : '🟥') : '⬜'
  ).join('');
}
