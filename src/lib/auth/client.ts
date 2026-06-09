import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js"

const REST_SUFFIX = /\/rest\/v1\/?$/

function normalizeSupabaseUrl(url: string) {
  return url.trim().replace(REST_SUFFIX, "")
}

let browserClient: SupabaseClient | null = null

function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }

  return createClient(normalizeSupabaseUrl(supabaseUrl), supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  })
}

function getSupabaseBrowserClient() {
  browserClient ??= createSupabaseBrowserClient()
  return browserClient
}

export const supabaseBrowserClient = new Proxy({} as SupabaseClient, {
  get(_target, property, receiver) {
    const client = getSupabaseBrowserClient()
    const value = Reflect.get(client, property, receiver)
    return typeof value === "function" ? value.bind(client) : value
  },
})

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabaseBrowserClient.auth.getSession()
  if (error) throw error
  return data.session
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getSession()
  return session?.access_token ?? null
}
