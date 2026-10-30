import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''

let projectReference = 'default'
try {
  if (supabaseUrl) {
    projectReference = new URL(supabaseUrl).hostname.split('.')[0]
  }
} catch {
  // Safe fallback if URL format is invalid
}

export const supabaseAuthStorageKey = `sb-${projectReference}-auth-token`
export const adminReloadSessionStorageKey = `${supabaseAuthStorageKey}-admin-reload-session`

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: { storageKey: supabaseAuthStorageKey },
  }
)
