import type { TutorialStep } from '../TutorialFlow';
import { Cells, Line, Pill, Stack } from '../tutorialVisuals';

const ACCENT = '#EC4899';

// Example: THE → XGH. Never today's key.
export function getCryptogramTutorial(): TutorialStep[] {
  return [
    {
      title: 'Every letter is in disguise',
      visual: (
        <Stack>
          <Cells items={['', '', '']} sub={['X', 'G', 'H']} tones={['muted', 'muted', 'muted']} />
          <Pill color={ACCENT}>XGH could be THE</Pill>
        </Stack>
      ),
      body: (
        <p>
          A famous saying has been written in code: each letter swapped for a different one, the
          same swap all the way through. If X stands for T once, it stands for T everywhere.
        </p>
      ),
    },
    {
      title: 'One guess fills them all',
      visual: (
        <Stack>
          <Cells
            items={['T', 'H', 'E']}
            sub={['X', 'G', 'H']}
            tones={['focus', 'plain', 'plain']}
          />
          <Line tone="muted">Tap X, type T → every X becomes T</Line>
        </Stack>
      ),
      body: (
        <p>
          Tap a coded letter, then type (or tap) what you think it really is. Every copy of it fills
          in at once. A couple of letters are given to start you off.
        </p>
      ),
    },
    {
      title: 'Where to start',
      visual: (
        <div className="flex flex-wrap gap-1.5 justify-center max-w-[300px]">
          <Pill color={ACCENT}>One-letter words: A or I</Pill>
          <Pill color={ACCENT}>THE · AND</Pill>
          <Pill color={ACCENT}>Commonest letter: often E</Pill>
          <Pill color={ACCENT}>Repeated patterns</Pill>
        </div>
      ),
      body: (
        <p>
          Short words are the way in. Commas and apostrophes stay where they are, so use them too.
        </p>
      ),
    },
    {
      title: 'Hints and the coded quote',
      visual: (
        <Stack gap={6}>
          <Line tone="focus">💡 Reveal a letter</Line>
          <Line>📜 View the coded quote</Line>
        </Stack>
      ),
      body: (
        <p>
          A hint reveals one letter: the one you've selected, or the commonest one still unsolved.
          “View the coded quote” shows the whole thing written out, with your decoding so far.
        </p>
      ),
    },
  ];
}
