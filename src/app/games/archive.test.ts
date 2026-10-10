import { beforeEach, describe, expect, it } from 'vitest';
import { archiveDateFrom, getArchivePlay, longDate, recordArchivePlay } from './archive';

const params = (date?: string) => new URLSearchParams(date ? { date } : {});

describe('archiveDateFrom', () => {
  it('accepts a real past date', () => {
    expect(archiveDateFrom(params('2026-10-03'), '2026-10-10')).toBe('2026-10-03');
  });

  it('treats today, the future and no date as the daily puzzle', () => {
    expect(archiveDateFrom(params('2026-10-10'), '2026-10-10')).toBeNull();
    expect(archiveDateFrom(params('2026-10-11'), '2026-10-10')).toBeNull();
    expect(archiveDateFrom(params(), '2026-10-10')).toBeNull();
  });

  it('rejects malformed and impossible dates', () => {
    expect(archiveDateFrom(params('3 Oct'), '2026-10-10')).toBeNull();
    expect(archiveDateFrom(params('2026-02-30'), '2026-10-10')).toBeNull();
  });
});

describe('archive plays', () => {
  beforeEach(() => localStorage.clear());

  it('records a play and never downgrades a solve', () => {
    recordArchivePlay('sudoku', '2026-10-03', { outcome: 'solved', seconds: 200 });
    recordArchivePlay('sudoku', '2026-10-03', { outcome: 'failed', seconds: 90 });
    expect(getArchivePlay('sudoku', '2026-10-03')).toEqual({ outcome: 'solved', seconds: 200 });
    expect(getArchivePlay('trivia', '2026-10-03')).toBeNull();
  });
});

it('formats a long date', () => {
  expect(longDate('2026-10-03')).toBe('3 October 2026');
});
