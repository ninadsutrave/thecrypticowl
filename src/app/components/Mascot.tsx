import { m } from 'motion/react';
import { useDarkMode } from '../context/DarkModeContext';
import { getTheme } from '../theme';
import { OwlArt } from './OwlArt';

export type MascotMood = 'default' | 'thinking' | 'celebrating' | 'hint' | 'wrong' | 'correct';

interface MascotProps {
  mood?: MascotMood;
  size?: number;
  speechBubble?: string;
  bubbleDirection?: 'left' | 'right';
  animate?: boolean;
}

function OwlSVG({ mood = 'default' }: { mood: MascotMood }) {
  return (
    <svg
      viewBox="0 0 100 118"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <OwlArt mood={mood} />
    </svg>
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
        <OwlSVG mood={mood} />
      </m.div>
      {bubbleDirection === 'right' && bubble('18px 18px 18px 4px')}
    </div>
  );
}
