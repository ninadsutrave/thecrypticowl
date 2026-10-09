import { describe, expect, it } from 'vitest';
import { addDays, dateWindow, isDateKey, weekdayIndex } from './dates.js';
import { createRng } from './random.js';
import { isCorrectGuess } from './match.js';
import { cleanExtract, excerpt, isGrounded } from '../sources/wikipedia.js';
import { fetchJson } from './http.js';

describe('dates', () => {
  it('steps across month ends and builds windows', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(dateWindow('2026-10-09', -1, 1)).toEqual(['2026-10-08', '2026-10-09', '2026-10-10']);
    expect(weekdayIndex('2026-10-09')).toBe(4); // Friday
    expect(isDateKey('2026-02-30')).toBe(false);
  });
});

describe('createRng', () => {
  it('is reproducible per seed', () => {
    const a = createRng('x');
    const b = createRng('x');
    expect([a.next(), a.int(1, 6)]).toEqual([b.next(), b.int(1, 6)]);
    expect(createRng('y').next()).not.toBe(createRng('x').next());
  });
});

describe('isCorrectGuess (mirrors the SPA)', () => {
  it('forgives a dropped letter, never a wrong one', () => {
    expect(isCorrectGuess('Iceand', ['Iceland'])).toBe(true);
    expect(isCorrectGuess('Ireland', ['Iceland'])).toBe(false);
  });
});

describe('wikipedia helpers', () => {
  it('drops reference sections', () => {
    expect(cleanExtract('Body text.\nReferences\n1. cite')).toBe('Body text.');
  });

  it('accepts a lightly re-punctuated quote and rejects an invented one', () => {
    const src = 'The Althing, founded in 930, is often called the oldest surviving parliament.';
    expect(
      isGrounded('The Althing was founded in 930 — the oldest surviving parliament', src)
    ).toBe(true);
    expect(isGrounded('Iceland has the largest army in Europe by far', src)).toBe(false);
  });

  it('always keeps the lead paragraph in an excerpt', () => {
    const text = [
      'Lead '.repeat(20),
      ...Array.from({ length: 50 }, (_, i) => `Para ${i} `.repeat(20)),
    ].join('\n');
    expect(excerpt(text, createRng(1), 500).startsWith('Lead')).toBe(true);
  });
});

describe('fetchJson', () => {
  it('retries a 503 then succeeds, and does not retry a 404', async () => {
    let calls = 0;
    const flaky = async () =>
      ++calls < 2 ? { ok: false, status: 503 } : { ok: true, json: async () => ({ ok: 1 }) };
    expect(await fetchJson('u', { fetchImpl: flaky, retries: 2 })).toEqual({ ok: 1 });
    const missing = async () => ({ ok: false, status: 404 });
    await expect(fetchJson('u', { fetchImpl: missing })).rejects.toThrow(/404/);
  });
});
