import type { TutorialStep } from '../TutorialFlow';
import { Line, Pill, Stack } from '../tutorialVisuals';
import { LetterPattern } from './LetterPattern';

const ACCENT = '#10B981';

// Example about the Gateway of India — never the day's question.
export function getTriviaTutorial(): TutorialStep[] {
  return [
    {
      title: 'One question, told as a story',
      visual: (
        <Stack gap={6}>
          <Line tone="muted">Built to mark a British king and queen's landing in 1911…</Line>
          <Line tone="muted">The last British troops to leave India marched out through it…</Line>
          <Line>It still faces the Arabian Sea in Mumbai. What is it?</Line>
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
          <Line tone="bad">Marine Drive ✗</Line>
          <Line tone="good">Gateway of India ✓</Line>
          <Pill color={ACCENT}>4 guesses · typos forgiven</Pill>
        </Stack>
      ),
      body: (
        <p>
          There are no options to choose from. You get four guesses, and small slips in spelling
          still count.
        </p>
      ),
    },
    {
      title: 'One hint: the letter pattern',
      visual: (
        <Line tone="focus">
          <span className="inline-flex items-center gap-2">
            💡 <LetterPattern answer="Gateway of India" />
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
