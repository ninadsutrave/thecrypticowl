import type { TutorialStep } from '../TutorialFlow';
import { Line, Pill, Stack } from '../tutorialVisuals';
import { LetterPattern } from './LetterPattern';

const ACCENT = '#10B981';

// Example about the Ferris wheel — never the day's question.
export function getTriviaTutorial(): TutorialStep[] {
  return [
    {
      title: 'One question, told as a story',
      visual: (
        <Stack gap={6}>
          <Line tone="muted">Chicago's 1893 fair wanted to outdo Paris's iron tower…</Line>
          <Line tone="muted">A young bridge engineer sketched his answer over dinner…</Line>
          <Line>It still carries his surname. What is it called?</Line>
        </Stack>
      ),
      body: (
        <p>
          Each sentence is a clue, from oblique to telling. Connect them: the answer usually clicks
          near the end.
        </p>
      ),
    },
    {
      title: 'Type your answer',
      visual: (
        <Stack gap={6}>
          <Line tone="bad">Big wheel ✗</Line>
          <Line tone="good">Ferris wheel ✓</Line>
          <Pill color={ACCENT}>3 guesses · typos forgiven</Pill>
        </Stack>
      ),
      body: (
        <p>
          There are no options to choose from. You get three guesses, and small slips in spelling
          still count.
        </p>
      ),
    },
    {
      title: 'One hint: the letter pattern',
      visual: (
        <Line tone="focus">
          <span className="inline-flex items-center gap-2">
            💡 <LetterPattern answer="Ferris wheel" />
          </span>
        </Line>
      ),
      body: (
        <p>
          Stuck? The hint shows the answer's first letter and the length of each word. It's noted in
          your result.
        </p>
      ),
    },
  ];
}
