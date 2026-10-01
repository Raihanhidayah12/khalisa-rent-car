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

  const callerClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: callerData, error: callerError } = await callerClient.auth.getUser(authorization.slice('Bearer '.length))
  if (callerError || callerData.user?.app_metadata?.role !== 'admin') {
    return jsonResponse({ error: 'Admin access required.' }, 403)
  }

  let body: { action?: unknown; userId?: unknown }
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'Invalid request body.' }, 400)
  }
  if (body.action !== 'permissions' && body.action !== 'list' && body.action !== 'delete') {
    return jsonResponse({ error: 'Action not supported.' }, 400)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  let admins
  try {
    admins = await listAdminUsers(adminClient)
  } catch (error) {
    console.error('Admin account listing failed:', error instanceof Error ? error.message : error)
    return jsonResponse({ error: 'Daftar akun admin gagal dimuat.' }, 500)
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

  if (body.action === 'permissions') {
    return jsonResponse({ can_manage_admins: callerData.user.id === primaryAdminId })
  }
  if (callerData.user.id !== primaryAdminId) {
    return jsonResponse({ error: 'Hanya akun admin utama yang dapat mengelola akun admin.' }, 403)
  }

  if (body.action === 'list') {
    return jsonResponse({
      admins: admins
        .sort((first, second) => first.created_at.localeCompare(second.created_at))
        .map((admin) => ({
          id: admin.id,
          email: admin.email,
          created_at: admin.created_at,
          is_primary: admin.id === primaryAdminId,
          is_current_user: admin.id === callerData.user.id,
        })),
      primary_protection: hasConfiguredPrimary ? 'configured' : 'oldest_admin',
    })
  }

  const targetUserId = typeof body.userId === 'string' ? body.userId : ''
  const targetAdmin = admins.find((admin) => admin.id === targetUserId)
  if (!targetAdmin) return jsonResponse({ error: 'Akun admin tidak ditemukan.' }, 404)
  if (targetUserId === primaryAdminId) return jsonResponse({ error: 'Akun admin utama tidak dapat dihapus.' }, 403)
  if (targetUserId === callerData.user.id) return jsonResponse({ error: 'Akun yang sedang digunakan tidak dapat dihapus.' }, 403)

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId)
  if (deleteError) {
    console.error('Admin account deletion failed:', deleteError.message)
    return jsonResponse({ error: 'Akun admin gagal dihapus.' }, 500)
  }

  return jsonResponse({ id: targetAdmin.id, email: targetAdmin.email })
})