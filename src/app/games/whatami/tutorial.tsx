import type { TutorialStep } from '../TutorialFlow';
import { Line, Pill, Stack } from '../tutorialVisuals';

const ACCENT = '#F97316';

// Example answer: The Beatles. Never today's answer.
export function getWhatAmITutorial(): TutorialStep[] {
  return [
    {
      title: 'Five clues, hardest first',
      visual: (
        <Stack gap={6}>
          <Line tone="focus">1 · Four of us cut our teeth playing clubs in Hamburg. · 5 pts</Line>
          <Line tone="muted">🔒 Clue 2 · 4 pts</Line>
          <Line tone="muted">🔒 Clue 3 · 3 pts</Line>
        </Stack>
      ),
      body: (
        <p>
          Something is hiding behind five clues: a country, a person, a band, a brand, a festival.
          The category is shown at the top. Clue 1 is the vaguest; clue 5 nearly gives it away.
        </p>
      ),
    },
    {
      title: 'Guess early, score more',
      visual: (
        <Stack gap={6}>
          <Line tone="bad">✗ “Rolling Stones” → clue 2 opens</Line>
          <Line tone="good">✓ “the beatles” · 4 points</Line>
        </Stack>
      ),
      body: (
        <>
          <p>
            Guess on clue 1 for 5 points, on clue 2 for 4, and so on. A wrong guess opens the next
            clue, so guess boldly but not wildly.
          </p>
          <p>Capitals, accents and small typos don't matter, but a different answer won't pass.</p>
        </>
      ),
    },
    {
      title: 'One hint',
      visual: (
        <Stack>
          <Line tone="focus">💡 Starts with “T” · 3 words: 3, 7</Line>
          <Pill color={ACCENT}>Costs 1 point</Pill>
        </Stack>
      ),
      body: (
        <p>
          Once per puzzle you can see the answer's first letter and length. It costs a point, but a
          correct answer always scores at least one.
        </p>
      ),
    },
  ];
}
