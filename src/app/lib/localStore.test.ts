import { describe, it, expect, beforeEach } from 'vitest';
import {
  StoreKeys,
  readRaw,
  writeRaw,
  readJSON,
  writeJSON,
  remove,
  prunePuzzleCache,
  clearUserData,
} from './localStore';

beforeEach(() => localStorage.clear());

describe('raw access', () => {
  it('round-trips a value', () => {
    writeRaw('tco-x', 'hello');
    expect(readRaw('tco-x')).toBe('hello');
  });

  it('returns null for a missing key', () => {
    expect(readRaw('tco-nope')).toBeNull();
  });

  it('removes a key', () => {
    writeRaw('tco-x', 'hello');
    remove('tco-x');
    expect(readRaw('tco-x')).toBeNull();
  });
});

describe('JSON access', () => {
  it('round-trips an object', () => {
    writeJSON('tco-obj', { a: 1, b: [2, 3] });
    expect(readJSON('tco-obj', null)).toEqual({ a: 1, b: [2, 3] });
  });

  it('returns the fallback for a missing key', () => {
    expect(readJSON('tco-missing', { d: true })).toEqual({ d: true });
  });

  it('drops a corrupt entry rather than failing on every subsequent read', () => {
    localStorage.setItem('tco-bad', '{not json');
    expect(readJSON('tco-bad', 'fallback')).toBe('fallback');
    expect(localStorage.getItem('tco-bad')).toBeNull();
  });
});

describe('prunePuzzleCache', () => {
  it('keeps recent days and drops old ones', () => {
    const today = new Date('2026-09-13T12:00:00Z');
    const iso = (offset: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + offset);
      return d.toISOString().slice(0, 10);
    };

    [0, -1, -2, -3, -5, -30].forEach(o => writeRaw(StoreKeys.puzzle(iso(o)), '{}'));

    const removed = prunePuzzleCache(today);

    expect(readRaw(StoreKeys.puzzle(iso(0)))).not.toBeNull();
    expect(readRaw(StoreKeys.puzzle(iso(-2)))).not.toBeNull();
    expect(readRaw(StoreKeys.puzzle(iso(-5)))).toBeNull();
    expect(readRaw(StoreKeys.puzzle(iso(-30)))).toBeNull();
    expect(removed).toBe(2);
  });

  it('leaves non-puzzle keys alone', () => {
    writeRaw(StoreKeys.streak, '{"xp":100}');
    writeRaw('tco-puzzle-2000-01-01', '{}');
    prunePuzzleCache(new Date('2026-09-13T12:00:00Z'));
    expect(readRaw(StoreKeys.streak)).toBe('{"xp":100}');
  });

  it('ignores keys that only look like cache entries', () => {
    writeRaw('tco-puzzle-not-a-date', '{}');
    prunePuzzleCache(new Date('2026-09-13T12:00:00Z'));
    expect(readRaw('tco-puzzle-not-a-date')).toBe('{}');
  });
});

describe('clearUserData', () => {
  it('removes every app key and the Supabase session', () => {
    // The bug this guards: sign-out cleared only sb-*, so the next person to
    // sign in on the device inherited the previous user's streak and history.
    writeRaw(StoreKeys.streak, '{"xp":9999}');
    writeRaw(StoreKeys.reactions, '{"1":"like"}');
    writeRaw(StoreKeys.appLiked, 'true');
    writeRaw(StoreKeys.puzzle('2026-09-13'), '{}');
    localStorage.setItem('sb-abc-auth-token', 'secret');

    clearUserData();

    expect(readRaw(StoreKeys.streak)).toBeNull();
    expect(readRaw(StoreKeys.reactions)).toBeNull();
    expect(readRaw(StoreKeys.appLiked)).toBeNull();
    expect(readRaw(StoreKeys.puzzle('2026-09-13'))).toBeNull();
    expect(localStorage.getItem('sb-abc-auth-token')).toBeNull();
  });

  it('keeps the theme — a device preference, not user data', () => {
    writeRaw(StoreKeys.darkMode, 'true');
    writeRaw(StoreKeys.streak, '{}');
    clearUserData();
    expect(readRaw(StoreKeys.darkMode)).toBe('true');
  });

  it('leaves unrelated third-party keys untouched', () => {
    localStorage.setItem('some-other-app', 'keep me');
    clearUserData();
    expect(localStorage.getItem('some-other-app')).toBe('keep me');
  });
});
