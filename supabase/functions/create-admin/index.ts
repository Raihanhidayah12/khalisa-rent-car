import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function listAdminUsers(adminClient: ReturnType<typeof createClient>) {
  const users = []
  for (let page = 1; ; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    users.push(...data.users.filter((user) => user.app_metadata?.role === 'admin'))
    if (data.users.length < 1000) return users
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)

  const authorization = request.headers.get('Authorization')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!authorization?.startsWith('Bearer ') || !supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'Unauthorized.' }, 401)
  }

  const accessToken = authorization.slice('Bearer '.length)
  const callerClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: callerData, error: callerError } = await callerClient.auth.getUser(accessToken)
  if (callerError || callerData.user?.app_metadata?.role !== 'admin') {
    return jsonResponse({ error: 'Admin access required.' }, 403)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  let admins
  try {
    admins = await listAdminUsers(adminClient)
  } catch (error) {
    console.error('Admin account lookup failed:', error instanceof Error ? error.message : error)
    return jsonResponse({ error: 'Hak akses admin utama gagal diverifikasi.' }, 500)
  }
  const configuredPrimaryId = Deno.env.get('PRIMARY_ADMIN_USER_ID')?.trim()
  const configuredPrimaryEmail = Deno.env.get('PRIMARY_ADMIN_EMAIL')?.trim().toLowerCase()
  const oldestAdmin = [...admins].sort((first, second) => first.created_at.localeCompare(second.created_at))[0]
  const configuredPrimaryAdmin = configuredPrimaryId
    ? admins.find((admin) => admin.id === configuredPrimaryId)
    : configuredPrimaryEmail
      ? admins.find((admin) => admin.email?.toLowerCase() === configuredPrimaryEmail)
      : null
  const hasConfiguredPrimary = Boolean(configuredPrimaryId || configuredPrimaryEmail)
  const primaryAdminId = configuredPrimaryAdmin?.id ?? (hasConfiguredPrimary ? undefined : oldestAdmin?.id)
  if (hasConfiguredPrimary && !configuredPrimaryAdmin) {
    return jsonResponse({ error: 'PRIMARY_ADMIN_USER_ID atau PRIMARY_ADMIN_EMAIL tidak cocok dengan akun admin aktif.' }, 503)
  }
  if (callerData.user.id !== primaryAdminId) {
    return jsonResponse({ error: 'Hanya akun admin utama yang dapat membuat akun admin.' }, 403)
  }

  let body: { email?: unknown; password?: unknown }
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'Invalid request body.' }, 400)
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ error: 'Masukkan alamat email yang valid.' }, 400)
  }
  if (password.length < 12 || password.length > 128) {
    return jsonResponse({ error: 'Kata sandi harus terdiri dari 12–128 karakter.' }, 400)
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: 'admin' },
  })

  if (error) {
    if (error.code === 'email_exists' || error.message.toLowerCase().includes('already been registered')) {
      return jsonResponse({ error: 'Email tersebut sudah terdaftar.' }, 409)
    }
    console.error('Admin account creation failed:', error.message)
    return jsonResponse({ error: 'Akun admin gagal dibuat. Periksa konfigurasi Supabase Auth.' }, 500)
  }

  return jsonResponse({ id: data.user.id, email: data.user.email })
})