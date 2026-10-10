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
          <Line>Kangchenjunga · ?</Line>
          <Line tone="focus">Nanda Devi · ?</Line>
        </Stack>
      ),
      body: (
        <p>
          Each day has a theme, today: <strong>{puzzle.title}</strong> You see two things, with
          their numbers hidden. Is the new one higher or lower than the first?
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
          <Line>Kangchenjunga · 8,586 m</Line>
          <Line tone="good">Nanda Devi · 7,816 m ✓</Line>
        </Stack>
      ),
      body: (
        <p>
          Call it, and both numbers are revealed. The new one becomes the first card of the next
          round. Pairs are always close, never tied.
        </p>
      ),
    },
    {
      title: 'One hint: a number',
      visual: <Line tone="focus">💡 Kangchenjunga: 8,586 m</Line>,
      body: (
        <p>
          Unsure? Once per game, the hint shows the first card's number to judge against. It's noted
          in your result. Get a majority of the rounds right to solve the puzzle.
        </p>
      ),
    },
  ];
}
