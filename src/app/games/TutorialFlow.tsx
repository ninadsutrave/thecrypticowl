import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Play } from 'lucide-react';
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
}: {
  game: GameMeta;
  steps: TutorialStep[];
  open: boolean;
  onClose: () => void;
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
      </div>
    </Modal>
  );
}
