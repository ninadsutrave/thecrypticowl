import { describe, it, expect, vi } from 'vitest';
import { createCrypticHandler, resolveRunConfig } from './index.js';

const base = {
  SUPABASE_URL: 'https://x.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-key',
};

describe('resolveRunConfig', () => {
  it('defaults to gemini for both roles', () => {
    const c = resolveRunConfig({ ...base, GEMINI_API_KEY: 'k' });
    expect(c.aiProvider).toBe('gemini');
    expect(c.judgeProvider).toBe('gemini');
    expect(c.missing).toEqual([]);
  });

  it('resolves aliases', () => {
    const c = resolveRunConfig({ ...base, AI_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'k' });
    expect(c.aiProvider).toBe('claude');

    const g = resolveRunConfig({ ...base, AI_PROVIDER: 'xai', XAI_API_KEY: 'k' });
    expect(g.aiProvider).toBe('grok');
  });

  it('requires the JUDGE provider key, not just the generator key', () => {
    // The regression that made every non-Gemini run fail: the judge was
    // hardwired to Gemini, so preflight passed without a Gemini key and the
    // run died three judge failures later instead of at preflight.
    const c = resolveRunConfig({
      ...base,
      AI_PROVIDER: 'claude',
      ANTHROPIC_API_KEY: 'k',
      JUDGE_PROVIDER: 'gemini',
    });
    expect(c.aiProvider).toBe('claude');
    expect(c.judgeProvider).toBe('gemini');
    expect(c.missing).toEqual(['GEMINI_API_KEY']);
  });

  it('lets the judge run on a different family from the generator', () => {
    const c = resolveRunConfig({
      ...base,
      AI_PROVIDER: 'claude',
      ANTHROPIC_API_KEY: 'k',
      JUDGE_PROVIDER: 'gemini',
      GEMINI_API_KEY: 'g',
    });
    expect(c.missing).toEqual([]);
    expect(c.aiProvider).toBe('claude');
    expect(c.judgeProvider).toBe('gemini');
  });

  it('defaults the judge to the generator provider', () => {
    const c = resolveRunConfig({ ...base, AI_PROVIDER: 'mistral', MISTRAL_API_KEY: 'k' });
    expect(c.judgeProvider).toBe('mistral');
    expect(c.missing).toEqual([]);
  });

  it('falls back to gemini when the requested provider has no key but gemini does', () => {
    const c = resolveRunConfig({ ...base, AI_PROVIDER: 'openai', GEMINI_API_KEY: 'g' });
    expect(c.aiProvider).toBe('gemini');
    expect(c.judgeProvider).toBe('gemini');
    expect(c.missing).toEqual([]);
    expect(c.warnings.join(' ')).toMatch(/Falling back to gemini/);
  });

  it('keeps the requested provider when gemini is also unusable, so the error names the right secret', () => {
    const c = resolveRunConfig({ ...base, AI_PROVIDER: 'openai' });
    expect(c.aiProvider).toBe('openai');
    expect(c.missing).toEqual(['OPENAI_API_KEY']);
  });

  it('reports missing database secrets', () => {
    const c = resolveRunConfig({ GEMINI_API_KEY: 'k' });
    expect(c.missing).toEqual(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  });

  it('treats a blank env var as missing', () => {
    const c = resolveRunConfig({ ...base, GEMINI_API_KEY: '   ' });
    expect(c.missing).toEqual(['GEMINI_API_KEY']);
  });

  it('de-duplicates a secret needed by both roles', () => {
    const c = resolveRunConfig({ ...base, AI_PROVIDER: 'gemini', JUDGE_PROVIDER: 'gemini' });
    expect(c.missing).toEqual(['GEMINI_API_KEY']);
  });

  it('falls back and warns on an unknown provider name', () => {
    const c = resolveRunConfig({ ...base, AI_PROVIDER: 'llama', GEMINI_API_KEY: 'k' });
    expect(c.aiProvider).toBe('gemini');
    expect(c.warnings.join(' ')).toMatch(/not a known provider/);
  });
});

describe('filling the buffer', () => {
  const env = { ...base, GEMINI_API_KEY: 'k', PUZZLE_DAYS_AHEAD: '3' };
  const clue = n => ({
    lexical: { answer: `WORD${n}`, type: 'anagram' },
    clue: { clue: `Clue ${n} (5)` },
    verdict: { score: 8, surfaceQuality: 4, wordplayCorrect: true },
    stats: { clueGenerations: 1, lexicalSelections: 1 },
  });

  /** A fake store: `stocked` dates exist; each write takes the earliest free one. */
  function setup(stocked, { failOn = [], timeLeft = () => Infinity } = {}) {
    const dates = new Set(stocked);
    const free = today => {
      const d = new Date(`${today}T00:00:00Z`);
      while (dates.has(d.toISOString().slice(0, 10))) d.setUTCDate(d.getUTCDate() + 1);
      return d.toISOString().slice(0, 10);
    };
    let n = 0;
    const deps = {
      env,
      today: '2026-10-17',
      getAIClient: () => () => {},
      getJudgeClient: () => () => {},
      nextFreeDate: async (_db, today) => free(today),
      generateValidClue: vi.fn(async () => {
        n++;
        if (failOn.includes(n))
          throw new Error('Failed to generate a valid clue after 15 attempts.');
        return clue(n);
      }),
      writeToDB: vi.fn(async () => {
        const date = free('2026-10-17');
        dates.add(date);
        return { skipped: false, date, puzzleNumber: 100 + n };
      }),
      notify: vi.fn(async () => {}),
    };
    return {
      deps,
      dates,
      handler: createCrypticHandler(deps),
      ctx: { getRemainingTimeInMillis: timeLeft },
    };
  }

  it('fills every missing day up to the target, earliest first', async () => {
    const { deps, dates, handler, ctx } = setup(['2026-10-17', '2026-10-18']);
    const res = JSON.parse((await handler({}, ctx)).body);
    expect(res.created.map(c => c.date)).toEqual(['2026-10-19', '2026-10-20']);
    expect(res.stockedTo).toBe('2026-10-20');
    expect(dates.has('2026-10-21')).toBe(false);
    expect(deps.notify).toHaveBeenCalledOnce();
    expect(deps.notify.mock.calls[0][1]).toBe(true);
  });

  it('does nothing, and sends no alert, when already stocked', async () => {
    const { deps, handler, ctx } = setup(['2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20']);
    const res = JSON.parse((await handler({}, ctx)).body);
    expect(res.success).toBe(true);
    expect(deps.generateValidClue).not.toHaveBeenCalled();
    expect(deps.notify).not.toHaveBeenCalled();
  });

  it('stops at the first failure, keeping what it made, and alerts as a failure', async () => {
    const { deps, handler, ctx } = setup(['2026-10-17'], { failOn: [2] });
    const out = await handler({}, ctx);
    const res = JSON.parse(out.body);
    expect(out.statusCode).toBe(500);
    expect(res.created.map(c => c.date)).toEqual(['2026-10-18']);
    expect(deps.generateValidClue).toHaveBeenCalledTimes(2);
    expect(deps.notify.mock.calls[0][1]).toBe(false);
    expect(deps.notify.mock.calls[0][0]).toMatch(/2026-10-18[\s\S]*Failed to generate/);
  });

  it('starts another day only with enough time left', async () => {
    const { deps, handler } = setup(['2026-10-17']);
    const res = JSON.parse((await handler({}, { getRemainingTimeInMillis: () => 60_000 })).body);
    expect(res.created).toHaveLength(1);
    expect(deps.notify.mock.calls[0][0]).toMatch(/out of time/);
  });
});
