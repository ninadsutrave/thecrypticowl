import type { TutorialStep } from '../TutorialFlow';
import { makeGrid } from './logic';
import { MiniLoop } from './MiniLoop';

// A 3×3 example with exactly one loop (checked with the Lambda's solver):
// the outline of an L of three cells. Never a daily puzzle.
const CLUES = '320231110';
const LOOP = '100010110000110010100000';
const g = makeGrid(3, 3);
const loopEdges = [...LOOP].flatMap((ch, e) => (ch === '1' ? [e] : []));
// The 3 in the top-left corner: three of its sides drawn, the fourth crossed.
const corner = [g.h(0, 0), g.v(0, 0)];
// Sides already known to be empty: under the 3, and all round the 0.
const crossed = [g.h(1, 0), g.h(0, 2), g.h(1, 2), g.v(0, 2), g.v(0, 3)];

export function getSlitherlinkTutorial(): TutorialStep[] {
  return [
    {
      title: 'Draw one loop',
      visual: <MiniLoop rows={3} cols={3} clues={CLUES} lines={[]} />,
      body: (
        <p>
          Join the dots into a single closed loop. It never branches, crosses or touches itself.
        </p>
      ),
    },
    {
      title: 'Numbers count the sides',
      visual: <MiniLoop rows={3} cols={3} clues={CLUES} lines={corner} crosses={crossed} />,
      body: (
        <p>
          Each number says how many of its four sides the loop uses. A 3 in a corner uses both outer
          sides; a 0 uses none. Drag through the dots to draw, tap a side to cross it out.
        </p>
      ),
    },
    {
      title: 'Close the loop',
      visual: <MiniLoop rows={3} cols={3} clues={CLUES} lines={loopEdges} />,
      body: (
        <p>
          Every puzzle has exactly one loop. Stuck? A hint fixes a wrong line or draws a missing
          piece, and counts towards your result.
        </p>
      ),
    },
  ];
}
