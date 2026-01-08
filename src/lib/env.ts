type AppEnv = {
  supabaseUrl: string
  supabaseAnonKey: string
}

function getEnv(): AppEnv {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables."
    )
  }

  return { supabaseUrl, supabaseAnonKey }
}

export const env = getEnv()
