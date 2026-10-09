import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { judgeChess } from './judge.js';
import { toPuzzle } from './lichess.js';
import { reviewChess } from './reviewer.js';

const api = JSON.parse(
  readFileSync(new URL('./fixtures/lichess-J588J.json', import.meta.url), 'utf8')
);

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
  const p = toPuzzle(api);

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
  const { plays, ...payload } = toPuzzle(api);

  it('accepts a well-played medium puzzle', () => {
    expect(judgeChess({ payload, plays }).ok).toBe(true);
  });

  it('rejects one outside the rating band or barely played', () => {
    expect(
      judgeChess({ payload: { ...payload, source: { ...payload.source, rating: 2400 } }, plays }).ok
    ).toBe(false);
    expect(judgeChess({ payload, plays: 10 }).ok).toBe(false);
  });
});
