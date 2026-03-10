import { getSupabaseAdmin } from './supabase'

export async function isDashboardAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await (getSupabaseAdmin() as any)
      .from('admin_users')
      .select('user_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      throw error
    }

    return Boolean(data?.user_id)
  } catch {
    return false
  }
}
