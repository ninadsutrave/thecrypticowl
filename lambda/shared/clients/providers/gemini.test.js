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

  it('does not fall back on other errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fail(400, 'bad request')));
    await expect(callGemini('hi', '', null, ['m1-x', 'm2-x'])).rejects.toThrow(/400/);
  });
});
