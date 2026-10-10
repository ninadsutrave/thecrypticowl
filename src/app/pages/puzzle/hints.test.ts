import { describe, it, expect } from 'vitest';
import { buildHintsFromComponents, mapDbPuzzle, DEFAULT_PUZZLE } from './hints';
import type { DbDailyPuzzle, PuzzleHint } from '../../../lib/supabase';

const components: DbDailyPuzzle['clue_components'] = [
  { step_order: 1, role: 'definition', clue_text: 'Small boat', indicator_type: null },
  { step_order: 2, role: 'fodder', clue_text: 'ocean', indicator_type: null },
  { step_order: 3, role: 'indicator', clue_text: 'disturbed', indicator_type: 'anagram' },
];

const storedHints: PuzzleHint[] = [
  {
    id: 1,
    title: 'Definition Location',
    text: 'The definition is at the start of the clue.',
    highlight: 'Small boat',
    mascot_comment: 'Found it! 👀',
    color: '#3B82F6',
    bg: '#EFF6FF',
    bg_dark: '#0D1F35',
    border: '#93C5FD',
  },
  {
    id: 2,
    title: 'The Indicator',
    text: '"disturbed" is the indicator.',
    highlight: 'disturbed',
    mascot_comment: 'Road signs!',
    color: '#7C3AED',
    bg: '#F5F3FF',
    bg_dark: '#1D1B26',
    border: '#C4B5FD',
  },
  {
    id: 3,
    title: 'The Wordplay Material',
    text: 'A word in the clue has the same letters as the answer, just scrambled.',
    highlight: null,
    mascot_comment: "Let's cook! 🍳",
    color: '#F97316',
    bg: '#FFF7ED',
    bg_dark: '#2A1505',
    border: '#FED7AA',
  },
  {
    id: 4,
    title: 'Wordplay Type',
    text: 'This is an anagram clue.',
    highlight: null,
    mascot_comment: 'Final piece! 🦉',
    color: '#059669',
    bg: '#ECFDF5',
    bg_dark: '#062010',
    border: '#6EE7B7',
  },
];

const CLUE = 'Small boat when ocean is disturbed (5)';

describe('buildHintsFromComponents', () => {
  it('prefers the stored progression over the component-derived one', () => {
    // The generator writes an anti-spoiler progression into clues.hints, but
    // it also always writes clue_components — so when components won, the
    // stored progression never ran and hint 3 named the fodder outright.
    const hints = buildHintsFromComponents(components, 'anagram', storedHints, CLUE);
    expect(hints[2].text).toBe(storedHints[2].text);
    expect(hints[2].text.toLowerCase()).not.toContain('ocean');
  });

  it('NEVER names the fodder, even on the component-derived fallback', () => {
    const hints = buildHintsFromComponents(components, 'anagram', [], CLUE);
    const all = hints
      .map(h => `${h.text} ${h.highlight ?? ''}`)
      .join(' ')
      .toLowerCase();
    expect(all).not.toContain('ocean');
    expect(hints[2].highlight).toBeNull();
    expect(hints[2].text).toMatch(/same letters as the answer/);
  });

  it('gives mechanism-appropriate guidance instead of the fodder', () => {
    const cases: Array<[string, RegExp]> = [
      ['reversal', /backwards/i],
      ['hidden', /hidden across the words/i],
      ['initial_letters', /FIRST letter/],
      ['final_letters', /LAST letter/],
      ['alternating_letters', /every OTHER letter/i],
      ['charade', /join in sequence/i],
      ['homophone', /sounds like/i],
    ];
    for (const [type, pattern] of cases) {
      const hints = buildHintsFromComponents(components, type as never, [], CLUE);
      expect(hints[2].text, type).toMatch(pattern);
    }
  });

  it('says which end the definition is at without restating it as text', () => {
    const atStart = buildHintsFromComponents(components, 'anagram', [], CLUE);
    expect(atStart[0].text).toMatch(/at the start/);
    // The span is still highlighted in the UI — just not spelled out in prose.
    expect(atStart[0].highlight).toBe('Small boat');

    const atEnd = buildHintsFromComponents(
      components,
      'anagram',
      [],
      'Ocean disturbed becomes a small boat (5)'
    );
    expect(atEnd[0].text).toMatch(/at the end/);
  });

  it('counts multiple fodder pieces without naming any of them', () => {
    const multi: DbDailyPuzzle['clue_components'] = [
      ...components,
      { step_order: 4, role: 'fodder', clue_text: 'small', indicator_type: null },
    ];
    const hints = buildHintsFromComponents(multi, 'compound', [], CLUE);
    expect(hints[2].text).toMatch(/2 separate pieces/);
    expect(hints[2].text.toLowerCase()).not.toContain('ocean');
    expect(hints[2].highlight).toBeNull();
  });

  it('handles double definitions, which have no fodder at all', () => {
    const dd: DbDailyPuzzle['clue_components'] = [
      { step_order: 1, role: 'definition', clue_text: 'River edge', indicator_type: null },
      {
        step_order: 2,
        role: 'indicator',
        clue_text: 'financial institution',
        indicator_type: null,
      },
    ];
    const hints = buildHintsFromComponents(
      dd,
      'double_definition',
      [],
      'River edge financial institution (4)'
    );
    expect(hints[0].text).toMatch(/two definitions/i);
    expect(hints[2].text).toMatch(/no fodder/i);
  });

  it('always returns exactly four fully-styled cards', () => {
    for (const stored of [storedHints, []]) {
      const hints = buildHintsFromComponents(components, 'anagram', stored, CLUE);
      expect(hints).toHaveLength(4);
      hints.forEach((h, i) => {
        expect(h.id).toBe(i + 1);
        expect(h.color).toMatch(/^#[0-9A-F]{6}$/i);
        expect(h.bgDark).toMatch(/^#[0-9A-F]{6}$/i);
        expect(h.mascotComment).toBeTruthy();
      });
    }
  });

  it('falls back to generic hints when there is nothing to work from', () => {
    const hints = buildHintsFromComponents([], 'spoonerism', [], CLUE);
    expect(hints).toHaveLength(4);
    expect(hints[3].text).toMatch(/spoonerism/i);
  });
});

describe('mapDbPuzzle', () => {
  const row = {
    id: 'uuid-1',
    number: 7,
    date: '2026-09-10',
    clue_text: CLUE,
    answer: 'CANOE',
    answer_length: 5,
    primary_type: 'anagram',
    clue_parts: [{ text: 'Small boat', type: 'definition' }],
    hints: storedHints,
    clue_components: components,
    author: 'Gemini',
    author_social: null,
    author_profile: null,
  } as unknown as DbDailyPuzzle;

  it('carries the mechanism through so the UI can react to it', () => {
    expect(mapDbPuzzle(row).type).toBe('anagram');
  });

  it('carries the publication date, not today', () => {
    expect(mapDbPuzzle(row).date).toBe('2026-09-10');
  });

  it('is not marked as the offline fallback', () => {
    expect(mapDbPuzzle(row).isFallback).toBeFalsy();
  });
});

describe('DEFAULT_PUZZLE', () => {
  it('is flagged so a "solve" of it cannot award XP or a streak day', () => {
    // It has no database row, so the solve can never reach solve_history —
    // counting it locally desynchronises progress from the server for good.
    expect(DEFAULT_PUZZLE.isFallback).toBe(true);
  });
});
