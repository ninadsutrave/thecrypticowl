import { afterEach, describe, expect, it, vi } from 'vitest';
import { callGemini } from './gemini.js';

const ok = text => ({
  ok: true,
  status: 200,
  json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }),
});
const fail = (status, body) => ({ ok: false, status, text: async () => body });

afterEach(() => vi.unstubAllGlobals());

describe('callGemini model fallback', () => {
  it('moves past a retired model (404) to the next one', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(fail(404, '{"error":{"status":"NOT_FOUND"}}'))
      .mockResolvedValueOnce(ok('{"a":1}'));
    vi.stubGlobal('fetch', fetch);
    const out = await callGemini('hi', '', { type: 'OBJECT' }, ['old-model', 'new-model']);
    expect(out).toEqual({ a: 1 });
    expect(fetch.mock.calls[1][0]).toContain('new-model');
  });

  it('remembers the model that worked, so later calls skip the retired one', async () => {
    const fetch = vi.fn().mockResolvedValue(ok('{"b":2}'));
    vi.stubGlobal('fetch', fetch);
    await callGemini('hi', '', { type: 'OBJECT' }, ['old-model', 'new-model']);
    expect(fetch.mock.calls[0][0]).toContain('new-model');
  });

  it('moves past a model this key has no quota for (limit: 0)', async () => {
    const noQuota = JSON.stringify({
      error: {
        code: 429,
        details: [{ violations: [{ quotaId: 'GenerateRequestsPerDay', quotaValue: '0' }] }],
        message: 'Quota exceeded … limit: 0',
      },
    });
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(fail(429, noQuota))
      .mockResolvedValueOnce(ok('{"c":3}'));
    vi.stubGlobal('fetch', fetch);
    const out = await callGemini('hi', '', { type: 'OBJECT' }, ['pro-q', 'flash-q']);
    expect(out).toEqual({ c: 3 });
  });

  it('moves past a model that stays overloaded (503)', async () => {
    const fetch = vi.fn(async url =>
      String(url).includes('busy-m') ? fail(503, 'high demand') : ok('{"d":4}')
    );
    vi.stubGlobal('fetch', fetch);
    vi.useFakeTimers();
    const call = callGemini('hi', '', { type: 'OBJECT' }, ['busy-m', 'calm-m']);
    await vi.runAllTimersAsync();
    expect(await call).toEqual({ d: 4 });
    vi.useRealTimers();
  });

  it('does not fall back on other errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fail(400, 'bad request')));
    await expect(callGemini('hi', '', null, ['m1-x', 'm2-x'])).rejects.toThrow(/400/);
  });
});
