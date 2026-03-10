import { getSupabaseAdmin } from './supabase'

function getAdminEmailsFromEnv(): Set<string> {
  const raw = process.env.ADMIN_EMAILS || ''
  return new Set(
    raw
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  )
}

export async function isDashboardAdmin(userId: string, email?: string | null): Promise<boolean> {
  try {
    const { data, error } = await (getSupabaseAdmin() as any)
      .from('admin_users')
      .select('user_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()

    if (!error && data?.user_id) {
      return true
    }

    const code = String((error as any)?.code || '')
    const relationMissing = code === '42P01'
    if (error && !relationMissing) {
      throw error
    }

    const normalizedEmail = (email || '').toLowerCase()
    if (!normalizedEmail) {
      return false
    }

    const adminEmails = getAdminEmailsFromEnv()
    return adminEmails.size > 0 && adminEmails.has(normalizedEmail)
  } catch {
    const normalizedEmail = (email || '').toLowerCase()
    if (!normalizedEmail) {
      return false
    }

    const adminEmails = getAdminEmailsFromEnv()
    return adminEmails.size > 0 && adminEmails.has(normalizedEmail)
  }
}
