import { describe, expect, it, vi } from 'vitest';
import { createRng } from '../../shared/runtime/random.js';
import { acceptedNames, displayName, generateWhatAmI } from './generator.js';
import { judgeWhatAmI } from './judge.js';
import { reviewWhatAmI } from './reviewer.js';

const SOURCE = [
  'Iceland is a Nordic island country in the North Atlantic Ocean.',
  'The Althing, founded in 930, is one of the oldest surviving parliaments in the world.',
  'The island sits on the Mid-Atlantic Ridge between the North American and Eurasian plates.',
  'In 2010 the eruption of Eyjafjallajökull caused widespread disruption to air travel across Europe.',
  'Icelandic remains close to Old Norse, so modern speakers can read the medieval sagas.',
].join('\n');

const CLUES = [
  {
    text: 'My language has barely changed, so people here can still read medieval sagas.',
    evidence: SOURCE.split('\n')[4],
  },
  {
    text: 'My parliament, founded in 930, is one of the oldest still meeting.',
    evidence: SOURCE.split('\n')[1],
  },
  {
    text: 'I sit on the ridge where the North American and Eurasian plates part.',
    evidence: SOURCE.split('\n')[2],
  },
  {
    text: 'In 2010 one of my volcanoes grounded flights across Europe.',
    evidence: SOURCE.split('\n')[3],
  },
  {
    text: 'I am a Nordic island country in the North Atlantic Ocean.',
    evidence: SOURCE.split('\n')[0],
  },
];

function candidate(clues = CLUES) {
  return {
    payload: {
      category: 'Country',
      answer: 'Iceland',
      accepted: ['Iceland', 'Republic of Iceland'],
      clues: clues.map(c => c.text),
      source: { label: 'x', url: 'https://x' },
    },
    evidence: clues.map(c => c.evidence),
    sourceText: SOURCE,
  };
}

describe('names', () => {
  it('strips disambiguators and country codes', () => {
    expect(displayName('Queen (band)')).toBe('Queen');
    expect(acceptedNames('Iceland', ['IS', 'ISL', 'Republic of Iceland'])).toEqual([
      'Iceland',
      'Republic of Iceland',
    ]);
  });
});

describe('reviewer', () => {
  it('accepts grounded clues that never name the answer', () => {
    expect(reviewWhatAmI(candidate()).errors).toEqual([]);
  });

  it('rejects a clue that names the answer', () => {
    const leaky = CLUES.map((c, i) =>
      i === 4 ? { ...c, text: 'Iceland is my name and the North Atlantic is my home.' } : c
    );
    expect(reviewWhatAmI(candidate(leaky)).errors.join()).toMatch(/gives away/);
  });

  it('rejects a derived form of the answer', () => {
    const leaky = CLUES.map((c, i) =>
      i === 0
        ? { ...c, text: 'Icelandic barely changed, so people here still read medieval sagas.' }
        : c
    );
    expect(reviewWhatAmI(candidate(leaky)).errors.join()).toMatch(/gives away/);
  });

  it('rejects evidence that is not in the source', () => {
    const invented = CLUES.map((c, i) =>
      i === 0 ? { ...c, evidence: 'Iceland has won the football World Cup three times.' } : c
    );
    expect(reviewWhatAmI(candidate(invented)).errors.join()).toMatch(/evidence/);
  });
});

describe('judge', () => {
  const guess = g => ({ guesses: [g], fair: true, issues: '' });

  it('passes a popular subject when clue 1 is opaque and clue 3 gets it', async () => {
    const callJudge = vi
      .fn()
      .mockResolvedValueOnce(guess('Norway')) // clue 1
      .mockResolvedValueOnce(guess('Iceland')) // all five
      .mockResolvedValueOnce(guess('Iceland')); // clues 1–3
    expect((await judgeWhatAmI(candidate(), { callJudge })).ok).toBe(true);
  });

  it('fails a popular subject still unsolved after three clues (too hard)', async () => {
    const callJudge = vi
      .fn()
      .mockResolvedValueOnce(guess('Norway'))
      .mockResolvedValueOnce(guess('Iceland'))
      .mockResolvedValueOnce(guess('Greenland'));
    const v = await judgeWhatAmI(candidate(), { callJudge });
    expect(v.ok).toBe(false);
    expect(v.feedback).toMatch(/Too hard/);
  });

  it('holds an Indian answer to medium-hard: clues 1–2 must not give it away', async () => {
    const given = vi.fn().mockResolvedValue(guess('Iceland'));
    const v = await judgeWhatAmI({ ...candidate(), india: true }, { callJudge: given });
    expect(v.feedback).toMatch(/Clues 1 and 2/);
    const fine = vi
      .fn()
      .mockResolvedValueOnce(guess('Norway')) // clues 1–2
      .mockResolvedValueOnce(guess('Iceland')); // all five; no clue-3 check
    expect((await judgeWhatAmI({ ...candidate(), india: true }, { callJudge: fine })).ok).toBe(
      true
    );
  });

  it('fails when clue 1 already gives it away', async () => {
    const callJudge = vi.fn().mockResolvedValue({ guesses: ['Iceland'], fair: true, issues: '' });
    const v = await judgeWhatAmI(candidate(), { callJudge });
    expect(v.ok).toBe(false);
    expect(v.feedback).toMatch(/Clue 1/);
  });

  it('fails when the full set points elsewhere, or is unfair', async () => {
    const wrong = vi
      .fn()
      .mockResolvedValueOnce({ guesses: ['Peru'], fair: true, issues: '' })
      .mockResolvedValueOnce({ guesses: ['Norway'], fair: true, issues: '' });
    expect((await judgeWhatAmI(candidate(), { callJudge: wrong })).ok).toBe(false);
    const unfair = vi
      .fn()
      .mockResolvedValueOnce({ guesses: ['Peru'], fair: true, issues: '' })
      .mockResolvedValueOnce({ guesses: ['Iceland'], fair: false, issues: 'clue 2 doubtful' });
    expect((await judgeWhatAmI(candidate(), { callJudge: unfair })).feedback).toMatch(/doubtful/);
  });
});

describe('generator', () => {
  it('grounds the model in the fetched article and records the source', async () => {
    const callAI = vi.fn().mockResolvedValue({ clues: CLUES });
    const c = await generateWhatAmI(
      { date: '2026-10-09', rng: createRng(1), used: new Set(), callAI, feedback: null },
      {
        fetchArticle: async t => ({
          title: t,
          url: `https://en.wikipedia.org/wiki/${t}`,
          text: SOURCE,
          wikidataId: 'Q1',
        }),
        fetchAliases: async () => [],
      }
    );
    expect(callAI.mock.calls[0][0]).toContain('SOURCE TEXT');
    expect(c.sourceKeys[0]).toMatch(/^wiki:/);
    expect(c.payload.clues).toHaveLength(5);
  });
});
