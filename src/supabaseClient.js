import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const projectReference = new URL(supabaseUrl).hostname.split('.')[0]

export const supabaseAuthStorageKey = `sb-${projectReference}-auth-token`
export const adminReloadSessionStorageKey = `${supabaseAuthStorageKey}-admin-reload-session`
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	auth: { storageKey: supabaseAuthStorageKey },
})
