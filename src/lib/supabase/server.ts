// OSSUM COR — Supabase server-side client.
// Uses service_role key for admin access. NEVER expose to client.
// This module must only be imported from server-side code (API routes, services).

import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// SUPABASE_URL may include /rest/v1/ path; strip it for the JS client
// which auto-appends auth/v1, rest/v1, etc. based on the operation.
const supabaseUrl = requireEnv("SUPABASE_URL").replace(/\/rest\/v1\/?$/, "");
const supabaseServiceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

/**
 * Server-side Supabase client with admin privileges.
 * Use for auth verification and admin operations only.
 * Do NOT pass this client to the browser.
 */
export const supabaseServerClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
