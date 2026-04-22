import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL      || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[Bonsai] Supabase env vars not set.\n' +
    'Create .env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable auth + history sync.'
  )
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken:  true,
    persistSession:    true,
    detectSessionInUrl: true,
  },
})

/** Quick health-check — resolves true if the client is configured */
export const isSupabaseReady = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY)
