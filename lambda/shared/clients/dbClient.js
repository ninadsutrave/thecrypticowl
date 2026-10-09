import { getSupabase } from './providers/supabase.js';

const PROVIDERS = {
  supabase: getSupabase,
};

/**
 * Database client factory. The client is created on first call, not at
 * import time, so importing the handler never requires a configured
 * environment.
 */
export function getDBClient(provider) {
  const factory = PROVIDERS[String(provider ?? '').toLowerCase()];
  if (!factory) throw new Error(`Unsupported DB provider: ${provider}`);
  return factory();
}
