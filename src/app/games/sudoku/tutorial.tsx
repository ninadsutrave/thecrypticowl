import type { TutorialStep } from '../TutorialFlow';
import { CageExample, Cells, Pill, Stack } from '../tutorialVisuals';
import type { SudokuPuzzle } from './sample';
import { VARIANTS, WEEKLY_ROTATION, type SudokuVariant } from './variants';

const ACCENT = '#0EA5E9';

const VISUALS: Partial<Record<SudokuVariant, () => React.ReactNode>> = {
  killer: () => (
    <Stack>
      <CageExample sum={3} digits={[1, 2]} />
      <Pill color={ACCENT}>1 + 2 = 3, no repeats</Pill>
    </Stack>
  ),
  kropki: () => (
    <Stack>
      <div className="flex items-center gap-1">
        <Cells items={[4]} tones={['good']} />
        <span className="w-3 h-3 rounded-full border-2 border-slate-500 bg-white" />
        <Cells items={[5]} tones={['good']} />
        <span className="w-4" />
        <Cells items={[3]} tones={['good']} />
        <span className="w-3 h-3 rounded-full bg-slate-800 border-2 border-slate-500" />
        <Cells items={[6]} tones={['good']} />
      </div>
      <Pill color={ACCENT}>White: next-door numbers · Black: double</Pill>
    </Stack>
  ),
  thermo: () => (
    <Stack>
      <Cells items={[2, 5, 8]} tones={['good', 'good', 'good']} />
      <Pill color={ACCENT}>Rising from the bulb: 2 → 5 → 8</Pill>
    </Stack>
  ),
};

export function getSudokuTutorial(puzzle: SudokuPuzzle): TutorialStep[] {
  const n = puzzle.size;
  const info = VARIANTS[puzzle.variant];
  const row = Array.from({ length: n }, (_, i) => ((i * 2) % n) + 1);
  return [
    {
      title: 'Every row, column and box',
      visual: (
        <Stack>
          <Cells items={row} tones={row.map(() => 'good')} />
          <Pill color={ACCENT}>Each of 1–{n} exactly once</Pill>
        </Stack>
      ),
      body: (
        <p>
          The classic rule still applies: every row, every column and every {puzzle.boxRows}×
          {puzzle.boxCols} box holds the digits 1 to {n}, each exactly once.
        </p>
      ),
    },
    {
      title: `Today's twist: ${info.name}`,
      visual: VISUALS[puzzle.variant]?.() ?? <Pill color={ACCENT}>{info.name}</Pill>,
      body: (
        <>
          <p>{info.rule}</p>
          <p>{info.example}</p>
        </>
      ),
    },
    {
      title: 'Tap, type, take notes',
      visual: (
        <Stack>
          <div className="flex gap-2 flex-wrap justify-center">
            <Pill color={ACCENT}>✏️ Notes</Pill>
            <Pill color="#D97706">💡 Hint: reveals a number</Pill>
          </div>
          <Cells items={[3, 3]} tones={['bad', 'bad']} />
        </Stack>
      ),
      body: (
        <p>
          Tap a cell, then a number (or type it). Turn on Notes to pencil in candidates. Clashes
          turn red straight away. Stuck? A hint fills in the right number, and counts towards your
          result.
        </p>
      ),
    },
    {
      title: 'A new twist every day',
      visual: (
        <div className="flex flex-wrap gap-1.5 justify-center max-w-[300px]">
          {WEEKLY_ROTATION.map(v => (
            <Pill key={v} color={v === puzzle.variant ? ACCENT : '#64748B'}>
              {VARIANTS[v].day} · {VARIANTS[v].name}
            </Pill>
          ))}
        </div>
      ),
      body: (
        <p>
          Each day of the week has its own variant, all at medium difficulty. The clock starts when
          you close this and pauses whenever you leave the page.
        </p>
      ),
    },
  ];
}
