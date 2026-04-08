import { motion } from 'motion/react';

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
      {/* Ear tufts */}
      <ellipse cx="31" cy="26" rx="8" ry="14" fill="#A78BFA" transform="rotate(-22 31 26)" />
      <ellipse cx="69" cy="26" rx="8" ry="14" fill="#A78BFA" transform="rotate(22 69 26)" />
      <ellipse cx="31" cy="26" rx="5" ry="10" fill="#C4B5FD" transform="rotate(-22 31 26)" />
      <ellipse cx="69" cy="26" rx="5" ry="10" fill="#C4B5FD" transform="rotate(22 69 26)" />

      {/* Body */}
      <ellipse cx="50" cy="74" rx="32" ry="36" fill="#C4B5FD" />

      {/* Belly */}
      <ellipse cx="50" cy="82" rx="19" ry="24" fill="#EDE9FE" />

      {/* Belly texture lines */}
      <path
        d="M 43 74 Q 50 71 57 74"
        stroke="#C4B5FD"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M 42 80 Q 50 77 58 80"
        stroke="#C4B5FD"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />

      {/* Detective hat brim */}
      <rect x="18" y="34" width="64" height="7" rx="3.5" fill="#2D1B69" />

      {/* Hat top */}
      <rect x="27" y="10" width="46" height="28" rx="8" fill="#2D1B69" />

      {/* Hat band */}
      <rect x="27" y="30" width="46" height="6" fill="#7C3AED" rx="1.5" />

      {/* Hat shine */}
      <path
        d="M 33 14 Q 38 12 43 15"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.25"
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

      {/* Beak */}
      {isHappy ? (
        <>
          <polygon points="50,65 43,73 57,73" fill="#F97316" />
          <path
            d="M 44 72 Q 50 78 56 72"
            stroke="#EA580C"
            strokeWidth="1.5"
            fill="#FED7AA"
            strokeLinecap="round"
          />
        </>
      ) : isSad ? (
        <>
          <polygon points="50,67 44,72 56,72" fill="#F97316" />
          <path
            d="M 44 75 Q 50 71 56 75"
            stroke="#EA580C"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
        </>
      ) : (
        <polygon points="50,65 43,73 57,73" fill="#F97316" />
      )}

      {/* Left wing */}
      <ellipse cx="17" cy="82" rx="11" ry="20" fill="#A78BFA" transform="rotate(-15 17 82)" />
      <ellipse cx="17" cy="82" rx="7" ry="14" fill="#C4B5FD" transform="rotate(-15 17 82)" />

      {/* Right wing (shorter to show magnifying glass) */}
      <ellipse cx="83" cy="82" rx="11" ry="20" fill="#A78BFA" transform="rotate(15 83 82)" />
      <ellipse cx="83" cy="82" rx="7" ry="14" fill="#C4B5FD" transform="rotate(15 83 82)" />

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
  const bounceAnimation =
    mood === 'celebrating'
      ? { y: [0, -12, 0, -8, 0], transition: { duration: 0.7, repeat: Infinity, repeatDelay: 1.5 } }
      : mood === 'wrong'
        ? { x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.5 } }
        : animate
          ? { y: [0, -4, 0], transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } }
          : {};

  return (
    <div className="relative inline-flex items-center">
      {speechBubble && bubbleDirection === 'left' && (
        <div className="absolute right-full mr-3 bottom-4 z-10">
          <div
            className="relative bg-white border-2 border-[#C4B5FD] rounded-2xl px-4 py-3 shadow-lg max-w-[200px]"
            style={{ borderRadius: '18px 18px 4px 18px' }}
          >
            <p
              style={{
                fontFamily: "'Nunito', sans-serif",
                fontSize: '0.82rem',
                color: '#4C1D95',
                lineHeight: '1.4',
              }}
            >
              {speechBubble}
            </p>
          </div>
        </div>
      )}

      <motion.div
        style={{ width: size, height: size }}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        animate={bounceAnimation as any}
        className="flex-shrink-0"
      >
        <OwlSVG mood={mood} />
      </motion.div>

      {speechBubble && bubbleDirection === 'right' && (
        <div className="absolute left-full ml-3 bottom-4 z-10">
          <div
            className="relative bg-white border-2 border-[#C4B5FD] rounded-2xl px-4 py-3 shadow-lg max-w-[220px]"
            style={{ borderRadius: '18px 18px 18px 4px' }}
          >
            <p
              style={{
                fontFamily: "'Nunito', sans-serif",
                fontSize: '0.82rem',
                color: '#4C1D95',
                lineHeight: '1.4',
              }}
            >
              {speechBubble}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
