import { describe, it, expect } from 'vitest';
import { constructHints } from './hintBuilder.js';

const anagram = {
  lexical: { answer: 'CANOE', type: 'anagram', definition: 'Small boat' },
  clue: {
    clue: 'Small boat when ocean is disturbed (5)',
    definition: 'Small boat',
    indicator: 'disturbed',
    fodder: 'ocean',
  },
};

describe('constructHints', () => {
  it('produces exactly four styled hint cards', () => {
    const hints = constructHints(anagram.lexical, anagram.clue);
    expect(hints).toHaveLength(4);
    hints.forEach((h, i) => {
      expect(h.id).toBe(i + 1);
      expect(h.title).toBeTruthy();
      expect(h.text).toBeTruthy();
      expect(h.mascot_comment).toBeTruthy();
      expect(h.color).toMatch(/^#[0-9A-F]{6}$/i);
      expect(h.bg_dark).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });

  it('NEVER reveals the fodder — that would hand over the near-answer', () => {
    // The whole difficulty curve rests on this: hint 3 says what kind of
    // material to look for, not which words it is.
    const hints = constructHints(anagram.lexical, anagram.clue);
    expect(hints[2].text.toLowerCase()).not.toContain('ocean');
    expect(hints[2].highlight).toBeNull();
    expect(hints[2].text).toMatch(/same letters as the answer/);
  });

  it('never leaks the answer into any hint', () => {
    const hints = constructHints(anagram.lexical, anagram.clue);
    const all = hints.map(h => `${h.title} ${h.text} ${h.mascot_comment}`).join(' ');
    expect(all.toUpperCase()).not.toContain('CANOE');
  });

  it('reports which end the definition sits at', () => {
    // Definition leads the clue.
    expect(constructHints(anagram.lexical, anagram.clue)[0].text).toMatch(/at the start/);

    // Same clue with the definition moved to the tail.
    const atEnd = {
      ...anagram.clue,
      clue: 'Ocean disturbed becomes a small boat (5)',
      definition: 'a small boat',
    };
    expect(constructHints(anagram.lexical, atEnd)[0].text).toMatch(/at the end/);
  });

  it('names the indicator in hint 2', () => {
    const hints = constructHints(anagram.lexical, anagram.clue);
    expect(hints[1].text).toContain('disturbed');
    expect(hints[1].highlight).toBe('disturbed');
  });

  it('copes with a clue that has no indicator', () => {
    const hints = constructHints(
      { answer: 'CANOE', type: 'cryptic_definition', definition: 'Small boat' },
      { ...anagram.clue, indicator: '' }
    );
    expect(hints[1].highlight).toBeNull();
    expect(hints[1].text).toMatch(/signal word/);
  });

  it('uses the double-definition progression for double definitions', () => {
    const hints = constructHints(
      { answer: 'BANK', type: 'double_definition', definition: 'River edge' },
      {
        clue: 'River edge financial institution (4)',
        definition: 'River edge',
        indicator: 'financial institution',
        fodder: '',
      }
    );
    expect(hints[0].title).toBe('Two Definitions');
    expect(hints[1].text).toContain('River edge');
    expect(hints[2].text).toContain('financial institution');
    expect(hints[3].text).toMatch(/double definition/);
  });

  it.each([
    'anagram',
    'reversal',
    'container',
    'hidden',
    'deletion',
    'initial_letters',
    'final_letters',
    'alternating_letters',
    'spoonerism',
    'charade',
    'homophone',
    'cryptic_definition',
    'andlit',
    'compound',
  ])('describes the %s mechanism in hint 4', type => {
    const hints = constructHints({ ...anagram.lexical, type }, anagram.clue);
    expect(hints[3].text).toMatch(new RegExp(type.replace(/_/g, ' '), 'i'));
    expect(hints[3].text.length).toBeGreaterThan(30);
  });
});
