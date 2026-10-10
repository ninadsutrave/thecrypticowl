import { describe, expect, it, vi } from 'vitest';
import { createGameHandler } from './gameHandler.js';

const ENV = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' };

function memoryStore(existing = []) {
  const rows = [];
  return {
    rows,
    existingDates: vi.fn(async (_g, dates) => new Set(dates.filter(d => existing.includes(d)))),
    usedSourceKeys: vi.fn(async () => new Set(['src:old'])),
    insertPuzzle: vi.fn(async row => {
      rows.push(row);
      return { inserted: true };
    }),
  };
}

function make(spec, { store = memoryStore(), env = ENV, notify = vi.fn() } = {}) {
  const handler = createGameHandler(
    { game: 'sudoku', label: 'Test', review: () => ({ ok: true, errors: [] }), ...spec },
    { store, env, notify, today: '2026-10-09' }
  );
  return { handler, store, notify };
}

const body = res => JSON.parse(res.body);

describe('createGameHandler', () => {
  it('fails preflight when database secrets are missing', async () => {
    const { handler } = make({ generate: vi.fn() }, { env: {} });
    const res = await handler({});
    expect(res.statusCode).toBe(500);
    expect(body(res).missing).toEqual(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  });

  it('asks AI games for model keys, and non-AI games not', async () => {
    const ai = make({ generate: vi.fn(), needsAI: true });
    expect(body(await ai.handler({ dryRun: true })).missing).toEqual(['GEMINI_API_KEY']);
    const plain = make({ generate: vi.fn() });
    expect(body(await plain.handler({ dryRun: true })).dryRun).toBe(true);
  });

  it('gives optional-AI games a model when keys exist, and runs them without one otherwise', async () => {
    const seen = [];
    const generate = async ctx => {
      seen.push(typeof ctx.callJudge);
      return { payload: {} };
    };
    const getJudgeClient = () => async () => ({});
    const getAIClient = () => async () => ({});
    const store = memoryStore();
    const withKey = createGameHandler(
      {
        game: 'chronology',
        label: 'T',
        optionalAI: true,
        generate,
        review: () => ({ ok: true, errors: [] }),
      },
      {
        store,
        env: { ...ENV, GEMINI_API_KEY: 'k' },
        notify: vi.fn(),
        today: '2026-10-09',
        getAIClient,
        getJudgeClient,
      }
    );
    const without = createGameHandler(
      {
        game: 'chronology',
        label: 'T',
        optionalAI: true,
        generate,
        review: () => ({ ok: true, errors: [] }),
      },
      {
        store: memoryStore(),
        env: ENV,
        notify: vi.fn(),
        today: '2026-10-09',
        getAIClient,
        getJudgeClient,
      }
    );
    expect((await withKey({ date: '2026-10-10' })).statusCode).toBe(200);
    expect((await without({ date: '2026-10-10' })).statusCode).toBe(200);
    expect(seen).toEqual(['function', 'undefined']);
    expect(store.rows[0].generator).toMatch(/screened by gemini/);
  });

  it('dry run generates nothing', async () => {
    const generate = vi.fn();
    const { handler, store } = make({ generate });
    await handler({ dryRun: true });
    expect(generate).not.toHaveBeenCalled();
    expect(store.insertPuzzle).not.toHaveBeenCalled();
  });

  it('fills yesterday through a week ahead, skipping dates that exist', async () => {
    const store = memoryStore(['2026-10-09']);
    const { handler } = make(
      { generate: async ({ date }) => ({ payload: { date }, sourceKeys: [`src:${date}`] }) },
      { store }
    );
    const res = body(await handler({}));
    expect(res.created).toEqual([
      '2026-10-08',
      '2026-10-10',
      '2026-10-11',
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
    ]);
    expect(store.rows.map(r => r.puzzle_date)).toEqual(res.created);
    expect(store.rows[0]).toMatchObject({
      game: 'sudoku',
      difficulty: 'medium',
      generator: 'algorithm',
    });
  });

  it('passes used source keys to the generator, including ones taken earlier in the run', async () => {
    const seen = [];
    const { handler } = make({
      generate: async ({ date, used }) => {
        seen.push([...used]);
        return { payload: {}, sourceKeys: [`src:${date}`] };
      },
    });
    await handler({ date: '2026-10-10' });
    expect(seen[0]).toContain('src:old');
  });

  it('retries a rejected candidate and feeds the reasons back', async () => {
    const feedbacks = [];
    let n = 0;
    const { handler, store } = make({
      generate: async ({ feedback }) => {
        feedbacks.push(feedback);
        return { payload: { n: ++n } };
      },
      review: c =>
        c.payload.n < 3 ? { ok: false, errors: [`bad ${c.payload.n}`] } : { ok: true, errors: [] },
    });
    await handler({ date: '2026-10-10' });
    expect(feedbacks).toEqual([null, 'bad 1', 'bad 2']);
    expect(store.rows[0].review.attempts).toBe(3);
  });

  it('ships only what the judge accepts, and lets it trim the payload', async () => {
    const { handler, store } = make({
      generate: async () => ({ payload: { items: [1, 2, 3] } }),
      judge: async c => ({ ok: true, payload: { items: c.payload.items.slice(0, 2) } }),
    });
    await handler({ date: '2026-10-10' });
    expect(store.rows[0].payload).toEqual({ items: [1, 2] });
  });

  it("re-reviews a judge's trimmed payload and never stores one that fails", async () => {
    const { handler, store } = make({
      maxAttempts: 2,
      generate: async () => ({ payload: { items: [1, 2, 3] } }),
      review: c => ({
        ok: c.payload.items.length >= 2,
        errors: c.payload.items.length >= 2 ? [] : ['too few items'],
      }),
      judge: async () => ({ ok: true, payload: { items: [1] } }),
    });
    await handler({ date: '2026-10-10' });
    expect(store.rows).toHaveLength(0);
  });

  it('treats a crashing judge as a rejection, not a pass', async () => {
    const { handler, store } = make({
      maxAttempts: 2,
      generate: async () => ({ payload: {} }),
      judge: async () => {
        throw new Error('timeout');
      },
    });
    const res = body(await handler({ date: '2026-10-10' }));
    expect(store.rows).toHaveLength(0);
    expect(res.failed[0].reason).toMatch(/judge unavailable/);
  });

  it('uses the fallback when every attempt fails', async () => {
    const { handler, store } = make({
      maxAttempts: 2,
      generate: async () => {
        throw new Error('model down');
      },
      fallback: async () => ({ payload: { from: 'fallback' }, summary: 'backup' }),
    });
    await handler({ date: '2026-10-10' });
    expect(store.rows[0].payload).toEqual({ from: 'fallback' });
  });

  it('aborts the whole run on quota exhaustion', async () => {
    const quota = Object.assign(new Error('quota'), { quotaExhausted: true });
    const generate = vi.fn(async () => {
      throw quota;
    });
    const { handler, notify } = make({ generate });
    const res = await handler({});
    expect(res.statusCode).toBe(429);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0]).toMatch(/quota exhausted/);
  });

  it('stops starting new dates when Lambda time is short', async () => {
    const { handler, store } = make({ generate: async () => ({ payload: {} }) });
    const res = body(await handler({}, { getRemainingTimeInMillis: () => 10_000 }));
    expect(store.rows).toHaveLength(0);
    expect(res.skippedForTime).toHaveLength(9);
  });

  it('previews without touching the database', async () => {
    const store = memoryStore();
    const { handler } = make({ generate: async () => ({ payload: { x: 1 } }) }, { store, env: {} });
    const res = body(await handler({ preview: true, date: '2026-10-10' }));
    expect(res.payload).toEqual({ x: 1 });
    expect(store.existingDates).not.toHaveBeenCalled();
  });

  it('lets a generator ask which keys were used recently, once per window per run', async () => {
    const store = memoryStore();
    const seen = [];
    const { handler } = make(
      {
        generate: async ({ usedSince }) => {
          seen.push([...(await usedSince(365))]);
          await usedSince(365);
          return { payload: {} };
        },
      },
      { store }
    );
    await handler({});
    expect(seen[0]).toEqual(['src:old']);
    // One query for the initial `used` set, one for the 365-day window.
    expect(store.usedSourceKeys).toHaveBeenCalledTimes(2);

    const preview = make({
      generate: async ({ usedSince }) => ({ payload: { n: (await usedSince(90)).size } }),
    });
    expect(JSON.parse((await preview.handler({ preview: true })).body).payload).toEqual({ n: 0 });
  });

  it('rejects a malformed date', async () => {
    const { handler } = make({ generate: vi.fn() });
    expect((await handler({ date: '2026-13-40' })).statusCode).toBe(400);
  });

  it('reports health-check warnings in the alert', async () => {
    const { handler, notify } = make({
      generate: async () => ({ payload: {} }),
      healthCheck: async () => ['pool low'],
    });
    await handler({ date: '2026-10-10' });
    expect(notify.mock.calls[0][0]).toMatch(/pool low/);
    expect(notify.mock.calls[0][1]).toBe(false);
  });

  it('emails low stock tagged "stock", on Mondays only', async () => {
    const run = async today => {
      const notifyStock = vi.fn(async () => {});
      const handler = createGameHandler(
        {
          game: 'sudoku',
          label: 'Trivia',
          review: () => ({ ok: true, errors: [] }),
          generate: async () => ({ payload: {} }),
          healthCheck: async () => ['only 12 India subjects left'],
        },
        { store: memoryStore(), env: ENV, notify: vi.fn(), notifyStock, today }
      );
      await handler({ date: today });
      return notifyStock;
    };
    const monday = await run('2026-10-12');
    expect(monday).toHaveBeenCalledTimes(1);
    expect(monday.mock.calls[0][0]).toMatch(/only 12 India subjects left/);
    expect(monday.mock.calls[0][1]).toMatchObject({ kind: 'stock' });
    expect(monday.mock.calls[0][1].subject).toMatch(/Trivia puzzles are running low/);
    expect(await run('2026-10-13')).not.toHaveBeenCalled();
  });
});
