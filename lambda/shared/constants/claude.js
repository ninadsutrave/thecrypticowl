// Anthropic Claude defaults.
export const CLAUDE_MODEL = 'claude-sonnet-4-5';
export const CLAUDE_JUDGE_MODEL = 'claude-haiku-4-5';

export const CLAUDE_BASE_URL = 'https://api.anthropic.com/v1/messages';
export const CLAUDE_API_VERSION = '2023-06-01';

// Claude requires max_tokens. 4096 is plenty for our JSON payloads.
export const CLAUDE_MAX_TOKENS = 4096;

export const CLAUDE_CONFIG = {
  temperature: 0.7,
};

export const CLAUDE_JUDGE_CONFIG = {
  temperature: 0.1,
};
