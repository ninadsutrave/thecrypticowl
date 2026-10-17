import { afterEach, describe, it, expect, vi } from 'vitest';
import { callOpenAICompatible } from './_openaiCompatible.js';

const cfg = {
  providerLabel: 'groq',
  baseUrl: 'https://api.example.test/v1',
  apiKey: 'k',
  model: 'openai/gpt-oss-120b',
  schemaMode: 'json_object',
};

const reply = (status, body, headers = {}) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers });

afterEach(() => vi.unstubAllGlobals());

describe('rate limits', () => {
  it('stops at once on a daily limit, flagged as quota exhausted', async () => {
    const fetch = vi.fn(async () =>
      reply(429, {
        error: { message: 'Rate limit reached ... on tokens per day (TPD): Limit 200000' },
      })
    );
    vi.stubGlobal('fetch', fetch);
    const err = await callOpenAICompatible(cfg, 'p', 's', null, { temperature: 0 }).catch(e => e);
    expect(err.quotaExhausted).toBe(true);
    expect(err.message).toMatch(/daily limit/);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('waits and retries a per-minute limit', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        reply(429, { error: { message: 'tokens per minute (TPM)' } }, { 'retry-after': '0' })
      )
      .mockResolvedValueOnce(reply(200, { choices: [{ message: { content: '{"ok":true}' } }] }));
    vi.stubGlobal('fetch', fetch);
    await expect(callOpenAICompatible(cfg, 'p', 's', null, { temperature: 0 })).resolves.toEqual({
      ok: true,
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
