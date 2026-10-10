import { describe, it, expect } from 'vitest';
import {
  VERIFIED,
  REFUTED,
  UNVERIFIABLE,
  letters,
  words,
  sortedLetters,
  splitFodderParts,
  verifyAnagram,
  verifyReversal,
  verifyHidden,
  verifyInitialLetters,
  verifyFinalLetters,
  verifyAlternatingLetters,
  verifyCharade,
  verifyContainer,
  verifyDeletion,
  verifyDoubleDefinition,
  verifyMechanism,
  pieceGives,
  isChestnut,
} from './mechanics.js';

describe('helpers', () => {
  it('letters() keeps only A-Z, uppercased', () => {
    expect(letters("Spooner's half-baked pie! (5)")).toBe('SPOONERSHALFBAKEDPIE');
    expect(letters(null)).toBe('');
    expect(letters(undefined)).toBe('');
  });

  it('words() splits on any non-alphabetic run', () => {
    expect(words('wears the thumbs')).toEqual(['WEARS', 'THE', 'THUMBS']);
    expect(words('rock-solid, truly')).toEqual(['ROCK', 'SOLID', 'TRULY']);
    expect(words('')).toEqual([]);
  });

  it('sortedLetters() equates anagrams', () => {
    expect(sortedLetters('OCEAN')).toBe(sortedLetters('CANOE'));
    expect(sortedLetters('LISTEN')).toBe(sortedLetters('SILENT'));
    expect(sortedLetters('OCEAN')).not.toBe(sortedLetters('OCEANS'));
  });

  it('splitFodderParts() handles +, commas and connective words', () => {
    expect(splitFodderParts('CAR + PET')).toEqual(['CAR', 'PET']);
    expect(splitFodderParts('wears the thumbs + small')).toEqual(['wears the thumbs', 'small']);
    expect(splitFodderParts('ROSE and SHIRE')).toEqual(['ROSE', 'SHIRE']);
    expect(splitFodderParts('')).toEqual([]);
  });
});

describe('verifyAnagram', () => {
  it('verifies an exact letter match', () => {
    const r = verifyAnagram('OCEAN', 'CANOE');
    expect(r.status).toBe(VERIFIED);
    expect(r.detail).toMatch(/exact anagram/);
  });

  it('ignores case, spacing and punctuation in the fodder', () => {
    expect(verifyAnagram('the eyes', 'THEYSEE').status).toBe(VERIFIED);
  });

  // No indirect anagrams: British cryptic convention requires the letters
  // to be in the clue as written, so any mismatch is a wrong clue.
  it('refutes a same-length mismatch (no indirect anagrams)', () => {
    const r = verifyAnagram('HOUSE', 'CANOE');
    expect(r.status).toBe(REFUTED);
    expect(r.detail).toMatch(/not an anagram/);
  });

  it('refutes a length mismatch, like the TRIANGLE clue that shipped', () => {
    expect(verifyAnagram('great ruin', 'TRIANGLE').status).toBe(REFUTED);
  });

  it('refutes missing fodder', () => {
    expect(verifyAnagram('', 'CANOE').status).toBe(REFUTED);
  });

  it('refutes fodder that is not in the clue as written', () => {
    const r = verifyAnagram('ocean', 'CANOE', 'Small boat when sea is disturbed (5)');
    expect(r.status).toBe(REFUTED);
    expect(r.detail).toMatch(/does not appear in the clue/);
    expect(verifyAnagram('ocean', 'CANOE', 'Small boat when ocean is disturbed (5)').status).toBe(
      VERIFIED
    );
  });
});

describe('verifyReversal', () => {
  it('verifies an exact reversal', () => {
    expect(verifyReversal('REWARD', 'DRAWER').status).toBe(VERIFIED);
    expect(verifyReversal('STAR', 'RATS').status).toBe(VERIFIED);
  });

  it('does not refute a non-matching reversal (fodder may be a synonym)', () => {
    const r = verifyReversal('PRIZE', 'DRAWER');
    expect(r.status).toBe(UNVERIFIABLE);
    expect(r.detail).toMatch(/EZIRP/);
  });
});

describe('verifyHidden', () => {
  it('verifies an answer hidden across a word boundary', () => {
    const r = verifyHidden('Snake concealed inside laser pentagram (7)', 'SERPENT');
    expect(r.status).toBe(VERIFIED);
    expect(r.detail).toMatch(/laser pentagram/i);
  });

  it('REFUTES when the answer is not embedded at all', () => {
    // Hidden fodder is literal by convention — a failure is decisive, and
    // rejecting here saves the AI call entirely.
    const r = verifyHidden('Snake found in the long grass (7)', 'SERPENT');
    expect(r.status).toBe(REFUTED);
  });

  it('REFUTES when the answer sits wholly inside one word', () => {
    // Unfair form: the solver has no word gap to spot the join.
    const r = verifyHidden('A serpentine road climbs (7)', 'SERPENT');
    expect(r.status).toBe(REFUTED);
    expect(r.detail).toMatch(/straddle/);
  });

  it('ignores punctuation between the hidden letters', () => {
    expect(verifyHidden('Some of the la-ser, pentagram glows (7)', 'SERPENT').status).toBe(
      VERIFIED
    );
  });
});

describe('verifyInitialLetters', () => {
  it('verifies first letters of consecutive words', () => {
    const r = verifyInitialLetters('Some People Enjoy Awfully Rich', 'SPEAR');
    expect(r.status).toBe(VERIFIED);
  });

  it('REFUTES a mismatch — no synonym substitution is permitted', () => {
    const r = verifyInitialLetters('Some People Enjoy', 'SPEAR');
    expect(r.status).toBe(REFUTED);
    expect(r.detail).toMatch(/SPE/);
    expect(r.detail).toMatch(/literal/);
  });

  it('REFUTES empty fodder', () => {
    expect(verifyInitialLetters('', 'SPEAR').status).toBe(REFUTED);
  });
});

describe('verifyFinalLetters', () => {
  it('verifies last letters of consecutive words', () => {
    expect(verifyFinalLetters('musiC extrA fasT', 'CAT').status).toBe(VERIFIED);
  });

  it('REFUTES a mismatch', () => {
    expect(verifyFinalLetters('music extra fast', 'DOG').status).toBe(REFUTED);
  });
});

describe('verifyAlternatingLetters', () => {
  it('verifies odd-position letters', () => {
    // w-A-s-H-t-U-b from "wearsthethumbs" at indices 0,2,4,6,8,10,12
    expect(verifyAlternatingLetters('wears the thumbs', 'WASHTUB').status).toBe(VERIFIED);
  });

  it('verifies even-position letters', () => {
    expect(verifyAlternatingLetters('xAxBxC', 'ABC').status).toBe(VERIFIED);
  });

  it('REFUTES when neither parity spells the answer', () => {
    const r = verifyAlternatingLetters('wears the thumbs', 'BATHTUB');
    expect(r.status).toBe(REFUTED);
    expect(r.detail).toMatch(/odds/);
  });
});

describe('verifyCharade', () => {
  it('verifies parts that concatenate exactly', () => {
    expect(verifyCharade('CAR + PET', 'CARPET').status).toBe(VERIFIED);
    expect(verifyCharade('ROSE and MARY', 'ROSEMARY').status).toBe(VERIFIED);
  });

  it('stays unverifiable when parts are cryptic abbreviations', () => {
    // DR = doctor, O = love: the letters are not in the fodder as written.
    const r = verifyCharade('doctor + love', 'DRO');
    expect(r.status).toBe(UNVERIFIABLE);
    expect(r.detail).toMatch(/abbreviation/);
  });
});

describe('verifyContainer', () => {
  it('verifies an insertion in either direction', () => {
    // S|CAR|E
    expect(verifyContainer('SE + CAR', 'SCARE').status).toBe(VERIFIED);
    expect(verifyContainer('CAR + SE', 'SCARE').status).toBe(VERIFIED);
  });

  it('reports the insertion point it found', () => {
    expect(verifyContainer('SE + CAR', 'SCARE').detail).toMatch(/inserted into/);
  });

  it('stays unverifiable when a synonym is involved', () => {
    expect(verifyContainer('sea + vehicle', 'SCARE').status).toBe(UNVERIFIABLE);
  });

  it('stays unverifiable when the fodder does not split into two operands', () => {
    expect(verifyContainer('SCARE', 'SCARE').status).toBe(UNVERIFIABLE);
  });
});

describe('verifyDeletion', () => {
  it('verifies a beheading', () => {
    const r = verifyDeletion('BRANCH', 'RANCH');
    expect(r.status).toBe(VERIFIED);
    expect(r.detail).toMatch(/beheading/);
  });

  it('verifies a curtailment', () => {
    const r = verifyDeletion('SPEARS', 'SPEAR');
    expect(r.status).toBe(VERIFIED);
    expect(r.detail).toMatch(/curtailing/);
  });

  it('verifies heart-removal', () => {
    const r = verifyDeletion('SHEARS', 'SHS');
    expect(r.status).toBe(VERIFIED);
    expect(r.detail).toMatch(/heart/);
  });

  it('stays unverifiable when the fodder is not longer than the answer', () => {
    expect(verifyDeletion('RANCH', 'RANCH').status).toBe(UNVERIFIABLE);
  });

  it('stays unverifiable when no contiguous deletion works', () => {
    expect(verifyDeletion('BRANCHES', 'PLANET').status).toBe(UNVERIFIABLE);
  });
});

describe('verifyDoubleDefinition', () => {
  it('verifies two definitions at opposite ends', () => {
    const r = verifyDoubleDefinition(
      'Bank of a river financial institution (4)',
      'Bank',
      'financial institution'
    );
    expect(r.status).toBe(VERIFIED);
  });

  it('REFUTES when a definition is missing', () => {
    expect(verifyDoubleDefinition('Bank of a river (4)', 'Bank', '').status).toBe(REFUTED);
  });

  it('REFUTES identical halves', () => {
    expect(verifyDoubleDefinition('Bank bank (4)', 'Bank', 'Bank').status).toBe(REFUTED);
  });

  it('REFUTES when both definitions sit at the same end', () => {
    const r = verifyDoubleDefinition('Bank banker of a river (4)', 'Bank', 'Bank banker');
    expect(r.status).toBe(REFUTED);
  });

  it('REFUTES when a definition is not at an extremity', () => {
    const r = verifyDoubleDefinition(
      'Some bank in the middle financial institution (4)',
      'bank',
      'financial institution'
    );
    expect(r.status).toBe(REFUTED);
  });
});

describe('verifyMechanism dispatch', () => {
  const clue = (over = {}) => ({
    clue: 'Small boat when ocean is disturbed (5)',
    definition: 'Small boat',
    indicator: 'disturbed',
    fodder: 'ocean',
    ...over,
  });

  it('routes each mechanism to its verifier', () => {
    expect(verifyMechanism('anagram', clue(), 'CANOE').status).toBe(VERIFIED);
    expect(
      verifyMechanism('reversal', clue({ clue: 'Reward returned (6)', fodder: 'REWARD' }), 'DRAWER')
        .status
    ).toBe(VERIFIED);
    expect(
      verifyMechanism('hidden', clue({ clue: 'Snake in laser pentagram (7)' }), 'SERPENT').status
    ).toBe(VERIFIED);
    expect(
      verifyMechanism(
        'initial_letters',
        clue({ fodder: 'Some People Enjoy Awfully Rich' }),
        'SPEAR'
      ).status
    ).toBe(VERIFIED);
    expect(
      verifyMechanism('charade', clue({ clue: 'Car, pet (6)', fodder: 'CAR + PET' }), 'CARPET')
        .status
    ).toBe(VERIFIED);
    expect(
      verifyMechanism('container', clue({ clue: 'Se car (5)', fodder: 'SE + CAR' }), 'SCARE').status
    ).toBe(VERIFIED);
    expect(
      verifyMechanism('deletion', clue({ clue: 'Branch (5)', fodder: 'BRANCH' }), 'RANCH').status
    ).toBe(VERIFIED);
  });

  it.each(['homophone', 'spoonerism', 'cryptic_definition', 'andlit', 'compound'])(
    'returns unverifiable for %s — not decidable in code',
    type => {
      const r = verifyMechanism(type, clue(), 'CANOE');
      expect(r.status).toBe(UNVERIFIABLE);
      expect(r.detail).toMatch(/cannot be verified mechanically/);
    }
  );

  it('returns unverifiable for an unknown mechanism rather than throwing', () => {
    expect(verifyMechanism('not_a_mechanism', clue(), 'CANOE').status).toBe(UNVERIFIABLE);
  });
});

describe('verifyPieces', () => {
  const at = (clue, letter_pieces) => ({ clue, letter_pieces });

  it('accepts a charade whose pieces build the answer', () => {
    const r = verifyMechanism(
      'charade',
      at('Vehicle and favourite animal on the floor (6)', [
        { clue_words: 'Vehicle', letters: 'CAR' },
        { clue_words: 'favourite animal', letters: 'PET' },
      ]),
      'CARPET'
    );
    expect(r.status).toBe(UNVERIFIABLE);
    expect(r.detail).toMatch(/builds CARPET/);
  });

  it('accepts a container with one piece inside another', () => {
    const r = verifyMechanism(
      'container',
      at('Swindle, with man inside cat (5)', [
        { clue_words: 'cat', letters: 'CAT' },
        { clue_words: 'man', letters: 'HE' },
      ]),
      'CHEAT'
    );
    expect(r.status).toBe(UNVERIFIABLE);
  });

  it('refutes BAMBOO from "Bob, a man holding back"', () => {
    const r = verifyMechanism(
      'container',
      at('Bob, a man holding back tropical grass with hollow stems (6)', [
        { clue_words: 'Bob', letters: 'BOB' },
        { clue_words: 'a man', letters: 'AM' },
      ]),
      'BAMBOO'
    );
    expect(r.status).toBe(REFUTED);
  });

  it('refutes a container whose pieces only concatenate', () => {
    const r = verifyMechanism(
      'container',
      at('Vehicle holding favourite animal (6)', [
        { clue_words: 'Vehicle', letters: 'CAR' },
        { clue_words: 'favourite animal', letters: 'PET' },
      ]),
      'CARPET'
    );
    expect(r.status).toBe(REFUTED);
  });

  it('refutes pieces missing, or taken from words not in the clue', () => {
    expect(verifyMechanism('charade', at('Vehicle pet (6)', []), 'CARPET').status).toBe(REFUTED);
    expect(
      verifyMechanism(
        'charade',
        at('Vehicle and favourite animal (6)', [
          { clue_words: 'Automobile', letters: 'CAR' },
          { clue_words: 'favourite animal', letters: 'PET' },
        ]),
        'CARPET'
      ).status
    ).toBe(REFUTED);
  });

  it('still verifies literal fodder without pieces', () => {
    const r = verifyMechanism(
      'reversal',
      { clue: 'Reward returned (6)', fodder: 'reward' },
      'DRAWER'
    );
    expect(r.status).toBe(VERIFIED);
  });
});

describe('literal fodder must be in the clue', () => {
  it('refutes PLASTER from a reversal of letters the clue does not contain', () => {
    const r = verifyMechanism(
      'reversal',
      { clue: 'Return large set back for bandage (7)', fodder: 'RETSALP' },
      'PLASTER'
    );
    expect(r.status).toBe(REFUTED);
  });
});

describe('pieceGives and chestnuts', () => {
  it('accepts literal, reversed, abbreviated and looked-up pieces', () => {
    expect(pieceGives('charade', 'pig', 'PIG')).toBe(true);
    expect(pieceGives('container', 'car', 'RAC')).toBe(true);
    expect(pieceGives('charade', 'doctor', 'DR')).toBe(true);
    expect(pieceGives('charade', 'long period', 'EON', ['AGE', 'EON', 'ERA'])).toBe(true);
    expect(pieceGives('deletion', 'monster', 'GRE', ['OGRE'])).toBe(true);
  });

  it('rejects a piece nothing explains', () => {
    expect(pieceGives('charade', 'a man', 'AM', ['HE', 'GUY'])).toBe(false);
    expect(pieceGives('charade', 'monster', 'GRE', ['OGRE'])).toBe(false);
  });

  it('flags chestnuts only between the same letter group', () => {
    expect(isChestnut('reversal', 'reward', 'DRAWER')).toBe(true);
    expect(isChestnut('anagram', 'silent', 'LISTEN')).toBe(true);
    expect(isChestnut('anagram', 'among', 'MANGO')).toBe(false);
    expect(isChestnut('charade', 'reward', 'DRAWER')).toBe(false);
  });
});
