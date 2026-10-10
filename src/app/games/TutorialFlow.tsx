import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, ArrowRight, BookOpen, Play } from 'lucide-react';
import { Modal } from '../components/Modal';
import { useDarkMode } from '../context/DarkModeContext';
import { getTheme } from '../theme';
import type { GameMeta } from './registry';
import { GameIcon } from './GameIcon';

export interface TutorialStep {
  title: string;
  body: ReactNode;
  /** A small worked example drawn above the text. */
  visual?: ReactNode;
}

/**
 * A step-by-step walkthrough of one game, shown as a dialog. The clock is
 * paused while it is open (GameShell passes `paused` to the timer).
 */
export function TutorialFlow({
  game,
  steps,
  open,
  onClose,
  finalLink,
}: {
  game: GameMeta;
  steps: TutorialStep[];
  open: boolean;
  onClose: () => void;
  /** A third button on the last step, e.g. Know more → the full guide. */
  finalLink?: { to: string; label: string };
}) {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const [index, setIndex] = useState(0);

  // Every opening starts from the first step.
  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  const step = steps[index];
  const last = index === steps.length - 1;
  if (!step) return null;

  return (
    <Modal open={open} onClose={onClose} label={`How to play ${game.name}`}>
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4 pr-8">
          <GameIcon gameId={game.id} size={32} />
          <p className="text-xs font-extrabold" style={{ color: T.textMuted, margin: 0 }}>
            HOW TO PLAY · {game.name.toUpperCase()}
          </p>
        </div>

        {step.visual && (
          <div
            className="rounded-2xl border px-3 py-5 mb-4 flex items-center justify-center"
            style={{ background: T.inputBg, borderColor: T.cardBorder, minHeight: 120 }}
            aria-hidden
          >
            {step.visual}
          </div>
        )}

        <h2
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '1.3rem',
            color: T.heading,
            marginBottom: 6,
          }}
        >
          {step.title}
        </h2>
        <div className="text-sm space-y-2" style={{ color: T.textSub, lineHeight: 1.6 }}>
          {step.body}
        </div>

        {last && finalLink ? (
          <div className="mt-6 space-y-3">
            <Dots steps={steps.length} index={index} accent={game.accent} empty={T.cardBorder} />
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setIndex(i => i - 1)}
                className="min-h-[42px] px-2 rounded-xl border-2 text-sm font-extrabold flex items-center justify-center gap-1 whitespace-nowrap"
                style={{ borderColor: T.cardBorder, color: T.brandText }}
              >
                <ArrowLeft size={14} className="hidden sm:inline" /> Back
              </button>
              <button
                onClick={onClose}
                className="min-h-[42px] px-2 rounded-xl text-sm font-extrabold flex items-center justify-center gap-1.5 whitespace-nowrap"
                style={{ background: game.accent, color: 'white' }}
                autoFocus
              >
                <Play size={14} className="hidden sm:inline" /> Let's play
              </button>
              <Link
                to={finalLink.to}
                onClick={onClose}
                className="min-h-[42px] px-2 rounded-xl border-2 text-sm font-extrabold flex items-center justify-center gap-1.5 whitespace-nowrap no-underline"
                style={{
                  borderColor: T.brandBorder,
                  color: T.brandText,
                  background: T.brandSurface,
                }}
              >
                <BookOpen size={14} className="hidden sm:inline" /> {finalLink.label}
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between mt-6 gap-3">
            <div
              className="flex gap-1 sm:gap-1.5 min-w-0"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={steps.length}
              aria-valuenow={index + 1}
              aria-label={`Step ${index + 1} of ${steps.length}`}
            >
              {steps.map((_, i) => (
                <span
                  key={i}
                  className="h-2 rounded-full"
                  style={{
                    width: i === index ? 18 : 8,
                    background: i <= index ? game.accent : T.cardBorder,
                  }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              {index > 0 ? (
                <button
                  onClick={() => setIndex(i => i - 1)}
                  className="px-3 py-2 rounded-xl border-2 text-sm font-extrabold flex items-center gap-1 whitespace-nowrap"
                  style={{ borderColor: T.cardBorder, color: T.brandText }}
                >
                  <ArrowLeft size={14} /> Back
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="px-3 py-2 rounded-xl text-sm font-extrabold"
                  style={{ color: T.textMuted }}
                >
                  Skip
                </button>
              )}
              <button
                onClick={() => (last ? onClose() : setIndex(i => i + 1))}
                className="px-4 py-2 rounded-xl text-sm font-extrabold flex items-center gap-1.5 whitespace-nowrap"
                style={{ background: game.accent, color: 'white' }}
                autoFocus
              >
                {last ? (
                  <>
                    <Play size={14} /> Let's play
                  </>
                ) : (
                  <>
                    Next <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/** Step dots: done and current in the game's colour. */
function Dots({
  steps,
  index,
  accent,
  empty,
}: {
  steps: number;
  index: number;
  accent: string;
  empty: string;
}) {
  return (
    <div
      className="flex justify-center gap-1.5"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={steps}
      aria-valuenow={index + 1}
      aria-label={`Step ${index + 1} of ${steps}`}
    >
      {Array.from({ length: steps }, (_, i) => (
        <span
          key={i}
          className="h-2 rounded-full"
          style={{ width: i === index ? 18 : 8, background: i <= index ? accent : empty }}
        />
      ))}
    </div>
  );
}
