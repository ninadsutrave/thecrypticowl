import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { judgeClue, structuralErrors, MIN_QUALITY_SCORE } from './judge.js';

/** A structurally valid anagram clue whose arithmetic genuinely works. */
const goodClue = (over = {}) => ({
  clue: 'Small boat when ocean is disturbed (5)',
  definition: 'Small boat',
  indicator: 'disturbed',
  fodder: 'ocean',
  indicator_type: 'anagram',
  wordplay_summary: 'Anagram (disturbed) of OCEAN = CANOE',
  clue_parts: [
    { text: 'Small boat', type: 'definition' },
    { text: ' when ', type: null },
    { text: 'ocean', type: 'fodder' },
    { text: ' is ', type: null },
    { text: 'disturbed', type: 'indicator', indicator_subtype: 'anagram' },
    { text: ' (5)', type: null },
  ],
  ...over,
});

const lexical = (over = {}) => ({
  answer: 'CANOE',
  type: 'anagram',
  definition: 'Small boat',
  ...over,
});

/** Judge that always approves — isolates the deterministic gates. */
const approvingJudge = vi.fn(async () => ({
  valid: true,
  score: 9,
  wordplay_correct: true,
  surface_quality: 5,
  indicator_fair: true,
  feedback: 'Elegant.',
  reject_lexical: false,
}));

beforeEach(() => {
  approvingJudge.mockClear();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('structuralErrors', () => {
  it('passes a well-formed clue', () => {
    expect(structuralErrors(goodClue(), lexical())).toEqual([]);
  });

  it.each([
    ['empty clue text', { clue: '   ' }],
    ['empty definition', { definition: '' }],
    ['missing clue_parts', { clue_parts: [] }],
    ['malformed clue_parts segment', { clue_parts: [{ text: '' }] }],
  ])('rejects %s', (_label, over) => {
    expect(structuralErrors(goodClue(over), lexical()).length).toBeGreaterThan(0);
  });

  it('rejects a leaked answer', () => {
    const errs = structuralErrors(
      goodClue({ clue: 'Small boat CANOE when ocean is disturbed (5)' }),
      lexical()
    );
    expect(errs.join(' ')).toMatch(/Answer leaked/);
  });

  it('allows the answer to appear for hidden clues, where it is embedded by design', () => {
    const errs = structuralErrors(
      {
        ...goodClue({
          clue: 'Snake concealed inside laser pentagram (7)',
          definition: 'Snake',
          indicator: 'concealed inside',
          fodder: 'laser pentagram',
          clue_parts: [
            { text: 'Snake', type: 'definition' },
            { text: ' ', type: null },
            { text: 'concealed inside', type: 'indicator' },
            { text: ' ', type: null },
            { text: 'laser pentagram', type: 'fodder' },
            { text: ' (7)', type: null },
          ],
        }),
      },
      lexical({ answer: 'SERPENT', type: 'hidden', definition: 'Snake' })
    );
    expect(errs.join(' ')).not.toMatch(/Answer leaked/);
  });

  it('rejects a definition that is not at an extremity', () => {
    const errs = structuralErrors(
      goodClue({
        clue: 'When the small boat ocean is disturbed (5)',
        clue_parts: [
          { text: 'When the ', type: null },
          { text: 'small boat', type: 'definition' },
          { text: ' ocean is disturbed (5)', type: null },
        ],
      }),
      lexical()
    );
    expect(errs.join(' ')).toMatch(/non-Ximenean/);
  });

  it('rejects clue_parts that do not reconstruct the clue', () => {
    const errs = structuralErrors(
      goodClue({ clue_parts: [{ text: 'Something else entirely', type: 'definition' }] }),
      lexical()
    );
    expect(errs.join(' ')).toMatch(/do not reconstruct/);
  });

  it('requires exactly one definition segment', () => {
    const twoDefs = goodClue();
    twoDefs.clue_parts = twoDefs.clue_parts.map(p =>
      p.type === 'fodder' ? { ...p, type: 'definition' } : p
    );
    expect(structuralErrors(twoDefs, lexical()).join(' ')).toMatch(/tagged "definition"/);

    const noDefs = goodClue();
    noDefs.clue_parts = noDefs.clue_parts.map(p =>
      p.type === 'definition' ? { ...p, type: 'fodder' } : p
    );
    expect(structuralErrors(noDefs, lexical()).join(' ')).toMatch(/No clue_parts segment/);
  });

  it('rejects a fodder that sits entirely inside the definition', () => {
    // Definition and wordplay must be disjoint spans, or the clue has no
    // wordplay at all — it is just a definition read twice.
    const errs = structuralErrors(
      goodClue({
        clue: 'Small boat disturbed (5)',
        definition: 'Small boat',
        fodder: 'boat',
        clue_parts: [
          { text: 'Small boat', type: 'definition' },
          { text: ' ', type: null },
          { text: 'disturbed', type: 'indicator' },
          { text: ' (5)', type: null },
        ],
      }),
      lexical()
    );
    expect(errs.join(' ')).toMatch(/disjoint/);
  });

  it('rejects an indicator that does not appear in the clue', () => {
    const errs = structuralErrors(goodClue({ indicator: 'scrambled' }), lexical());
    expect(errs.join(' ')).toMatch(/does not appear in the clue text/);
  });

  it('rejects a mismatched letter count', () => {
    const errs = structuralErrors(
      goodClue({
        clue: 'Small boat when ocean is disturbed (7)',
        clue_parts: [
          { text: 'Small boat', type: 'definition' },
          { text: ' when ', type: null },
          { text: 'ocean', type: 'fodder' },
          { text: ' is ', type: null },
          { text: 'disturbed', type: 'indicator' },
          { text: ' (7)', type: null },
        ],
      }),
      lexical()
    );
    expect(errs.join(' ')).toMatch(/Letter count \(7\)/);
  });

  it('accepts a multi-word letter count that sums correctly', () => {
    const errs = structuralErrors(
      {
        ...goodClue({
          clue: 'Small boat when ocean is disturbed (2,3)',
          clue_parts: [
            { text: 'Small boat', type: 'definition' },
            { text: ' when ', type: null },
            { text: 'ocean', type: 'fodder' },
            { text: ' is ', type: null },
            { text: 'disturbed', type: 'indicator' },
            { text: ' (2,3)', type: null },
          ],
        }),
      },
      lexical()
    );
    expect(errs.join(' ')).not.toMatch(/Letter count/);
  });

  it('rejects meta-commentary leakage', () => {
    const errs = structuralErrors(
      goodClue({
        clue: "Here's my clue: small boat when ocean is disturbed (5)",
        clue_parts: [
          { text: "Here's my clue: small boat when ocean is disturbed (5)", type: 'definition' },
        ],
      }),
      lexical()
    );
    expect(errs.join(' ')).toMatch(/meta-commentary/);
  });

  it('does not flag ordinary words that merely resemble narration', () => {
    // "wait" and "here" appear naturally in cryptic surfaces; only
    // self-correction phrasing is banned.
    const errs = structuralErrors(
      goodClue({
        clue: 'Wait here for the ocean disturbed, small boat (5)',
        definition: 'small boat',
        clue_parts: [
          { text: 'Wait here for the ', type: null },
          { text: 'ocean', type: 'fodder' },
          { text: ' ', type: null },
          { text: 'disturbed', type: 'indicator' },
          { text: ', ', type: null },
          { text: 'small boat', type: 'definition' },
          { text: ' (5)', type: null },
        ],
      }),
      lexical()
    );
    expect(errs.join(' ')).not.toMatch(/meta-commentary/);
  });

  it('rejects an absurd clue_parts count', () => {
    const errs = structuralErrors(
      goodClue({ clue_parts: Array.from({ length: 40 }, () => ({ text: 'x' })) }),
      lexical()
    );
    expect(errs.join(' ')).toMatch(/implausible/);
  });
});

describe('judgeClue', () => {
  it('requires a judge function', async () => {
    await expect(judgeClue(goodClue(), lexical(), undefined)).rejects.toThrow(
      /requires a callJudge/
    );
  });

  it('accepts a clue that passes every gate', async () => {
    const v = await judgeClue(goodClue(), lexical(), approvingJudge);
    expect(v.valid).toBe(true);
    expect(v.mechanicallyVerified).toBe(true);
    expect(v.stage).toBe('judge');
    expect(approvingJudge).toHaveBeenCalledOnce();
  });

  it('rejects on structural failure WITHOUT calling the judge', async () => {
    const v = await judgeClue(goodClue({ definition: '' }), lexical(), approvingJudge);
    expect(v.valid).toBe(false);
    expect(v.stage).toBe('structural');
    expect(approvingJudge).not.toHaveBeenCalled();
  });

  it('rejects a mechanically refuted clue WITHOUT calling the judge', async () => {
    // The whole point of the mechanical gate: a hidden word that is not
    // actually hidden costs zero AI calls to reject.
    const v = await judgeClue(
      goodClue({
        clue: 'Snake slithers through long grass (7)',
        definition: 'Snake',
        indicator: 'through',
        fodder: 'long grass',
        clue_parts: [
          { text: 'Snake', type: 'definition' },
          { text: ' slithers ', type: null },
          { text: 'through', type: 'indicator' },
          { text: ' ', type: null },
          { text: 'long grass', type: 'fodder' },
          { text: ' (7)', type: null },
        ],
      }),
      lexical({ answer: 'SERPENT', type: 'hidden', definition: 'Snake' }),
      approvingJudge
    );
    expect(v.valid).toBe(false);
    expect(v.stage).toBe('mechanical');
    expect(v.feedback).toMatch(/mechanically incorrect/);
    expect(approvingJudge).not.toHaveBeenCalled();
  });

  it('tells the judge when the arithmetic is already confirmed', async () => {
    await judgeClue(goodClue(), lexical(), approvingJudge);
    const prompt = approvingJudge.mock.calls[0][0];
    expect(prompt).toMatch(/MECHANICAL CHECK — PASSED/);
    expect(prompt).toMatch(/Do NOT set wordplay_correct = false on arithmetic grounds/);
  });

  it('tells the judge exactly what to check when arithmetic is inconclusive', async () => {
    await judgeClue(
      goodClue({ fodder: 'sea', wordplay_summary: 'Anagram of a synonym of sea' }),
      lexical(),
      approvingJudge
    );
    const prompt = approvingJudge.mock.calls[0][0];
    expect(prompt).toMatch(/MECHANICAL CHECK — INCONCLUSIVE/);
    expect(prompt).toMatch(/synonym/);
  });

  it.each([
    ['judge says invalid', { valid: false }],
    ['wordplay marked incorrect', { wordplay_correct: false }],
    ['score below threshold', { score: MIN_QUALITY_SCORE - 1 }],
    ['score is not a number', { score: null }],
  ])('rejects when %s', async (_label, over) => {
    const judge = vi.fn(async () => ({
      valid: true,
      score: 9,
      wordplay_correct: true,
      surface_quality: 5,
      indicator_fair: true,
      feedback: 'x',
      reject_lexical: false,
      ...over,
    }));
    const v = await judgeClue(goodClue(), lexical(), judge);
    expect(v.valid).toBe(false);
  });

  it('accepts exactly at the threshold', async () => {
    const judge = vi.fn(async () => ({
      valid: true,
      score: MIN_QUALITY_SCORE,
      wordplay_correct: true,
      surface_quality: 4,
      indicator_fair: true,
      feedback: 'ok',
      reject_lexical: false,
    }));
    expect((await judgeClue(goodClue(), lexical(), judge)).valid).toBe(true);
  });

  it('fails safe when the judge is unreachable — never ships unreviewed', async () => {
    const judge = vi.fn(async () => {
      throw new Error('503 upstream');
    });
    const v = await judgeClue(goodClue(), lexical(), judge);
    expect(v.valid).toBe(false);
    expect(v.judgeUnavailable).toBe(true);
    expect(v.stage).toBe('unavailable');
  });

  it('propagates quota exhaustion so the pipeline can abort the run', async () => {
    const err = new Error('quota');
    err.quotaExhausted = true;
    const judge = vi.fn(async () => {
      throw err;
    });
    await expect(judgeClue(goodClue(), lexical(), judge)).rejects.toThrow('quota');
  });

  it('passes through the rejectLexical signal', async () => {
    const judge = vi.fn(async () => ({
      valid: false,
      score: 2,
      wordplay_correct: false,
      surface_quality: 1,
      indicator_fair: false,
      feedback: 'CANOE has no viable anagram here.',
      reject_lexical: true,
    }));
    const v = await judgeClue(goodClue(), lexical(), judge);
    expect(v.rejectLexical).toBe(true);
  });
});
