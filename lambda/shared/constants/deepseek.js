// DeepSeek defaults. Their API is OpenAI-compatible.
// `deepseek-chat` is V3; `deepseek-reasoner` is R1 (chain-of-thought, slower but stronger reasoning).
export const DEEPSEEK_MODEL = 'deepseek-chat';
export const DEEPSEEK_JUDGE_MODEL = 'deepseek-reasoner';

export const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1/chat/completions';

export const DEEPSEEK_CONFIG = {
  temperature: 0.7,
};

export const DEEPSEEK_JUDGE_CONFIG = {
  temperature: 0.1,
};
