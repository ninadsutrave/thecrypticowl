import type { TutorialStep } from '../TutorialFlow';
import { MiniGrid } from './MiniGrid';
import type { Rect } from './sample';

// A 4×4 example with exactly one answer (checked with the Lambda's solver);
// never a daily puzzle.
const CLUES = [
  { r: 0, c: 0, n: 3 },
  { r: 1, c: 3, n: 4 },
  { r: 3, c: 0, n: 3 },
  { r: 1, c: 2, n: 4 },
  { r: 3, c: 2, n: 2 },
];
const ANSWER: Rect[] = [
  { r: 0, c: 0, h: 1, w: 3 },
  { r: 0, c: 3, h: 4, w: 1 },
  { r: 1, c: 0, h: 3, w: 1 },
  { r: 1, c: 1, h: 2, w: 2 },
  { r: 3, c: 1, h: 1, w: 2 },
];

export function getShikakuTutorial(): TutorialStep[] {
  return [
    {
      title: 'Cut the grid into rectangles',
      visual: <MiniGrid clues={CLUES} rects={[]} />,
      body: (
        <p>
          Every cell ends up in exactly one rectangle, and every rectangle holds exactly one number.
        </p>
      ),
    },
    {
      title: 'The number is the area',
      visual: <MiniGrid clues={CLUES} rects={ANSWER.slice(0, 1)} draft={ANSWER[3]} />,
      body: (
        <p>
          A 4 covers four cells: 2×2, 1×4 or 4×1. Drag from one corner to the opposite one to draw
          it. Tap a rectangle to remove it.
        </p>
      ),
    },
    {
      title: 'Fill the grid',
      visual: <MiniGrid clues={CLUES} rects={ANSWER} />,
      body: (
        <p>
          There's exactly one way to cut each puzzle. Stuck? A hint reveals one rectangle of the
          answer, and counts towards your result.
        </p>
      ),
    },
  ];
}
