import { createClient } from "@supabase/supabase-js"

import { env } from "@/lib/env"

const storage =
  typeof window === "undefined" ? undefined : window.localStorage

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage,
  },
})
