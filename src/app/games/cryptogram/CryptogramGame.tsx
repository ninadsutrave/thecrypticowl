import { useCallback, useEffect, useMemo, useState } from 'react';
import { Delete, ExternalLink, Lightbulb, ScrollText } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { useDarkMode } from '../../context/DarkModeContext';
import { getTheme } from '../../theme';
import { GameShell, type PlayApi } from '../GameShell';
import { GameLoading } from '../GameLoading';
import { useDailyPuzzle } from '../useDailyPuzzle';
import { useGameState } from '../useGameState';
import { parseCryptogram } from './parse';
import { assign, encode, isSolved, pickHint, solutionMap, type GuessMap } from './logic';
import { SAMPLE_CRYPTOGRAM, type CryptogramPuzzle } from './sample';
import { getCryptogramTutorial } from './tutorial';

const ACCENT = '#EC4899';
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function CryptogramGame() {
  const {
    puzzle: puzzle,
    isPractice,
    loading,
  } = useDailyPuzzle('cryptogram', SAMPLE_CRYPTOGRAM, parseCryptogram);
  if (loading || !puzzle) return <GameLoading gameId="cryptogram" />;
  return (
    <GameShell
      gameId="cryptogram"
      practice={isPractice}
      puzzleId={`${puzzle.key}:${puzzle.text}`}
      subtitle="A well-known saying · Medium"
      tutorial={getCryptogramTutorial()}
      rules={
        <>
          <p>
            Every letter of a famous saying has been swapped for a different letter, the same swap
            all the way through. If <strong>X</strong> stands for <strong>T</strong> once, it stands
            for T everywhere.
          </p>
          <p>
            Tap a letter, then type (or tap) what you think it really is. Two letters are given to
            get you started. A hint reveals one more letter.
          </p>
          <p>
            Tip: one-letter words are usually A or I, and THE is the commonest three-letter word.
          </p>
        </>
      }
    >
      {api => <CryptogramBoard puzzle={puzzle} api={api} />}
    </GameShell>
  );
}

function CryptogramBoard({ puzzle, api }: { puzzle: CryptogramPuzzle; api: PlayApi }) {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const cipherText = useMemo(() => encode(puzzle.text, puzzle.key), [puzzle]);
  const solution = useMemo(() => solutionMap(puzzle.text, puzzle.key), [puzzle]);
  // Cipher letters that are fixed: the starting givens.
  const givenCipher = useMemo(
    () => puzzle.given.map(p => puzzle.key[p.charCodeAt(0) - 65]),
    [puzzle]
  );

  const [guesses, setGuesses] = useGameState<GuessMap>(api, 'guesses', () =>
    Object.fromEntries(givenCipher.map(c => [c, solution[c]]))
  );
  const [hinted, setHinted] = useGameState<string[]>(api, 'hinted', []);
  // Letters assigned that turned out wrong — recorded, never shown live.
  const [mistakes, setMistakes] = useGameState(api, 'mistakes', 0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showCipher, setShowCipher] = useState(false);

  const isLocked = useCallback(
    (c: string) => givenCipher.includes(c) || hinted.includes(c) || api.finished,
    [givenCipher, hinted, api.finished]
  );

  const firstOpen = useMemo(
    () => [...cipherText].find(c => solution[c] && !isLocked(c) && !guesses[c]) ?? null,
    [cipherText, solution, isLocked, guesses]
  );

  // The next cipher letter after `from`, in reading order, still unguessed.
  const nextOpen = useCallback(
    (from: string, g: GuessMap) => {
      const letters = [...new Set([...cipherText].filter(c => solution[c]))];
      const start = letters.indexOf(from);
      const ordered = [...letters.slice(start + 1), ...letters.slice(0, start)];
      return ordered.find(c => !g[c] && !isLocked(c)) ?? null;
    },
    [cipherText, solution, isLocked]
  );

  const finishIfSolved = useCallback(
    (g: GuessMap, hintCount: number, wrong: number) => {
      if (!isSolved(g, solution)) return;
      api.complete({
        outcome: 'solved',
        score: hintCount === 0 ? 'No hints' : `${hintCount} hint${hintCount === 1 ? '' : 's'}`,
        hints: hintCount,
        mistakes: wrong,
        details: { letters: Object.keys(solution).length, given: givenCipher.length },
        grid: `🔐 ${hintCount ? '💡'.repeat(Math.min(hintCount, 8)) : '✨ no hints'}`,
      });
    },
    [api, solution, givenCipher.length]
  );

  const type = useCallback(
    (plain: string) => {
      const target = selected ?? firstOpen;
      if (!target || isLocked(target)) return;
      // A plain letter fixed by a given or a hint can't be reused elsewhere.
      if (plain && Object.entries(guesses).some(([c, p]) => p === plain && isLocked(c))) return;
      const next = assign(guesses, target, plain);
      const wrongNow = Boolean(plain) && solution[target] !== plain;
      if (wrongNow) setMistakes(m => m + 1);
      setGuesses(next);
      if (plain) setSelected(nextOpen(target, next));
      finishIfSolved(next, hinted.length, mistakes + (wrongNow ? 1 : 0));
    },
    [
      selected,
      firstOpen,
      isLocked,
      guesses,
      setGuesses,
      nextOpen,
      finishIfSolved,
      hinted.length,
      solution,
      mistakes,
      setMistakes,
    ]
  );

  const hint = () => {
    const c = pickHint(guesses, solution, cipherText, selected);
    if (!c || api.finished) return;
    const next = assign(guesses, c, solution[c]);
    const nextHinted = [...hinted, c];
    setGuesses(next);
    setHinted(nextHinted);
    setSelected(nextOpen(c, next));
    finishIfSolved(next, nextHinted.length, mistakes);
  };

  useEffect(() => {
    if (api.finished) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Typing belongs to an open dialog (the tutorial, the coded quote).
      if (document.querySelector('[aria-modal="true"]')) return;
      if (/^[a-z]$/i.test(e.key)) type(e.key.toUpperCase());
      else if (e.key === 'Backspace' || e.key === 'Delete') type('');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [type, api.finished]);

  const usedPlain = new Set(Object.values(guesses));
  const active = selected ?? firstOpen;

  return (
    <div className="space-y-5">
      <div className="flex justify-end -mb-2">
        <button
          onClick={() => setShowCipher(true)}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border text-sm font-bold"
          style={{ borderColor: T.cardBorder, color: T.brandText, background: T.cardBg }}
        >
          <ScrollText size={14} /> View the coded quote
        </button>
      </div>

      <CipherPopup
        open={showCipher}
        onClose={() => setShowCipher(false)}
        cipherText={cipherText}
        guesses={api.finished ? solution : guesses}
        solution={solution}
      />

      <div
        className="rounded-3xl border-2 p-4 sm:p-5 flex flex-wrap gap-x-4 gap-y-4 justify-center"
        style={{ background: T.cardBg, borderColor: T.cardBorder }}
        role="group"
        aria-label="Cipher text"
      >
        {cipherText.split(' ').map((word, wi) => (
          <div key={wi} className="flex gap-1">
            {[...word].map((ch, ci) => {
              if (!solution[ch]) {
                return (
                  <span
                    key={ci}
                    className="self-end pb-5 text-lg font-extrabold"
                    style={{ color: T.textMuted }}
                  >
                    {ch}
                  </span>
                );
              }
              const guess = guesses[ch] ?? '';
              const locked = givenCipher.includes(ch) || hinted.includes(ch);
              const isActive = ch === active && !api.finished;
              const wrongAtEnd = api.finished && guess !== solution[ch];
              return (
                <button
                  key={ci}
                  onClick={() => !isLocked(ch) && setSelected(ch)}
                  aria-label={`Cipher ${ch}${guess ? `, guessed ${guess}` : ''}`}
                  className="flex flex-col items-center"
                  style={{ cursor: isLocked(ch) ? 'default' : 'pointer' }}
                >
                  <span
                    className="w-7 h-8 sm:w-8 sm:h-9 rounded-lg flex items-center justify-center border-b-[3px]"
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: '1.15rem',
                      background: isActive ? `${ACCENT}26` : locked ? T.successBg : T.inputBg,
                      borderColor: isActive ? ACCENT : locked ? T.successBorder : T.inputBorder,
                      color: locked
                        ? isDark
                          ? '#6EE7B7'
                          : '#047857'
                        : wrongAtEnd
                          ? '#EF4444'
                          : T.heading,
                    }}
                  >
                    {api.finished ? solution[ch] : guess}
                  </span>
                  <span
                    className="text-xs font-extrabold mt-0.5"
                    style={{ color: isActive ? ACCENT : T.textMuted }}
                  >
                    {ch}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {api.finished ? (
        <p className="text-center font-bold" style={{ color: T.text }}>
          — {puzzle.author},{' '}
          <a
            href={puzzle.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:underline"
            style={{ color: T.brandText }}
          >
            {puzzle.source.label} <ExternalLink size={12} />
          </a>
        </p>
      ) : (
        <>
          {/* On-screen keyboard: needed on phones, handy everywhere. */}
          <div
            className="grid grid-cols-9 sm:grid-cols-13 gap-1.5"
            role="group"
            aria-label="Letters"
          >
            {[...ALPHABET].map(l => (
              <button
                key={l}
                onClick={() => type(l)}
                className="py-2.5 rounded-xl border text-sm font-extrabold"
                style={{
                  background: usedPlain.has(l) ? T.inputBg : T.cardBg,
                  borderColor: T.cardBorder,
                  color: usedPlain.has(l) ? T.textMuted : T.heading,
                  opacity: usedPlain.has(l) ? 0.6 : 1,
                }}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => type('')}
              className="py-2.5 rounded-2xl border-2 flex items-center justify-center gap-2 text-sm font-extrabold"
              style={{ borderColor: T.cardBorder, color: T.brandText, background: T.cardBg }}
            >
              <Delete size={15} /> Clear letter
            </button>
            <button
              onClick={hint}
              className="py-2.5 rounded-2xl border-2 flex items-center justify-center gap-2 text-sm font-extrabold"
              style={{ borderColor: T.streakBorder, color: T.streakText, background: T.fodderBg }}
            >
              <Lightbulb size={15} /> Reveal a letter{hinted.length ? ` (${hinted.length})` : ''}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * The whole coded quote written out as a sentence — the board breaks it into
 * letter boxes, which makes word shapes and punctuation harder to read —
 * with the decoding so far beneath it and how often each code letter appears.
 */
function CipherPopup({
  open,
  onClose,
  cipherText,
  guesses,
  solution,
}: {
  open: boolean;
  onClose: () => void;
  cipherText: string;
  guesses: GuessMap;
  solution: GuessMap;
}) {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const decoded = [...cipherText].map(ch => (solution[ch] ? (guesses[ch] ?? '_') : ch)).join('');
  const counts = Object.entries(
    [...cipherText].reduce<Record<string, number>>((acc, ch) => {
      if (solution[ch]) acc[ch] = (acc[ch] ?? 0) + 1;
      return acc;
    }, {})
  ).sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]));

  const mono: React.CSSProperties = {
    fontFamily: "ui-monospace, 'SFMono-Regular', Menlo, monospace",
    fontSize: '1.05rem',
    letterSpacing: '0.18em',
    lineHeight: 1.8,
    wordBreak: 'break-word',
  };

  return (
    <Modal open={open} onClose={onClose} label="The coded quote" maxWidth={560}>
      <div className="p-5 sm:p-6 space-y-4">
        <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.3rem', color: T.heading }}>
          📜 The coded quote
        </h2>
        <div>
          <p className="text-xs font-extrabold mb-1" style={{ color: T.textMuted }}>
            AS WRITTEN
          </p>
          <p
            className="rounded-2xl px-4 py-3 font-bold"
            style={{ ...mono, background: T.inputBg, color: ACCENT }}
          >
            {cipherText}
          </p>
        </div>
        <div>
          <p className="text-xs font-extrabold mb-1" style={{ color: T.textMuted }}>
            YOUR DECODING SO FAR
          </p>
          <p
            className="rounded-2xl px-4 py-3 font-bold"
            style={{ ...mono, background: T.inputBg, color: T.heading }}
          >
            {decoded}
          </p>
        </div>
        <div>
          <p className="text-xs font-extrabold mb-1.5" style={{ color: T.textMuted }}>
            HOW OFTEN EACH CODE LETTER APPEARS
          </p>
          <div className="flex flex-wrap gap-1.5">
            {counts.map(([c, n]) => (
              <span
                key={c}
                className="rounded-lg px-2 py-1 text-xs font-extrabold border"
                style={{ borderColor: T.cardBorder, color: T.text, background: T.cardBg }}
              >
                {c} × {n}
                {guesses[c] ? <span style={{ color: T.textMuted }}> → {guesses[c]}</span> : null}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
