import type { TutorialStep } from '../TutorialFlow';
import { Line, Pill, Stack } from '../tutorialVisuals';
import type { HigherLowerPuzzle } from './sample';

const ACCENT = '#0F766E';

// A worked example (mountains), never a day's actual chain.
export function getHigherLowerTutorial(puzzle: HigherLowerPuzzle): TutorialStep[] {
  return [
    {
      title: 'One question, five rounds',
      visual: (
        <Stack gap={6}>
          <Line>Mont Blanc · 4,806 m</Line>
          <Line tone="focus">Mount Kilimanjaro · ?</Line>
        </Stack>
      ),
      body: (
        <p>
          Each day has a theme, today: <strong>{puzzle.title}</strong> You see one thing with its
          number and a new one with it hidden.
        </p>
      ),
    },
    {
      title: 'Higher or lower?',
      visual: (
        <Stack gap={6}>
          <div className="flex gap-1.5">
            <Pill color={ACCENT}>▲ Higher</Pill>
            <Pill color="#64748B">▼ Lower</Pill>
          </div>
          <Line tone="good">Mount Kilimanjaro · 5,895 m ✓</Line>
        </Stack>
      ),
      body: (
        <p>
          Call it, and the hidden number is revealed. The new one becomes the next round's known
          one. Pairs are always close, never tied.
        </p>
      ),
    },
    {
      title: 'One hint: a ballpark',
      visual: <Line tone="focus">💡 Mount Kilimanjaro: about 6,000 m</Line>,
      body: (
        <p>
          Unsure? Once per game, the hint gives the hidden number to one figure. It's noted in your
          result. Get a majority of the rounds right to solve the puzzle.
        </p>
      ),
    },
  ];
}
