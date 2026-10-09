import type { TutorialStep } from '../TutorialFlow';
import { Line, Pill, Stack } from '../tutorialVisuals';

const ACCENT = '#10B981';

// Example question about Canada — not in today's set.
export function getTriviaTutorial(count: number): TutorialStep[] {
  return [
    {
      title: `${count} questions, one at a time`,
      visual: (
        <Stack gap={6}>
          <Line>What is the capital city of Canada?</Line>
          <div className="grid grid-cols-2 gap-1.5" style={{ width: 280 }}>
            <Line width={137}>Toronto</Line>
            <Line width={137}>Ottawa</Line>
            <Line width={137}>Vancouver</Line>
            <Line width={137}>Montreal</Line>
          </div>
        </Stack>
      ),
      body: (
        <p>
          Geography, science, history, art, music and more, at medium difficulty. Tap an answer to
          lock it in. There's no changing your mind!
        </p>
      ),
    },
    {
      title: 'Learn the story behind it',
      visual: (
        <Stack gap={6}>
          <Line tone="good">Ottawa ✓</Line>
          <Line tone="muted">Queen Victoria chose Ottawa as the capital in 1857.</Line>
        </Stack>
      ),
      body: <p>Right or wrong, you'll see the fact behind the answer before moving on.</p>,
    },
    {
      title: 'One 50:50 per quiz',
      visual: (
        <Stack gap={6}>
          <div className="grid grid-cols-2 gap-1.5" style={{ width: 280 }}>
            <Line width={137} tone="muted">
              <span className="line-through">Toronto</span>
            </Line>
            <Line width={137}>Ottawa</Line>
            <Line width={137}>Vancouver</Line>
            <Line width={137} tone="muted">
              <span className="line-through">Montreal</span>
            </Line>
          </div>
          <Pill color={ACCENT}>Two wrong answers removed</Pill>
        </Stack>
      ),
      body: (
        <p>
          You get one hint for the whole quiz: a 50:50 that strikes out two wrong answers. Save it
          for the question that stumps you.
        </p>
      ),
    },
  ];
}
