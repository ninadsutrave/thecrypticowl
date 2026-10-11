import type { MascotMood } from './Mascot';

const NAVY = '#2D1B69';
const BODY = '#C4B5FD';
const WING = '#A78BFA';
const FEATHER = '#8B7BDC';
const PALE = '#EDE9FE';
const IRIS = '#F2C14E';
const PUPIL = '#1E1B4B';
const BEAK = '#EA6A0C';

/**
 * Ollie, drawn on a 100 × 118 canvas: bowler hat, pointed ear tufts, white
 * facial discs meeting in a V, amber eyes, a diamond beak, scalloped wings
 * and orange feet. One drawing for the mascot, the navbar mark and the
 * favicon (public/favicon.svg mirrors the default mood).
 */
export function OwlArt({ mood = 'default' }: { mood?: MascotMood }) {
  const happy = mood === 'celebrating' || mood === 'correct';
  const sad = mood === 'wrong';
  const wink = mood === 'hint';
  const thinking = mood === 'thinking';

  const eye = (cx: number, closed: boolean) =>
    closed ? (
      <path
        d={`M ${cx - 9} 59 Q ${cx} 51 ${cx + 9} 59`}
        stroke={PUPIL}
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
    ) : (
      <>
        <circle cx={cx} cy={58} r="10" fill={IRIS} />
        <circle cx={thinking ? cx - 1.5 : cx} cy={sad ? 59.5 : 58} r="5.8" fill={PUPIL} />
        <circle cx={cx + 2.6} cy={55.4} r="1.9" fill="white" />
      </>
    );

  return (
    <>
      {/* Ear tufts */}
      <path d="M 21 58 Q 17 34 20 15 Q 31 25 42 30 Z" fill={WING} />
      <path d="M 79 58 Q 83 34 80 15 Q 69 25 58 30 Z" fill={WING} />

      {/* Head and body */}
      <path
        d="M 50 28 C 72 28 82 44 82 66 C 82 92 70 110 50 110 C 30 110 18 92 18 66 C 18 44 28 28 50 28 Z"
        fill={BODY}
      />

      {/* Belly */}
      <path
        d="M 32 96 C 32 80 41 74 50 74 C 59 74 68 80 68 96 C 68 106 60 110 50 110 C 40 110 32 106 32 96 Z"
        fill={PALE}
      />

      {/* Facial discs: white rings meeting in a V */}
      <circle cx="35" cy="58" r="17.5" fill={PALE} />
      <circle cx="65" cy="58" r="17.5" fill={PALE} />
      <circle cx="35" cy="58" r="15.5" fill="white" />
      <circle cx="65" cy="58" r="15.5" fill="white" />

      {/* Eyes */}
      {eye(35, happy)}
      {eye(65, happy || wink)}

      {/* Brows for the thinking and sad moods */}
      {thinking && (
        <path
          d="M 24 41 Q 35 37 46 42"
          stroke={NAVY}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      )}
      {sad && (
        <>
          <path
            d="M 24 43 Q 35 39 46 44"
            stroke={NAVY}
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 54 44 Q 65 39 76 43"
            stroke={NAVY}
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </>
      )}

      {/* Beak */}
      <path d="M 50 65 L 44 71 L 50 81 L 56 71 Z" fill={BEAK} />
      <path d="M 51.5 68 L 54 71 L 51.5 74 Z" fill="#FB923C" opacity="0.8" />

      {/* Wings with scalloped feathers */}
      <path
        d="M 22 72 C 12 82 12 100 22 106 C 28 109 34 108 36 106 C 34 92 30 80 22 72 Z"
        fill={WING}
      />
      <path
        d="M 78 72 C 88 82 88 100 78 106 C 72 109 66 108 64 106 C 66 92 70 80 78 72 Z"
        fill={WING}
      />
      <g stroke={FEATHER} strokeWidth="1.6" strokeLinecap="round" fill="none">
        <path d="M 17 88 Q 21 92 25 88 Q 28 92 31 89" />
        <path d="M 19 97 Q 23 101 27 97 Q 30 100 33 98" />
        <path d="M 83 88 Q 79 92 75 88 Q 72 92 69 89" />
        <path d="M 81 97 Q 77 101 73 97 Q 70 100 67 98" />
      </g>

      {/* Feet */}
      <g fill="#F97316">
        <path d="M 38 108 L 36 115 L 39 112 L 41 116 L 43 112 L 46 115 L 45 108 Z" />
        <path d="M 55 108 L 54 115 L 57 112 L 59 116 L 61 112 L 64 115 L 62 108 Z" />
      </g>

      {/* Bowler hat */}
      <path d="M 37 30 L 37 19 Q 37 7 50 7 Q 63 7 63 19 L 63 30 Z" fill={NAVY} />
      <path d="M 37 23.5 Q 50 26 63 23.5 L 63 29 Q 50 31.5 37 29 Z" fill="#7C3AED" />
      <path
        d="M 29 27.5 Q 31 25 33.5 27.5 Q 50 34 66.5 27.5 Q 69 25 71 27.5 Q 72 31 67 33.5 Q 50 39 33 33.5 Q 28 31 29 27.5 Z"
        fill={NAVY}
      />
      <path
        d="M 41 15 Q 42.5 10.5 47 9.5"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
        opacity="0.3"
      />

      {/* Celebration sparkles */}
      {happy && (
        <>
          <text x="4" y="40" fontSize="10" opacity="0.85">
            ✨
          </text>
          <text x="84" y="44" fontSize="8" opacity="0.85">
            ⭐
          </text>
        </>
      )}

      {/* Thinking bubbles */}
      {thinking && (
        <>
          <circle cx="80" cy="40" r="2.5" fill={WING} opacity="0.5" />
          <circle cx="86" cy="33" r="3.5" fill={WING} opacity="0.6" />
          <circle cx="93" cy="25" r="5" fill={WING} opacity="0.7" />
        </>
      )}
    </>
  );
}
