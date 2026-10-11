import { describe, expect, it } from 'vitest';
import { boldText, emailSubject, puzzleName } from './alerts.js';

describe('alert email format', () => {
  it('dates the subject in India time, so a day of alerts threads together', () => {
    // 20:00 UTC on 10 Oct is already 11 Oct in India.
    expect(emailSubject(new Date('2026-10-10T20:00:00Z'))).toBe('CrypticOwl : 11 Oct 2026');
  });

  it('writes the puzzle name in bold letters plain-text mail can show', () => {
    expect(boldText('Variant Sudoku 6')).toBe('𝗩𝗮𝗿𝗶𝗮𝗻𝘁 𝗦𝘂𝗱𝗼𝗸𝘂 𝟲');
  });

  it('names the puzzle, not the Lambda', () => {
    expect(puzzleName('Higher or Lower Lambda')).toBe('Higher or Lower');
    expect(puzzleName('British Style Cryptics')).toBe('British Style Cryptics');
  });
});
