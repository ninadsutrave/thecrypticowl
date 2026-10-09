import { m, AnimatePresence } from 'motion/react';
import { ArrowRight, Check, Split, X } from 'lucide-react';
import { useDarkMode } from '../../context/DarkModeContext';
import { getTheme } from '../../theme';
import { GameShell, type PlayApi } from '../GameShell';
import { GameLoading } from '../GameLoading';
import { useDailyPuzzle } from '../useDailyPuzzle';
import { useGameState } from '../useGameState';
import { parseTrivia } from './parse';
import { SAMPLE_TRIVIA, type TriviaQuestion } from './sample';
import { getTriviaTutorial } from './tutorial';

const ACCENT = '#10B981';

export function TriviaGame() {
  const {
    puzzle: questions,
    isPractice,
    loading,
  } = useDailyPuzzle('trivia', SAMPLE_TRIVIA, parseTrivia);
  if (loading || !questions) return <GameLoading gameId="trivia" />;
  return (
    <GameShell
      gameId="trivia"
      practice={isPractice}
      puzzleId={questions.map(q => q.question).join('|')}
      subtitle={`${questions.length} questions · Medium`}
      tutorial={getTriviaTutorial(questions.length)}
      rules={
        <>
          <p>
            {questions.length} multiple-choice questions, one at a time. Pick an answer to lock it
            in. There's no going back!
          </p>
          <p>
            After each answer you'll see the fact behind it. Your score is out of {questions.length}
            .
          </p>
          <p>
            You have one hint for the whole quiz: a <strong>50:50</strong> that removes two wrong
            answers from a question. Save it for the one you really need.
          </p>
        </>
      }
    >
      {api => <TriviaBoard questions={questions} api={api} />}
    </GameShell>
  );
}

function TriviaBoard({ questions, api }: { questions: TriviaQuestion[]; api: PlayApi }) {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const [index, setIndex] = useGameState(api, 'index', 0);
  const [picks, setPicks] = useGameState<number[]>(api, 'picks', []);
  // The one 50:50 per quiz: which question it was spent on, and what it removed.
  const [fifty, setFifty] = useGameState<{ question: number; removed: number[] } | null>(
    api,
    'fifty',
    null
  );

  const q = questions[index];
  const picked = picks[index];
  const answered = picked !== undefined;
  const score = picks.filter((p, i) => p === questions[i].answer).length;
  const isLast = index === questions.length - 1;

  const choose = (option: number) => {
    if (answered || api.finished) return;
    const next = [...picks];
    next[index] = option;
    setPicks(next);
    if (isLast) {
      const final = next.filter((p, i) => p === questions[i].answer).length;
      api.complete({
        outcome: 'solved',
        score: `${final}/${questions.length} correct${fifty ? ' · 50:50' : ''}`,
        hints: fifty ? 1 : 0,
        mistakes: questions.length - final,
        details: { correct: final, total: questions.length },
        grid: next.map((p, i) => (p === questions[i].answer ? '🟩' : '🟥')).join(''),
      });
    }
  };

  const applyFifty = () => {
    if (fifty || answered) return;
    // Keep the answer and the wrong option just after it; drop the other two.
    const keep = (q.answer + 1) % q.options.length;
    const removed = q.options.map((_, i) => i).filter(i => i !== q.answer && i !== keep);
    setFifty({ question: index, removed });
  };
  const removedHere = fifty?.question === index ? fifty.removed : [];

  return (
    <div className="space-y-4">
      {/* Progress: one pip per question, coloured once answered. */}
      <div
        className="flex gap-1.5"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={questions.length}
        aria-valuenow={index + 1}
        aria-label={`Question ${index + 1} of ${questions.length}`}
      >
        {questions.map((qq, i) => {
          const p = picks[i];
          const colour =
            p === undefined
              ? i === index
                ? ACCENT
                : T.cardBorder
              : p === qq.answer
                ? '#10B981'
                : '#EF4444';
          return (
            <span
              key={i}
              className="h-2 flex-1 rounded-full"
              style={{ background: colour, opacity: p === undefined && i !== index ? 0.6 : 1 }}
            />
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <m.div
          key={index}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.2 }}
          className="rounded-3xl border-2 p-5"
          style={{ background: T.cardBg, borderColor: T.cardBorder }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="rounded-full px-2.5 py-1 text-xs font-extrabold"
              style={{ background: `${ACCENT}22`, color: isDark ? '#6EE7B7' : '#047857' }}
            >
              {q.category}
            </span>
            <span className="text-xs font-extrabold" style={{ color: T.textMuted }}>
              {index + 1} / {questions.length} · Score {score}
            </span>
          </div>
          <h2
            style={{
              fontFamily: "'Nunito', sans-serif",
              fontWeight: 800,
              fontSize: 'clamp(1.05rem, 3.4vw, 1.25rem)',
              color: T.heading,
              lineHeight: 1.45,
            }}
          >
            {q.question}
          </h2>

          <div className="grid gap-2 mt-4 sm:grid-cols-2">
            {q.options.map((opt, i) => {
              if (removedHere.includes(i)) {
                return (
                  <div
                    key={opt}
                    className="px-4 py-3 rounded-2xl border-2 border-dashed"
                    style={{ borderColor: T.cardBorder, color: T.textMuted, opacity: 0.5 }}
                    aria-hidden
                  >
                    <span className="line-through">{opt}</span>
                  </div>
                );
              }
              const isAnswer = i === q.answer;
              const isPicked = i === picked;
              const state = !answered ? 'idle' : isAnswer ? 'right' : isPicked ? 'wrong' : 'dim';
              return (
                <button
                  key={opt}
                  onClick={() => choose(i)}
                  disabled={answered}
                  className="text-left px-4 py-3 rounded-2xl border-2 font-bold flex items-center justify-between gap-2 transition-colors"
                  style={{
                    background:
                      state === 'right' ? T.successBg : state === 'wrong' ? T.wrongBg : T.inputBg,
                    borderColor:
                      state === 'right'
                        ? T.successBorder
                        : state === 'wrong'
                          ? T.wrongBorder
                          : T.inputBorder,
                    color: T.text,
                    opacity: state === 'dim' ? 0.55 : 1,
                    cursor: answered ? 'default' : 'pointer',
                  }}
                >
                  {opt}
                  {state === 'right' && <Check size={18} color="#10B981" />}
                  {state === 'wrong' && <X size={18} color="#EF4444" />}
                </button>
              );
            })}
          </div>

          {!answered && !api.finished && (
            <button
              onClick={applyFifty}
              disabled={fifty !== null}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-sm font-extrabold disabled:opacity-40"
              style={{ borderColor: T.streakBorder, color: T.streakText, background: T.fodderBg }}
            >
              <Split size={14} /> {fifty ? '50:50 used' : 'Hint: 50:50 (one per quiz)'}
            </button>
          )}

          {answered && (
            <m.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 text-sm rounded-2xl px-4 py-3"
              style={{ background: T.brandSurface, color: T.text, lineHeight: 1.6 }}
            >
              <strong>{picked === q.answer ? 'Correct! ' : 'Not quite. '}</strong>
              {q.fact}
              {q.source && (
                <>
                  {' '}
                  <a
                    href={q.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline"
                    style={{ color: T.brandText }}
                  >
                    Source
                  </a>
                </>
              )}
            </m.p>
          )}
        </m.div>
      </AnimatePresence>

      {answered && !isLast && (
        <button
          onClick={() => setIndex(i => i + 1)}
          className="w-full py-3 rounded-2xl font-extrabold flex items-center justify-center gap-2"
          style={{ background: ACCENT, color: 'white' }}
          autoFocus
        >
          Next question <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}
