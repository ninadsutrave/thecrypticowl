import type { TutorialStep } from '../TutorialFlow';
import { Cells, Line, Pill, Stack } from '../tutorialVisuals';

const ACCENT = '#D97706';

// Example events are illustrative, not today's.
export function getChronologyTutorial(count: number): TutorialStep[] {
  return [
    {
      title: 'Same date, different years',
      visual: (
        <Stack gap={6}>
          <Line>The Titanic sets sail</Line>
          <Line>The first Moon landing</Line>
          <Line>The Berlin Wall falls</Line>
        </Stack>
      ),
      body: (
        <p>
          You get {count} moments from history that all happened on today's calendar date, in
          different years. Your job: put them in order.
        </p>
      ),
    },
    {
      title: 'Earliest at the top',
      visual: (
        <Stack gap={6}>
          <Line>↑↓ The Titanic sets sail</Line>
          <Line tone="focus">↑↓ The first Moon landing</Line>
          <Line>↑↓ The Berlin Wall falls</Line>
        </Stack>
      ),
      body: <p>Use the arrows on each event to move it up or down. Earliest goes at the top.</p>,
    },
    {
      title: 'Three checks',
      visual: (
        <Stack gap={4}>
          <Cells items={['', '', '']} tones={['bad', 'good', 'bad']} size={26} />
          <Cells items={['', '', '']} tones={['good', 'good', 'good']} size={26} />
          <Pill color={ACCENT}>Solved on check 2</Pill>
        </Stack>
      ),
      body: (
        <p>
          Press Check when you're happy. Events in the right place lock in green; the rest stay
          movable. You have three checks to get them all.
        </p>
      ),
    },
    {
      title: 'One hint',
      visual: <Line tone="focus">💡 “The first Moon landing” happened in 1969.</Line>,
      body: (
        <p>
          Once per puzzle you can reveal the year of the event at the top of your list. One fixed
          point can unlock the rest.
        </p>
      ),
    },
  ];
}
