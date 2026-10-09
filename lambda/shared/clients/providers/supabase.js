import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client, constructed on first use rather than at import time.
 *
 * Building it at module scope meant `createClient` ran — and threw on an
 * undefined URL — merely because something in the import graph reached this
 * file. That made the handler unimportable outside a fully-configured
 * environment, which is exactly the situation preflight exists to report on
 * gracefully.
 *
 * Deferring also means the service-role key is read after the Lambda runtime
 * has populated the environment, and a missing one produces a message that
 * says which variable is absent.
 */
let client = null;

export function getSupabase() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase is not configured: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set.'
    );
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** Test seam — drops the memoised client so a new env can take effect. */
export function _resetSupabaseClient() {
  client = null;
}
