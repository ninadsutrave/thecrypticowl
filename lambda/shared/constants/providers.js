/**
 * Single registry for every AI provider the pipeline can use.
 *
 * Previously this information was spread across three files that drifted apart:
 * `index.js` held the env-var requirements, `aiClient.js` held the client
 * factory, and `clue.js` held the author IDs. A provider added to two of the
 * three silently attributed its clues to Gemini and passed a preflight it
 * should have failed. Everything now derives from this one table.
 *
 * `authorId` values must match the rows seeded in the `authors` table — see
 * supabase/migrations/002_provider_authors.sql.
 */

export const PROVIDERS = {
  gemini: {
    id: 'gemini',
    label: 'Gemini',
    envKeys: ['GEMINI_API_KEY'],
    authorId: '7211516e-e61b-410a-b31c-6a1651515151',
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    envKeys: ['OPENAI_API_KEY'],
    authorId: '0921516e-e61b-410a-b31c-6a1651515151',
  },
  claude: {
    id: 'claude',
    label: 'Claude',
    envKeys: ['ANTHROPIC_API_KEY'],
    authorId: '1211516e-e61b-410a-b31c-6a1651515151',
  },
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek',
    envKeys: ['DEEPSEEK_API_KEY'],
    authorId: '3f2a1c4e-8b7d-4e9a-9c1f-2d5e6a7b8c90',
  },
  grok: {
    id: 'grok',
    label: 'Grok',
    envKeys: ['XAI_API_KEY'],
    authorId: '5c8b2d1a-6e4f-4a3b-8d7c-1f9e0a2b3c4d',
  },
  mistral: {
    id: 'mistral',
    label: 'Mistral',
    envKeys: ['MISTRAL_API_KEY'],
    authorId: '9d4e7f2b-3a1c-4b8e-9f6d-7c2a5b8e1d3f',
  },
};

/** Accepted spellings that map onto a canonical provider id. */
const ALIASES = {
  anthropic: 'claude',
  xai: 'grok',
  'gpt-4o': 'openai',
  google: 'gemini',
};

/**
 * Normalise a user-supplied provider string to a canonical id.
 * @returns {string|null} canonical id, or null if unrecognised
 */
export function resolveProviderId(provider) {
  const key = String(provider ?? '')
    .trim()
    .toLowerCase();
  if (PROVIDERS[key]) return key;
  if (ALIASES[key]) return ALIASES[key];
  return null;
}

/** Env vars a provider needs, or [] for an unknown provider. */
export function envKeysFor(provider) {
  const id = resolveProviderId(provider);
  return id ? PROVIDERS[id].envKeys : [];
}

/**
 * Author row id for a provider. Falls back to Gemini only for a genuinely
 * unknown provider — every registered provider has its own author, so clues
 * are never misattributed.
 */
export function authorIdFor(provider) {
  const id = resolveProviderId(provider);
  return id ? PROVIDERS[id].authorId : PROVIDERS.gemini.authorId;
}

/** Database provider env requirements. */
export const DB_PROVIDERS = {
  supabase: { envKeys: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] },
};

export function dbEnvKeysFor(provider) {
  return DB_PROVIDERS[String(provider ?? '').toLowerCase()]?.envKeys ?? [];
}
