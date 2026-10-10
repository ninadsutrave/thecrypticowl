import type { TutorialStep } from '../TutorialFlow';
import { Line, Pill, Stack } from '../tutorialVisuals';
import type { HigherLowerPuzzle } from './sample';

const ACCENT = '#0F766E';

// A worked example (Himalayan peaks), never a day's actual chain.
export function getHigherLowerTutorial(puzzle: HigherLowerPuzzle): TutorialStep[] {
  return [
    {
      title: 'One question, five rounds',
      visual: (
        <Stack gap={6}>
          <Line>Kangchenjunga · 8,586 m</Line>
          <Line tone="focus">Nanda Devi · ?</Line>
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
            <Pill color="#64748B">▲ Higher</Pill>
            <Pill color={ACCENT}>▼ Lower</Pill>
          </div>
          <Line tone="good">Nanda Devi · 7,816 m ✓</Line>
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
      visual: <Line tone="focus">💡 Nanda Devi: about 8,000 m</Line>,
      body: (
        <p>
          Unsure? Once per game, the hint gives the hidden number to one figure. It's noted in your
          result. Get a majority of the rounds right to solve the puzzle.
        </p>
      ),
    },
  ];
}
