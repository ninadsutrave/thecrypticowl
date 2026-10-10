import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { judgeChess } from './judge.js';
import { toPuzzle } from './lichess.js';
import { reviewChess } from './reviewer.js';

const fixture = name =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
/** A mate in 3 (rated 1380): conversion tests, and too short for medium-hard. */
const api = fixture('lichess-J588J.json');
/** A mate in 4 (Sbhxq): the length the game now wants. */
const mate4 = fixture('lichess-mate4.json');

describe('Lichess conversion', () => {
  it('rebuilds the position before the setup move and the full UCI line', () => {
    const p = toPuzzle(api);
    expect(p.fen).toBe('4r1k1/1pp2ppp/p7/q7/8/B4Q2/bPP2PPP/2KR1B1R w - - 9 25');
    expect(p.moves).toEqual(['f3b7', 'a5g5', 'f2f4', 'g5f4', 'd1d2', 'e8e1']);
    expect(p.mateIn).toBe(3);
    expect(p.source).toMatchObject({ id: 'J588J', rating: 1380 });
  });
});

describe('reviewer', () => {
  const p = toPuzzle(mate4);

  it('rejects a mate in 3 as too short for medium-hard (4–6)', () => {
    expect(reviewChess(toPuzzle(api)).errors.join(' ')).toMatch(/outside 4–6/);
  });

  it('accepts a legal line that ends in mate', () => {
    expect(reviewChess(p)).toMatchObject({ ok: true, errors: [] });
  });

  it('rejects a line that stops short of mate', () => {
    expect(reviewChess({ ...p, moves: p.moves.slice(0, -2) }).ok).toBe(false);
  });

  it('rejects an illegal move', () => {
    const moves = [...p.moves];
    moves[1] = 'a5a1';
    expect(reviewChess({ ...p, moves }).ok).toBe(false);
  });
});

describe('judge', () => {
  const { plays, ...base } = toPuzzle(mate4);
  const payload = { ...base, source: { ...base.source, rating: 1800 } };

  it('accepts a well-played medium-hard puzzle', () => {
    expect(judgeChess({ payload, plays }).ok).toBe(true);
  });

  it('rejects one rated below medium-hard', () => {
    expect(
      judgeChess({ payload: { ...payload, source: { ...payload.source, rating: 1400 } }, plays }).ok
    ).toBe(false);
  });

  it('rejects one outside the rating band or barely played', () => {
    expect(
      judgeChess({ payload: { ...payload, source: { ...payload.source, rating: 2400 } }, plays }).ok
    ).toBe(false);
    expect(judgeChess({ payload, plays: 10 }).ok).toBe(false);
  });
});
