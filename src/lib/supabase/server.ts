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

const supabaseUrl = requireEnv("SUPABASE_URL");
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
