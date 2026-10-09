import { describe, it, expect } from 'vitest';
import { resolveRunConfig } from './index.js';

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
