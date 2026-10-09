import { describe, expect, it } from 'vitest';
import {
  CROSS,
  edgeBetween,
  emptyMarks,
  isSolved,
  LINE,
  makeGrid,
  nearestEdge,
  nextHint,
  type Mark,
} from './logic';
import { parseSlitherlink } from './parse';
import { SAMPLE_SLITHERLINK as P } from './sample';

const solutionMarks = (s: string) => [...s].map(ch => (ch === '1' ? LINE : 0)) as Mark[];

describe('geometry', () => {
  const g = makeGrid(3, 3);
  it('finds the nearest edge to a tap', () => {
    expect(nearestEdge(g, 0.5, 0.1)).toBe(g.h(0, 0));
    expect(nearestEdge(g, 1.05, 1.5)).toBe(g.v(1, 1));
    expect(nearestEdge(g, 3.4, 2.5)).toBe(g.v(2, 3));
    expect(nearestEdge(g, 9, 9)).toBeNull();
  });
  it('joins neighbouring dots only', () => {
    expect(edgeBetween(g, [1, 1], [1, 2])).toBe(g.h(1, 1));
    expect(edgeBetween(g, [2, 0], [1, 0])).toBe(g.v(1, 0));
    expect(edgeBetween(g, [0, 0], [1, 1])).toBeNull();
  });
});

describe('the sample', () => {
  const g = makeGrid(P.rows, P.cols);
  it('parses, and its solution solves it', () => {
    expect(parseSlitherlink(P)).not.toBeNull();
    expect(parseSlitherlink({ ...P, solution: '01' })).toBeNull();
    expect(isSolved(g, solutionMarks(P.solution), P.clues)).toBe(true);
    expect(isSolved(g, emptyMarks(P), P.clues)).toBe(false);
  });

  it('hints fix a wrong line first, then draw a missing one', () => {
    const marks = emptyMarks(P);
    const wrongEdge = [...P.solution].indexOf('0');
    marks[wrongEdge] = LINE;
    expect(nextHint(marks, P.solution)).toEqual({ edge: wrongEdge, mark: CROSS });
    marks[wrongEdge] = CROSS;
    expect(nextHint(marks, P.solution)).toEqual({ edge: [...P.solution].indexOf('1'), mark: LINE });
    expect(nextHint(solutionMarks(P.solution), P.solution)).toBeNull();
  });
});
