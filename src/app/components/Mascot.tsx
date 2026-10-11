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

function OwlSVG({ mood = 'default' }: { mood: MascotMood }) {
  const isHappy = mood === 'celebrating' || mood === 'correct';
  const isSad = mood === 'wrong';
  const isWinking = mood === 'hint';
  const isThinking = mood === 'thinking';

  return (
    <svg
      viewBox="0 0 100 118"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      {/* Ear tufts: pointed, so the silhouette reads as an owl */}
      <path d="M 22 42 L 20 6 L 44 30 Z" fill="#7C3AED" />
      <path d="M 78 42 L 80 6 L 56 30 Z" fill="#7C3AED" />
      <path d="M 25 38 L 24 14 L 40 30 Z" fill="#A78BFA" />
      <path d="M 75 38 L 76 14 L 60 30 Z" fill="#A78BFA" />

      {/* Head and body in one round shape */}
      <ellipse cx="50" cy="70" rx="35" ry="42" fill="#A78BFA" />

      {/* Belly with feather chevrons */}
      <ellipse cx="50" cy="88" rx="21" ry="21" fill="#EDE9FE" />
      <g stroke="#C4B5FD" strokeWidth="1.6" strokeLinecap="round" fill="none">
        <path d="M 41 82 L 44 85 L 47 82" />
        <path d="M 53 82 L 56 85 L 59 82" />
        <path d="M 47 90 L 50 93 L 53 90" />
        <path d="M 39 95 L 42 98 L 45 95" />
        <path d="M 55 95 L 58 98 L 61 95" />
      </g>

      {/* Facial disc: the pale ring round each eye */}
      <circle cx="37" cy="55" r="16" fill="#EDE9FE" />
      <circle cx="63" cy="55" r="16" fill="#EDE9FE" />

      {/* Brow ridge: the owl's V between the eyes */}
      <path
        d="M 23 40 Q 37 35 50 47 Q 63 35 77 40"
        stroke="#7C3AED"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* Magnifying glass on belt/body */}
      <circle
        cx="82"
        cy="80"
        r="9"
        stroke="#FCD34D"
        strokeWidth="2.5"
        fill="rgba(252,211,77,0.15)"
      />
      <line
        x1="88"
        y1="87"
        x2="94"
        y2="93"
        stroke="#FCD34D"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Left eye white */}
      <circle cx="37" cy="55" r="12" fill="white" />
      <circle cx="37" cy="55" r="12" fill="none" stroke="#7C3AED" strokeWidth="1.5" opacity="0.3" />

      {/* Right eye white */}
      {!isWinking && <circle cx="63" cy="55" r="12" fill="white" />}
      {!isWinking && (
        <circle
          cx="63"
          cy="55"
          r="12"
          fill="none"
          stroke="#7C3AED"
          strokeWidth="1.5"
          opacity="0.3"
        />
      )}

      {/* Eye irises and pupils - LEFT */}
      {isHappy ? (
        <path
          d="M 26 55 Q 37 46 48 55"
          stroke="#1E1B4B"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
      ) : isSad ? (
        <>
          <circle cx="37" cy="56" r="7.5" fill="#FCD34D" />
          <circle cx="37" cy="57" r="4" fill="#1E1B4B" />
          <circle cx="39" cy="55" r="1.5" fill="white" />
        </>
      ) : (
        <>
          <circle cx="37" cy="55" r="7.5" fill="#FCD34D" />
          <circle cx={isThinking ? '36' : '37'} cy="55" r="4" fill="#1E1B4B" />
          <circle cx={isThinking ? '38' : '39'} cy="53" r="1.5" fill="white" />
        </>
      )}

      {/* Eye iris and pupil - RIGHT */}
      {isHappy ? (
        <path
          d="M 52 55 Q 63 46 74 55"
          stroke="#1E1B4B"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
      ) : isWinking ? (
        <path
          d="M 52 55 Q 63 48 74 55"
          stroke="#1E1B4B"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
      ) : isSad ? (
        <>
          <circle cx="63" cy="56" r="7.5" fill="#FCD34D" />
          <circle cx="63" cy="57" r="4" fill="#1E1B4B" />
          <circle cx="65" cy="55" r="1.5" fill="white" />
        </>
      ) : (
        <>
          <circle cx="63" cy="55" r="7.5" fill="#FCD34D" />
          <circle cx="63" cy="55" r="4" fill="#1E1B4B" />
          <circle cx="65" cy="53" r="1.5" fill="white" />
        </>
      )}

      {/* Thinking eyebrow */}
      {isThinking && (
        <path
          d="M 28 44 Q 37 40 46 44"
          stroke="#7C3AED"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      )}

      {/* Sad eyebrows */}
      {isSad && (
        <>
          <path
            d="M 28 45 Q 37 42 46 46"
            stroke="#7C3AED"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 54 46 Q 63 42 72 45"
            stroke="#7C3AED"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </>
      )}

      {/* Beak: hooked, pointing down */}
      <path d="M 50 60 L 44.5 66 Q 47 74 50 79 Q 53 74 55.5 66 Z" fill="#F97316" />
      <path d="M 50 60 L 44.5 66 L 55.5 66 Z" fill="#FDBA74" />
      {isHappy && (
        <path
          d="M 43 80 Q 50 85 57 80"
          stroke="#7C3AED"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
      )}

      {/* Left wing */}
      <ellipse cx="19" cy="80" rx="10" ry="21" fill="#7C3AED" transform="rotate(-12 19 80)" />
      <ellipse cx="20" cy="78" rx="6" ry="15" fill="#8B5CF6" transform="rotate(-12 20 78)" />

      {/* Right wing (shorter to show magnifying glass) */}
      <ellipse cx="81" cy="80" rx="10" ry="21" fill="#7C3AED" transform="rotate(12 81 80)" />
      <ellipse cx="80" cy="78" rx="6" ry="15" fill="#8B5CF6" transform="rotate(12 80 78)" />

      {/* Feet */}
      <g stroke="#F97316" strokeWidth="2.2" strokeLinecap="round" fill="none">
        <path d="M 37 110 L 31 118 M 37 110 L 37 118 M 37 110 L 43 118" />
        <path d="M 63 110 L 57 118 M 63 110 L 63 118 M 63 110 L 69 118" />
      </g>

      {/* Celebrating stars */}
      {isHappy && (
        <>
          <text x="8" y="42" fontSize="10" opacity="0.85">
            ✨
          </text>
          <text x="78" y="38" fontSize="8" opacity="0.85">
            ⭐
          </text>
          <text x="72" y="55" fontSize="7" opacity="0.7">
            ✨
          </text>
        </>
      )}

      {/* Thinking dots */}
      {isThinking && (
        <>
          <circle cx="78" cy="42" r="2.5" fill="#A78BFA" opacity="0.5" />
          <circle cx="84" cy="36" r="3.5" fill="#A78BFA" opacity="0.6" />
          <circle cx="91" cy="28" r="5" fill="#A78BFA" opacity="0.7" />
        </>
      )}
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
