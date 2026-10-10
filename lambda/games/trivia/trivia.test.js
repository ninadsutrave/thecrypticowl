import { describe, expect, it, vi } from 'vitest';
import { createRng } from '../../shared/runtime/random.js';
import { CATEGORIES as WHAT_AM_I } from '../what-am-i/candidates.js';
import { BANK, pickFromBank } from './bank.js';
import { acceptedNames, displayName, generateTrivia } from './generator.js';
import { judgeTrivia, opening } from './judge.js';
import { reviewTrivia } from './reviewer.js';
import { ALL_TOPICS } from './topics.js';

const SOURCE = [
  'Bluetooth is a short-range wireless technology standard used for exchanging data between devices.',
  'The name was proposed in 1997 by Jim Kardach of Intel, who had been reading a historical novel about Vikings.',
  'It was named after the tenth-century Danish king Harald Bluetooth, who united dissonant Danish tribes into a single kingdom.',
  'The name was intended only as a placeholder until marketing could come up with something better.',
  'The Bluetooth logo is a bind rune merging the Younger Futhark runes for the initials H and B.',
].join('\n');
const LINES = SOURCE.split('\n');

const QUESTION =
  'In 1997 an engineer at Intel was reading a historical novel about Vikings while working with rival companies on a short-range radio standard. He proposed borrowing the nickname of a tenth-century Danish king who had united warring tribes, just as the technology would unite devices. The codename was only meant to be a placeholder until marketing came up with something better. Its logo still merges two runes: the king’s initials. Name the technology.';

function candidate(overrides = {}) {
  return {
    payload: {
      category: 'Words & names',
      question: QUESTION,
      answer: 'Bluetooth',
      accepted: ['Bluetooth'],
      fact: 'The logo joins the runes for H and B, the initials of Harald Bluetooth.',
      source: { label: 'Bluetooth on Wikipedia', url: 'https://en.wikipedia.org/wiki/Bluetooth' },
      ...overrides.payload,
    },
    evidence: overrides.evidence ?? [LINES[1], LINES[2], LINES[3], LINES[4]],
    factEvidence: overrides.factEvidence ?? LINES[4],
    sourceText: SOURCE,
  };
}

describe('names', () => {
  it('strips disambiguators', () => {
    expect(displayName('Imagine (song)')).toBe('Imagine');
    expect(displayName('Bluetooth')).toBe('Bluetooth');
  });

  it('accepts shorter forms only when they are part of a real name', () => {
    expect(acceptedNames('Diesel engine', ['CI engine'], ['Diesel', 'Petrol'])).toEqual([
      'Diesel engine',
      'CI engine',
      'Diesel',
    ]);
    expect(acceptedNames('Iceland', ['IS', 'Republic of Iceland'])).toEqual([
      'Iceland',
      'Republic of Iceland',
    ]);
  });
});

describe('reviewer', () => {
  it('accepts a grounded story question that never names the answer', () => {
    const r = reviewTrivia(candidate());
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('rejects a question that names the answer', () => {
    const r = reviewTrivia(
      candidate({ payload: { question: `${QUESTION.slice(0, -26)} It is Bluetooth. Name it.` } })
    );
    expect(r.errors.some(e => e.includes('gives away the answer'))).toBe(true);
  });

  it('rejects multiple choice, a short question, and one that never asks', () => {
    const mcq = reviewTrivia(
      candidate({ payload: { question: `${QUESTION} A) Wi-Fi B) Bluetooth C) NFC D) Zigbee` } })
    );
    expect(mcq.errors.some(e => e.includes('multiple choice'))).toBe(true);
    const short = reviewTrivia(candidate({ payload: { question: 'Name the technology.' } }));
    expect(short.errors.some(e => e.includes('words'))).toBe(true);
    const flat = reviewTrivia(
      candidate({
        payload: { question: QUESTION.replace(' Name the technology.', ' It is wireless.') },
      })
    );
    expect(flat.errors).toContain('question must end by asking for the answer');
  });

  it('rejects evidence that is not in the source, or too few facts', () => {
    const r = reviewTrivia(
      candidate({ evidence: ['A made-up claim about something else entirely.'] })
    );
    expect(r.errors.some(e => e.includes('facts cited'))).toBe(true);
    expect(r.errors.some(e => e.includes('not a sentence from the source'))).toBe(true);
    const fact = reviewTrivia(
      candidate({ factEvidence: 'Invented and not in the source at all.' })
    );
    expect(fact.errors).toContain("the fact's evidence is not in the source");
  });
});

describe('judge', () => {
  const ctxWith = (...replies) => {
    const callJudge = vi.fn();
    replies.forEach(r => callJudge.mockResolvedValueOnce(r));
    return { callJudge };
  };
  const reply = (guess, difficulty = 'medium', fair = true) => ({
    guesses: [guess, 'Wi-Fi', 'Zigbee'],
    difficulty,
    fair,
    issues: '',
  });

  it('shows the opening as a question of its own', () => {
    expect(opening('One. Two. Three. Name it.')).toBe('One. Two. What is it?');
  });

  it('passes a question solved only in full, at medium; rejects hard', async () => {
    const v = await judgeTrivia(candidate(), ctxWith(reply('Wi-Fi'), reply('Bluetooth', 'medium')));
    expect(v.ok).toBe(true);
    const hard = await judgeTrivia(
      candidate(),
      ctxWith(reply('Wi-Fi'), reply('Bluetooth', 'hard'))
    );
    expect(hard.ok).toBe(false);
    expect(hard.feedback).toMatch(/aim for medium/);
  });

  it('lets an Indian subject be hard (medium-hard for an Indian audience)', async () => {
    const v = await judgeTrivia(
      { ...candidate(), india: true },
      ctxWith(reply('Wi-Fi'), reply('Bluetooth', 'hard'))
    );
    expect(v.ok).toBe(true);
  });

  it('rejects an opening that already gives it away', async () => {
    const v = await judgeTrivia(candidate(), ctxWith(reply('Bluetooth')));
    expect(v.ok).toBe(false);
    expect(v.feedback).toMatch(/first two sentences/);
  });

  it('rejects an unsolvable, unfair, easy or obscure question', async () => {
    const wrong = await judgeTrivia(candidate(), ctxWith(reply('NFC'), reply('Wi-Fi')));
    expect(wrong.feedback).toMatch(/doesn't point clearly/);
    const unfair = await judgeTrivia(
      candidate(),
      ctxWith(reply('NFC'), reply('Bluetooth', 'medium', false))
    );
    expect(unfair.feedback).toMatch(/Fairness/);
    const easy = await judgeTrivia(candidate(), ctxWith(reply('NFC'), reply('Bluetooth', 'easy')));
    expect(easy.feedback).toMatch(/easy/);
    const obscure = await judgeTrivia(
      candidate(),
      ctxWith(reply('NFC'), reply('Bluetooth', 'obscure'))
    );
    expect(obscure.feedback).toMatch(/obscure/);
  });
});

describe('generator', () => {
  it('writes one grounded question from the picked article', async () => {
    const callAI = vi.fn().mockResolvedValue({
      question: QUESTION,
      evidence: [LINES[1], LINES[2], LINES[3]],
      fact: 'The logo joins the runes for H and B.',
      factEvidence: LINES[4],
      alsoAccept: [],
    });
    const ctx = {
      date: '2026-10-10',
      rng: createRng(1),
      used: new Set(),
      usedSince: async () => new Set(),
      feedback: null,
      callAI,
    };
    const out = await generateTrivia(ctx, {
      fetchArticle: async () => ({
        title: 'Bluetooth',
        url: 'https://en.wikipedia.org/wiki/Bluetooth',
        text: SOURCE,
        wikidataId: 'Q39531',
      }),
      fetchAliases: async () => ['BT'],
    });
    expect(out.payload.answer).toBe('Bluetooth');
    expect(out.payload.accepted).toEqual(['Bluetooth']);
    expect(out.sourceKeys[0]).toMatch(/^wiki:/);
    expect(reviewTrivia(out).ok).toBe(true);
    expect(callAI.mock.calls[0][0]).toContain('HIDDEN SUBJECT');
  });
});

describe('subjects and bank', () => {
  it('has no duplicate subjects and none shared with What Am I', () => {
    const titles = ALL_TOPICS.map(t => t.title);
    expect(new Set(titles).size).toBe(titles.length);
    const whatAmI = new Set(Object.values(WHAT_AM_I).flat());
    expect(titles.filter(t => whatAmI.has(t))).toEqual([]);
    expect(titles.length).toBeGreaterThan(300);
  });

  it('every bank question passes review and its subject is a known topic', () => {
    const titles = new Set(ALL_TOPICS.map(t => t.title));
    for (const entry of BANK) {
      expect(reviewTrivia({ payload: entry.payload }).errors).toEqual([]);
      expect(titles.has(entry.title)).toBe(true);
    }
  });

  it('prefers a bank question whose subject has not been used', () => {
    const used = new Set(BANK.slice(1).map(b => `wiki:${b.title}`));
    const out = pickFromBank({ used, rng: createRng(3) });
    expect(out.sourceKeys).toEqual([`wiki:${BANK[0].title}`]);
  });
});
