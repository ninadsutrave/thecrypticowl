import type { TutorialStep } from '../TutorialFlow';
import { makeGrid } from './logic';
import { MiniLoop } from './MiniLoop';

// A 3×3 example with exactly one loop (checked with the Lambda's solver),
// opening the way every daily puzzle can: a 0 directly above a 3. Never a
// daily puzzle.
const CLUES = '101333222';
const LOOP = '000101010111000011111001';
const g = makeGrid(3, 3);
const loop = new Set([...LOOP].flatMap((ch, e) => (ch === '1' ? [e] : [])));
const loopEdges = [...loop];
const on = (cell: number) => g.cellEdges[cell].filter(e => loop.has(e));
const off = (cell: number) => g.cellEdges[cell].filter(e => !loop.has(e));
const ZERO = 1; // top middle
const THREE = 4; // centre, right below it

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
      visual: <MiniLoop rows={3} cols={3} clues={CLUES} lines={on(3)} crosses={off(3)} />,
      body: (
        <p>
          Each number says how many of its four sides the loop uses: this 3 uses three, so one side
          is crossed out. A number turns green when it's exactly right, red if it has too many.
          Swipe through the dots to draw; tap between two dots to cross that side out.
        </p>
      ),
    },
    {
      title: 'Start where a 0 meets a 3',
      visual: (
        <MiniLoop rows={3} cols={3} clues={CLUES} lines={on(THREE)} crosses={g.cellEdges[ZERO]} />
      ),
      body: (
        <p>
          Every puzzle has a 0 right next to a 3, and that's where to begin. Cross out all four
          sides of the 0. The side it shares with the 3 is now off, so the 3's other three sides
          must all be on: draw them, and the loop is under way.
        </p>
      ),
    },
    {
      title: 'Close the loop',
      visual: (
        <MiniLoop rows={3} cols={3} clues={CLUES} lines={loopEdges} crosses={g.cellEdges[ZERO]} />
      ),
      body: (
        <p>
          Every puzzle has exactly one loop. Stuck? A hint fixes a wrong line or draws a missing
          piece, and counts towards your result. On a keyboard: arrows move, Shift + arrow draws or
          erases.
        </p>
      ),
    },
  ];
}
