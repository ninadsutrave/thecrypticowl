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
          their numbers hidden. Tap the one you think is higher.
        </p>
      ),
    },
    {
      title: 'Tap your pick',
      visual: (
        <Stack gap={6}>
          <Line tone="good">Kangchenjunga · 8,586 m ✓</Line>
          <Line>Nanda Devi · 7,816 m</Line>
          <Pill color={ACCENT}>Taller: Kangchenjunga</Pill>
        </Stack>
      ),
      body: (
        <p>
          Tap a card, and both numbers are revealed. The new one becomes the first card of the next
          round. Pairs are always close, never tied.
        </p>
      ),
    },
    {
      title: 'One hint',
      visual: <Line tone="focus">💡 Nanda Devi: about 8,000 m</Line>,
      body: (
        <p>
          Each revealed number stays on show for the next round. Unsure? Once per game, a hint gives
          a rough figure for the card you can't see yet. It's noted in your result. Get a majority
          of the rounds right to solve the puzzle.
        </p>
      ),
    },
  ];
}
