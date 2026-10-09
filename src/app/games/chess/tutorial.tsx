import type { TutorialStep } from '../TutorialFlow';
import { Line, Pill, Stack } from '../tutorialVisuals';
import { pieceSrc } from './pieces';

const ACCENT = '#64748B';

export function getChessTutorial(mateIn: number): TutorialStep[] {
  return [
    {
      title: 'Your opponent just moved',
      visual: (
        <Stack>
          <div
            className="grid grid-cols-3 rounded-lg overflow-hidden"
            style={{ width: 132, height: 132 }}
          >
            {[null, 'bK', null, null, null, null, 'wQ', null, null].map((p, i) => (
              <span
                key={i}
                className="flex items-center justify-center"
                style={{
                  background:
                    i === 1 || i === 6 ? 'rgba(250, 204, 21, 0.55)' : i % 2 ? '#8F7CC9' : '#EEE9F7',
                }}
              >
                {p && (
                  <img
                    src={pieceSrc({ color: p[0] as 'w' | 'b', type: p[1] })}
                    alt=""
                    className="w-[85%] h-[85%]"
                  />
                )}
              </span>
            ))}
          </div>
          <Pill color={ACCENT}>Yellow squares = the last move</Pill>
        </Stack>
      ),
      body: (
        <p>
          The puzzle starts with your opponent's move, highlighted in yellow. Your pieces are at the
          bottom of the board.
        </p>
      ),
    },
    {
      title: `Force checkmate in ${mateIn}`,
      visual: (
        <div className="flex flex-wrap gap-1.5 justify-center">
          <Pill color={ACCENT}>Your move</Pill>
          <Pill color={ACCENT}>Their reply</Pill>
          <Pill color={ACCENT}>Your move</Pill>
          <Pill color="#10B981">… checkmate!</Pill>
        </div>
      ),
      body: (
        <p>
          Find moves that leave your opponent no escape, whatever they reply. The computer plays
          their best defence. Checks, captures and threats are good places to start looking.
        </p>
      ),
    },
    {
      title: 'Tap a piece, then a square',
      visual: (
        <Stack gap={6}>
          <Line>1. Tap one of your pieces: its moves show as dots</Line>
          <Line>2. Tap a dotted square to play it</Line>
        </Stack>
      ),
      body: (
        <p>
          A wrong move is taken back straight away. It doesn't end the puzzle, but it's counted in
          your result.
        </p>
      ),
    },
    {
      title: 'Stuck? Ask for the next move',
      visual: <Line tone="focus">💡 Next move: Qg5+</Line>,
      body: (
        <p>
          A hint highlights the next move on the board and names it. You can take one hint per move;
          each counts towards your result.
        </p>
      ),
    },
  ];
}
