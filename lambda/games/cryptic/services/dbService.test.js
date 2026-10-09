import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * The Supabase client is a fluent builder, so the fake mirrors that shape:
 * `.from(table)` returns a thenable chain whose terminal value comes from a
 * per-table script. Each test declares only the responses it cares about.
 */
function makeFakeDb(script = {}) {
  const calls = { inserts: {}, deletes: [] };

  const chain = table => {
    const state = { table, op: 'select' };
    const self = {
      select: () => self,
      eq: (col, val) => {
        state.eq = [col, val];
        return self;
      },
      gte: () => self,
      order: () => self,
      limit: () => resolve(),
      single: () => resolve(),
      maybeSingle: () => resolve(),
      insert: rows => {
        state.op = 'insert';
        (calls.inserts[table] ??= []).push(rows);
        return self;
      },
      delete: () => {
        state.op = 'delete';
        return self;
      },
      then: (onFulfilled, onRejected) => resolve().then(onFulfilled, onRejected),
    };

    function resolve() {
      const handler = script[`${table}.${state.op}`] ?? script[table];
      const value =
        typeof handler === 'function'
          ? handler(state, calls)
          : (handler ?? { data: null, error: null });
      if (state.op === 'delete') calls.deletes.push({ table, eq: state.eq });
      return Promise.resolve(value);
    }

    return self;
  };

  return { client: { from: chain }, calls };
}

// dbClient is module-level, so stub it before importing the service.
const fake = { current: makeFakeDb() };
vi.mock('../../../shared/clients/dbClient.js', () => ({
  getDBClient: () => fake.current.client,
}));

const { getRecentUsage, writeToDB, deriveAnswerPattern } = await import('./dbService.js');

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('deriveAnswerPattern', () => {
  it('defaults to the total letter count', () => {
    expect(deriveAnswerPattern('CANOE')).toBe('5');
    expect(deriveAnswerPattern('ROSEWATER')).toBe('9');
  });

  it('renders an explicit multi-word breakdown', () => {
    expect(deriveAnswerPattern('ROSEWATER', [4, 5])).toBe('4,5');
  });

  it('throws when the breakdown does not sum to the answer length', () => {
    expect(() => deriveAnswerPattern('ROSEWATER', [4, 4])).toThrow(/sum to 8/);
  });

  it('ignores non-letters when counting', () => {
    expect(deriveAnswerPattern('ROSE-WATER')).toBe('9');
  });
});

describe('getRecentUsage', () => {
  it('bans answers from the window and types used 3+ times', () => {
    fake.current = makeFakeDb({
      daily_puzzles: {
        data: [
          { clues: { answer: 'CANOE', primary_type: 'anagram' } },
          { clues: { answer: 'DRAWER', primary_type: 'anagram' } },
          { clues: { answer: 'SPEAR', primary_type: 'anagram' } },
          { clues: { answer: 'SERPENT', primary_type: 'hidden' } },
          { clues: null },
        ],
        error: null,
      },
      clues: { data: [{ answer: 'CANOE' }, { answer: 'ancient' }], error: null },
    });

    return getRecentUsage('supabase').then(usage => {
      expect(usage.avoidAnswers).toEqual(['CANOE', 'DRAWER', 'SPEAR', 'SERPENT']);
      expect(usage.avoidTypes).toEqual(['anagram']);
      expect(usage.avoidTypes).not.toContain('hidden');
    });
  });

  it('returns every published answer, uppercased, for the uniqueness screen', async () => {
    fake.current = makeFakeDb({
      daily_puzzles: { data: [], error: null },
      clues: { data: [{ answer: 'CANOE' }, { answer: 'drawer' }], error: null },
    });
    const usage = await getRecentUsage('supabase');
    expect(usage.knownAnswers.has('CANOE')).toBe(true);
    expect(usage.knownAnswers.has('DRAWER')).toBe(true);
  });

  it('degrades gracefully when the full-history query fails', async () => {
    fake.current = makeFakeDb({
      daily_puzzles: { data: [], error: null },
      clues: { data: null, error: { message: 'timeout' } },
    });
    const usage = await getRecentUsage('supabase');
    expect(usage.knownAnswers.size).toBe(0);
  });

  it('propagates a failure of the variety query', async () => {
    fake.current = makeFakeDb({
      daily_puzzles: { data: null, error: new Error('boom') },
      clues: { data: [], error: null },
    });
    await expect(getRecentUsage('supabase')).rejects.toThrow('boom');
  });
});

describe('writeToDB', () => {
  const lexical = {
    answer: 'CANOE',
    type: 'anagram',
    definition: 'Small boat',
    difficulty: 'easy',
  };
  const clue = {
    clue: 'Small boat when ocean is disturbed (5)',
    definition: 'Small boat',
    indicator: 'disturbed',
    indicator_type: 'anagram',
    fodder: 'ocean',
    wordplay_summary: 'Anagram of OCEAN',
    clue_parts: [
      { text: 'Small boat', type: 'definition' },
      { text: ' when ', type: null },
      { text: 'ocean', type: 'fodder' },
      { text: ' is ', type: null },
      { text: 'disturbed', type: 'indicator', indicator_subtype: 'anagram' },
    ],
  };
  const verdict = {
    score: 9,
    surfaceQuality: 5,
    wordplayCorrect: true,
    indicatorFair: true,
    mechanicallyVerified: true,
  };

  const happyScript = (over = {}) => ({
    'daily_puzzles.select': { data: [], error: null },
    daily_puzzles: { data: [], error: null },
    'clues.insert': { data: { id: 'clue-uuid' }, error: null },
    'clue_components.insert': { data: null, error: null },
    ...over,
  });

  it('writes the clue, schedules it, and records the breakdown', async () => {
    fake.current = makeFakeDb(happyScript());
    const res = await writeToDB(lexical, clue, verdict, 'gemini', 'supabase');

    expect(res.skipped).toBe(false);
    expect(res.puzzleNumber).toBe(1);

    const [row] = fake.current.calls.inserts.clues;
    expect(row.answer).toBe('CANOE');
    expect(row.answer_pattern).toBe('5');
    expect(row.judge_score).toBe(9);
    expect(row.mechanically_verified).toBe(true);

    const [components] = fake.current.calls.inserts.clue_components;
    expect(components).toHaveLength(3);
    expect(components.map(c => c.role)).toEqual(['definition', 'fodder', 'indicator']);
    expect(components[2].indicator_type).toBe('anagram');
  });

  it('attributes the clue to the right author per provider', async () => {
    // Misattribution was silent before: unregistered providers all fell
    // through to Gemini's author id.
    for (const [provider, expected] of [
      ['gemini', '7211516e-e61b-410a-b31c-6a1651515151'],
      ['claude', '1211516e-e61b-410a-b31c-6a1651515151'],
      ['deepseek', '3f2a1c4e-8b7d-4e9a-9c1f-2d5e6a7b8c90'],
      ['grok', '5c8b2d1a-6e4f-4a3b-8d7c-1f9e0a2b3c4d'],
      ['mistral', '9d4e7f2b-3a1c-4b8e-9f6d-7c2a5b8e1d3f'],
    ]) {
      fake.current = makeFakeDb(happyScript());
      await writeToDB(lexical, clue, verdict, provider, 'supabase');
      expect(fake.current.calls.inserts.clues[0].author_id, provider).toBe(expected);
    }
  });

  it('skips when a puzzle already exists for the target date', async () => {
    fake.current = makeFakeDb(
      happyScript({ 'daily_puzzles.select': { data: [{ id: 'existing' }], error: null } })
    );
    const res = await writeToDB(lexical, clue, verdict, 'gemini', 'supabase');
    expect(res.skipped).toBe(true);
    expect(fake.current.calls.inserts.clues).toBeUndefined();
  });

  it('names a duplicate-answer collision instead of surfacing a raw 23505', async () => {
    fake.current = makeFakeDb(
      happyScript({ 'clues.insert': { data: null, error: { code: '23505', message: 'dup' } } })
    );
    await expect(writeToDB(lexical, clue, verdict, 'gemini', 'supabase')).rejects.toThrow(
      /Duplicate clue rejected/
    );
  });

  it('rolls back the orphaned clue row when scheduling fails', async () => {
    fake.current = makeFakeDb(
      happyScript({
        'daily_puzzles.insert': { data: null, error: { code: '42501', message: 'denied' } },
      })
    );
    await expect(writeToDB(lexical, clue, verdict, 'gemini', 'supabase')).rejects.toMatchObject({
      code: '42501',
    });
    expect(fake.current.calls.deletes).toContainEqual({ table: 'clues', eq: ['id', 'clue-uuid'] });
  });

  it('treats a failed clue_components insert as non-fatal', async () => {
    fake.current = makeFakeDb(
      happyScript({ 'clue_components.insert': { data: null, error: { message: 'nope' } } })
    );
    const res = await writeToDB(lexical, clue, verdict, 'gemini', 'supabase');
    expect(res.skipped).toBe(false);
  });

  it('falls back to the type-derived indicator sub-type when the model reports none', async () => {
    fake.current = makeFakeDb(happyScript());
    await writeToDB(
      lexical,
      {
        ...clue,
        indicator_type: '',
        clue_parts: clue.clue_parts.map(({ indicator_subtype: _i, ...p }) => p),
      },
      verdict,
      'gemini',
      'supabase'
    );
    const [components] = fake.current.calls.inserts.clue_components;
    expect(components.find(c => c.role === 'indicator').indicator_type).toBe('anagram');
  });
});
