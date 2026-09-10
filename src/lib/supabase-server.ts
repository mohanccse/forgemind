import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client.
 * Uses SUPABASE_SERVICE_ROLE_KEY to bypass Row-Level Security for server-side API handlers.
 * 
 * GUARDRAIL ENFORCED:
 * - Must NEVER be imported in client-side components (browser bundle).
 * - Reads process.env.SUPABASE_SERVICE_ROLE_KEY exclusively.
 */

let supabaseServerClient: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error(
      '[SECURITY CRITICAL]: getSupabaseServerClient() was invoked in a client browser environment. ' +
      'The Supabase Service Role Key must NEVER be exposed to the client.'
    );
  }

  if (supabaseServerClient) {
    return supabaseServerClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      'Missing Supabase server environment variables. Please ensure SUPABASE_URL ' +
      'and SUPABASE_SERVICE_ROLE_KEY are defined in your environment (.env.local).'
    );
  }

  supabaseServerClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return supabaseServerClient;
}
