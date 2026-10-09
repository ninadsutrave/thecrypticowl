import { describe, expect, it } from 'vitest';
// The Lambdas are plain JS with no shared types, so this test is the
// contract: what a generator stores must be what the board accepts.
import { generateSudoku } from '../../../lambda/games/sudoku/generator.js';
import { WEEKLY_ROTATION } from '../../../lambda/games/sudoku/variants.js';
import { spec as cryptogramSpec } from '../../../lambda/games/cryptogram/index.js';
import { toPuzzle } from '../../../lambda/games/chess/lichess.js';
import { generateChronology } from '../../../lambda/games/chronology/selector.js';
import { createRng } from '../../../lambda/shared/runtime/random.js';
import { BANK as TRIVIA_BANK } from '../../../lambda/games/trivia/bank.js';
import lichessFixture from '../../../lambda/games/chess/fixtures/lichess-J588J.json';
import { parseSudoku } from './sudoku/parse';
import { parseCryptogram } from './cryptogram/parse';
import { parseChess } from './chess/parse';
import { parseChronology } from './chronology/parse';
import { parseWhatAmI } from './whatami/parse';
import { parseTrivia } from './trivia/parse';
import { findConflicts, matchesSolution } from './sudoku/logic';

describe('Lambda payloads parse on the frontend', () => {
  for (const variant of WEEKLY_ROTATION) {
    it(`sudoku: ${variant}`, () => {
      const payload = JSON.parse(JSON.stringify(generateSudoku(variant, createRng(variant))));
      const parsed = parseSudoku(payload);
      expect(parsed).not.toBeNull();
      // The frontend's own rule check agrees the stored solution is clean.
      const solved = [...parsed!.solution].map(Number);
      expect(findConflicts(solved, parsed!).size).toBe(0);
      expect(matchesSolution(solved, parsed!.solution)).toBe(true);
    });
  }

  it('cryptogram', async () => {
    const c = await cryptogramSpec.generate({
      rng: createRng(1),
      used: new Set(),
      usedSince: async () => new Set(),
    });
    expect(parseCryptogram(JSON.parse(JSON.stringify(c.payload)))).not.toBeNull();
  });

  it('chess', () => {
    const api = lichessFixture;
    const { plays: _plays, ...payload } = toPuzzle(api);
    expect(parseChess(payload)).not.toBeNull();
  });

  it('chronology', async () => {
    const years = [1446, 1701, 1874, 1888, 1940, 1962, 1600, 1750];
    const feed = {
      events: years.map(y => ({
        year: y,
        text: `Something memorable happens in a famous place, item ${y % 97}x`,
        pages: [
          {
            title: `P${y}`,
            content_urls: { desktop: { page: `https://en.wikipedia.org/wiki/P${y}` } },
          },
        ],
      })),
    };
    const c = await generateChronology(
      { date: '2026-10-09', rng: createRng(2), used: new Set() },
      {
        fetchOnThisDay: async () => feed,
        fetchMonthlyViews: async () => new Map(years.map(y => [`P${y}`, 10_000])),
      }
    );
    expect(parseChronology(c.payload)).not.toBeNull();
  });

  it('what-am-i and trivia shapes', () => {
    expect(
      parseWhatAmI({
        category: 'Country',
        answer: 'Iceland',
        accepted: ['Iceland'],
        clues: ['a', 'b', 'c', 'd', 'e'],
        source: { label: 'Iceland on Wikipedia', url: 'https://en.wikipedia.org/wiki/Iceland' },
      })
    ).not.toBeNull();
    expect(
      parseTrivia({
        category: 'Brands & products',
        question: 'A story with a question at the end. Name it.',
        answer: 'Play-Doh',
        accepted: ['Play-Doh'],
        fact: 'F',
        source: { label: 'x', url: 'https://x' },
      })
    ).not.toBeNull();
  });

  it('trivia bank questions parse', () => {
    for (const entry of TRIVIA_BANK) expect(parseTrivia(entry.payload)).not.toBeNull();
  });

  it('rejects malformed payloads instead of crashing', () => {
    expect(parseSudoku({ variant: 'killer', size: 6 })).toBeNull();
    expect(parseCryptogram({ text: 'X', key: 'ABC' })).toBeNull();
    expect(parseChess({ fen: 'x', moves: ['zz'] })).toBeNull();
    expect(parseTrivia({ question: 'Q?', options: ['a', 'b'] })).toBeNull();
    expect(parseWhatAmI(null)).toBeNull();
  });
});
