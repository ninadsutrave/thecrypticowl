// OpenAI defaults — override per-request via the `model` arg if needed.
export const OPENAI_MODEL = 'gpt-4o';
export const OPENAI_JUDGE_MODEL = 'gpt-4o-mini';

export const OPENAI_BASE_URL = 'https://api.openai.com/v1/chat/completions';

export const OPENAI_CONFIG = {
  temperature: 0.7,
};

export const OPENAI_JUDGE_CONFIG = {
  temperature: 0.1,
};
