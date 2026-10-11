import { m } from 'motion/react';
import { useDarkMode } from '../context/DarkModeContext';
import { getTheme } from '../theme';

export type MascotMood = 'default' | 'thinking' | 'celebrating' | 'hint' | 'wrong' | 'correct';

interface MascotProps {
  mood?: MascotMood;
  size?: number;
  speechBubble?: string;
  bubbleDirection?: 'left' | 'right';
  animate?: boolean;
}

/**
 * Ollie: the artwork in public/owl.webp. Moods show as the bounce or shake
 * in Mascot plus a small flourish beside the owl.
 */
function Owl({ mood }: { mood: MascotMood }) {
  const happy = mood === 'celebrating' || mood === 'correct';
  return (
    <div className="relative w-full h-full">
      <img
        src="/owl.webp"
        alt=""
        aria-hidden
        draggable={false}
        className="w-full h-full object-contain select-none"
      />
      {happy && (
        <>
          <span className="absolute -left-1 top-[18%] text-[0.9em]" aria-hidden>
            ✨
          </span>
          <span className="absolute -right-1 top-[8%] text-[0.75em]" aria-hidden>
            ⭐
          </span>
        </>
      )}
      {mood === 'thinking' && (
        <span className="absolute -right-2 top-0 flex items-end gap-0.5" aria-hidden>
          <span className="w-1.5 h-1.5 rounded-full bg-violet-300/70" />
          <span className="w-2 h-2 rounded-full bg-violet-300/80" />
          <span className="w-3 h-3 rounded-full bg-violet-300/90" />
        </span>
      )}
      {mood === 'hint' && (
        <span className="absolute -right-1 top-[4%] text-[0.85em]" aria-hidden>
          💡
        </span>
      )}
    </div>
  );
}

export function Mascot({
  mood = 'default',
  size = 100,
  speechBubble,
  bubbleDirection = 'right',
  animate = true,
}: MascotProps) {
  const { isDark } = useDarkMode();
  const T = getTheme(isDark);
  const bubbleStyle = { background: T.bubbleBg, borderColor: T.bubbleBorder };
  const bounceAnimation =
    mood === 'celebrating'
      ? { y: [0, -12, 0, -8, 0], transition: { duration: 0.7, repeat: Infinity, repeatDelay: 1.5 } }
      : mood === 'wrong'
        ? { x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.5 } }
        : animate
          ? { y: [0, -4, 0], transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } }
          : {};

  // The bubble sits beside the owl in normal flow, so the pair centres
  // together and can never run off a narrow screen.
  const bubble = (corner: string) =>
    speechBubble && (
      <div
        className="relative min-w-0 border-2 rounded-2xl px-3 py-2 sm:px-4 sm:py-3 shadow-lg max-w-[150px] sm:max-w-[220px] mb-1 sm:mb-4"
        style={{ ...bubbleStyle, borderRadius: corner }}
      >
        <p
          style={{
            fontFamily: "'Nunito', sans-serif",
            fontSize: '0.75rem',
            lineHeight: '1.35',
            color: T.bubbleText,
          }}
          className="sm:text-[0.82rem]"
        >
          {speechBubble}
        </p>
      </div>
    );

  return (
    <div className="relative inline-flex items-end gap-2 sm:gap-3 max-w-full">
      {bubbleDirection === 'left' && bubble('18px 18px 4px 18px')}
      <m.div
        style={{ width: size, height: size }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        animate={bounceAnimation as any}
        className="flex-shrink-0"
      >
        <Owl mood={mood} />
      </m.div>
      {bubbleDirection === 'right' && bubble('18px 18px 18px 4px')}
    </div>
  );
}
