import type { TutorialStep } from '../../games/TutorialFlow';
import { Line, Pill, Stack } from '../../games/tutorialVisuals';
import { KnowMoreLinks } from './KnowMoreLinks';

const DEF = '#2563EB';
const IND = '#7C3AED';
const FOD = '#D97706';

/** Where "Know more" leads: tabs of the Learn page. */
const MORE = [
  { to: '/learn#parts', label: 'The parts of a clue' },
  { to: '/learn#wordplay', label: 'Every type of wordplay' },
  { to: '/learn#indicators', label: 'Indicator words, by type' },
  { to: '/learn#examples', label: 'Sample clues, worked through' },
  { to: '/learn#cheatsheet', label: 'Cheat sheet: common substitutions' },
  { to: '/learn#glossary', label: 'Glossary' },
];

// The worked example is the classic anagram from the Learn page, never a daily clue.
export function getCrypticTutorial(): TutorialStep[] {
  return [
    {
      title: 'Two halves, one answer',
      visual: (
        <Stack gap={6}>
          <Line>Stone broken becomes musical sounds (5)</Line>
          <div className="flex gap-1.5">
            <Pill color={IND}>wordplay</Pill>
            <Pill color={DEF}>definition</Pill>
          </div>
        </Stack>
      ),
      body: (
        <p>
          Every cryptic clue is two clues in one: a plain <strong>definition</strong> of the answer,
          and <strong>wordplay</strong> that builds the same answer another way. Read it as a
          sentence and you'll be misled; that's the fun.
        </p>
      ),
    },
    {
      title: 'The definition sits at one end',
      visual: (
        <Stack gap={6}>
          <Line tone="muted">Stone broken becomes</Line>
          <Line tone="focus">musical sounds</Line>
        </Stack>
      ),
      body: (
        <p>
          The definition is always the very start or the very end of the clue, never the middle.
          Here it's "musical sounds". The number in brackets is the answer's length: (5).
        </p>
      ),
    },
    {
      title: 'Wordplay builds the answer',
      visual: (
        <div className="flex flex-wrap gap-1.5 justify-center max-w-[300px]">
          {[
            'Anagram',
            'Hidden',
            'Charade',
            'Container',
            'Reversal',
            'Homophone',
            'Deletion',
            'Double definition',
          ].map(t => (
            <Pill key={t} color={IND}>
              {t}
            </Pill>
          ))}
        </div>
      ),
      body: (
        <p>
          The other half assembles the answer from pieces: scrambling letters, hiding the word
          inside others, joining short words, putting one inside another, reading backwards,
          sounding alike, or chopping letters off.
        </p>
      ),
    },
    {
      title: 'Indicators tell you how',
      visual: (
        <Stack gap={6}>
          <Line>broken, wild, mixed → anagram</Line>
          <Line>in, holding, about → container</Line>
          <Line>back, returned → reversal</Line>
          <Line>we hear, they say → homophone</Line>
        </Stack>
      ),
      body: (
        <p>
          Wordplay is signposted. An <strong>indicator</strong> word tells you which tool to use,
          and the <strong>fodder</strong> is what it works on.
        </p>
      ),
    },
    {
      title: 'Put it together',
      visual: (
        <Stack gap={6}>
          <div className="flex flex-wrap gap-1.5 justify-center">
            <Pill color={FOD}>Stone</Pill>
            <Pill color={IND}>broken</Pill>
            <span className="text-sm font-bold">becomes</span>
            <Pill color={DEF}>musical sounds</Pill>
          </div>
          <Line tone="good">STONE scrambled → TONES ✓</Line>
        </Stack>
      ),
      body: (
        <p>
          "Broken" says anagram; the fodder is STONE; "becomes" just links the halves. Rearranged,
          STONE gives TONES, and tones are musical sounds. Both halves agree: that's your answer.
        </p>
      ),
    },
    {
      title: 'Hints, one step at a time',
      visual: (
        <Stack gap={6}>
          <Line>1. Show the definition</Line>
          <Line>2. Show the indicator</Line>
          <Line>3. Show the fodder</Line>
          <Line tone="muted">4. Explain the wordplay</Line>
        </Stack>
      ),
      body: (
        <p>
          Stuck? Each hint reveals one more part of the clue, so you can stop as soon as it clicks.
          You can always reveal the answer, and every reveal teaches something.
        </p>
      ),
    },
    {
      title: 'Know more',
      visual: <KnowMoreLinks items={MORE} />,
      body: (
        <p>
          That's all you need to start. When you want more, the full guide covers every kind of
          wordplay, the common indicator words, worked examples and a glossary.
        </p>
      ),
    },
  ];
}
