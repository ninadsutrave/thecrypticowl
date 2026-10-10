// Groq defaults. Their API is OpenAI-compatible. GPT-OSS 120B was the only
// model in the "Benchmark · cryptic models" workflow (Oct 2026) whose cryptic
// clues all passed the code checks; the free tier allows about 1,000
// requests a day but few tokens a minute, so calls are spaced by retries.
export const GROQ_MODEL = 'openai/gpt-oss-120b';
export const GROQ_JUDGE_MODEL = 'openai/gpt-oss-120b';

export const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';

export const GROQ_CONFIG = {
  temperature: 0.7,
};

export const GROQ_JUDGE_CONFIG = {
  temperature: 0.1,
};
