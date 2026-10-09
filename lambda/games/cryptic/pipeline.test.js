import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const usage = { current: { avoidTypes: [], avoidAnswers: [], knownAnswers: new Set() } };
vi.mock('./services/dbService.js', () => ({
  getRecentUsage: vi.fn(async () => usage.current),
}));

const { generateValidClue } = await import('./pipeline.js');
const { getRecentUsage } = await import('./services/dbService.js');

/**
 * The pipeline drives two AI calls with the same client: the lexical planner
 * and the clue generator. It distinguishes them by which schema it passes, so
 * the fake does the same — it answers by looking at what was asked for.
 */
function makeAI({ answers = ['CANOE'], clue = 'Small boat when ocean is disturbed (5)' } = {}) {
  const queue = [...answers];
  let lastAnswer = null;
  return vi.fn(async (_prompt, _system, schema) => {
    if (schema?.properties?.answer) {
      lastAnswer = queue.length > 1 ? queue.shift() : queue[0];
      return { answer: lastAnswer, definition: 'Small boat', type: 'anagram', difficulty: 'easy' };
    }
    return {
      clue,
      definition: 'Small boat',
      indicator: 'disturbed',
      fodder: 'ocean',
      indicator_type: 'anagram',
      wordplay_summary: `Anagram of OCEAN = ${lastAnswer}`,
      clue_parts: [
        { text: 'Small boat', type: 'definition' },
        { text: ' when ', type: null },
        { text: 'ocean', type: 'fodder' },
        { text: ' is ', type: null },
        { text: 'disturbed', type: 'indicator', indicator_subtype: 'anagram' },
      ],
    };
  });
}

const verdict = (over = {}) => ({
  valid: true,
  score: 9,
  wordplay_correct: true,
  surface_quality: 5,
  indicator_fair: true,
  feedback: 'Good.',
  reject_lexical: false,
  ...over,
});

beforeEach(() => {
  usage.current = { avoidTypes: [], avoidAnswers: [], knownAnswers: new Set() };
  getRecentUsage.mockClear();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('generateValidClue', () => {
  it('returns the first clue the judge accepts', async () => {
    const ai = makeAI();
    const judge = vi.fn(async () => verdict());
    const out = await generateValidClue(ai, judge, 'supabase');

    expect(out.clue.clue).toMatch(/Small boat/);
    expect(out.verdict.valid).toBe(true);
    expect(out.stats.clueGenerations).toBe(1);
    expect(out.stats.lexicalSelections).toBe(1);
  });

  it('feeds the judge’s rejection reason into the next attempt', async () => {
    const ai = makeAI();
    let call = 0;
    const judge = vi.fn(async () =>
      ++call === 1 ? verdict({ valid: false, feedback: 'Surface is stilted.' }) : verdict()
    );

    await generateValidClue(ai, judge, 'supabase');

    const cluePrompts = ai.mock.calls.filter(([, , s]) => !s?.properties?.answer).map(([p]) => p);
    expect(cluePrompts).toHaveLength(2);
    expect(cluePrompts[1]).toMatch(/PREVIOUS ATTEMPT WAS REJECTED/);
    expect(cluePrompts[1]).toMatch(/Surface is stilted/);
  });

  it('abandons the word immediately on rejectLexical instead of retrying it', async () => {
    const ai = makeAI({ answers: ['CANOE', 'DRAWER'] });
    let call = 0;
    const judge = vi.fn(async () =>
      ++call === 1
        ? verdict({ valid: false, reject_lexical: true, feedback: 'Unclueable.' })
        : verdict()
    );

    const out = await generateValidClue(ai, judge, 'supabase');
    // One clue per word, not three on the first word.
    expect(out.stats.clueGenerations).toBe(2);
    expect(out.stats.lexicalSelections).toBe(2);
  });

  it('feeds abandoned words back into the planner so they are not re-proposed', async () => {
    const ai = makeAI({ answers: ['CANOE', 'DRAWER'] });
    let call = 0;
    const judge = vi.fn(async () =>
      ++call === 1 ? verdict({ valid: false, reject_lexical: true, feedback: 'no' }) : verdict()
    );

    await generateValidClue(ai, judge, 'supabase');

    const lexicalPrompts = ai.mock.calls.filter(([, , s]) => s?.properties?.answer).map(([p]) => p);
    expect(lexicalPrompts[1]).toMatch(/CANOE/);
  });

  it('skips an already-published answer without spending a clue generation', async () => {
    // A repeat answer violates the UNIQUE index on (answer, answer_pattern),
    // so catching it here saves the entire cost of generating and judging a
    // clue that could never be inserted.
    usage.current = {
      avoidTypes: [],
      avoidAnswers: [],
      knownAnswers: new Set(['CANOE']),
    };
    const ai = makeAI({ answers: ['CANOE', 'DRAWER'] });
    const judge = vi.fn(async () => verdict());

    const out = await generateValidClue(ai, judge, 'supabase');
    expect(out.stats.duplicateAnswers).toBe(1);
    expect(out.stats.clueGenerations).toBe(1);
    expect(judge).toHaveBeenCalledOnce();
  });

  it('aborts after three consecutive judge outages rather than draining the budget', async () => {
    const ai = makeAI();
    const judge = vi.fn(async () => {
      throw new Error('judge down');
    });
    await expect(generateValidClue(ai, judge, 'supabase')).rejects.toThrow(/unavailable for 3/);
    expect(judge).toHaveBeenCalledTimes(3);
  });

  it('recovers from a transient judge outage', async () => {
    const ai = makeAI();
    let call = 0;
    const judge = vi.fn(async () => {
      if (++call === 1) throw new Error('blip');
      return verdict();
    });
    const out = await generateValidClue(ai, judge, 'supabase');
    expect(out.verdict.valid).toBe(true);
  });

  it('propagates quota exhaustion immediately', async () => {
    const err = new Error('daily quota gone');
    err.quotaExhausted = true;
    const ai = vi.fn(async () => {
      throw err;
    });
    await expect(generateValidClue(ai, vi.fn(), 'supabase')).rejects.toThrow('daily quota gone');
    expect(ai).toHaveBeenCalledOnce();
  });

  it('still runs when variety constraints cannot be loaded', async () => {
    getRecentUsage.mockRejectedValueOnce(new Error('db down'));
    const out = await generateValidClue(
      makeAI(),
      vi.fn(async () => verdict()),
      'supabase'
    );
    expect(out.verdict.valid).toBe(true);
  });

  it('reports why it gave up, with per-stage counts', async () => {
    const ai = makeAI();
    const judge = vi.fn(async () => verdict({ valid: false, feedback: 'weak surface' }));
    await expect(generateValidClue(ai, judge, 'supabase')).rejects.toThrow(
      /Failed to generate a valid clue after \d+ attempts/
    );
  });

  it('rejects a mechanically broken clue without ever calling the judge', async () => {
    // Hidden-word fodder must be literal; this clue does not contain SERPENT.
    const ai = vi.fn(async (_p, _s, schema) => {
      if (schema?.properties?.answer) {
        return { answer: 'SERPENT', definition: 'Snake', type: 'hidden', difficulty: 'medium' };
      }
      return {
        clue: 'Snake slithers through long grass',
        definition: 'Snake',
        indicator: 'through',
        fodder: 'long grass',
        indicator_type: 'hidden',
        wordplay_summary: 'hidden',
        clue_parts: [
          { text: 'Snake', type: 'definition' },
          { text: ' slithers ', type: null },
          { text: 'through', type: 'indicator' },
          { text: ' ', type: null },
          { text: 'long grass', type: 'fodder' },
        ],
      };
    });
    const judge = vi.fn(async () => verdict());

    await expect(generateValidClue(ai, judge, 'supabase')).rejects.toThrow(/Failed to generate/);
    expect(judge).not.toHaveBeenCalled();
  });
});
