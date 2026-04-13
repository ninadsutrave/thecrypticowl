import { supabase } from "./providers/supabase.js";

/**
 * Database Client Factory
 */
export function getDBClient(provider) {
  switch (provider.toLowerCase()) {
    case "supabase":
      return supabase;
    default:
      throw new Error(`Unsupported DB provider: ${provider}`);
  }
}
