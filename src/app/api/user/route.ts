import { NextRequest, NextResponse } from 'next/server'
import { getCreditUsageSummary, ensureUserExists } from '@/lib/credits'
import { resolveRequestAuth } from '@/lib/request-auth'

// Prevent static generation
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveRequestAuth(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { supabase, user } = auth

    // Ensure user record exists
    await ensureUserExists(user.id, user.email)

    // Get user data
    const { data: dbUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    // Get credit summary
    const creditSummary = await getCreditUsageSummary(user.id)

    // Get recent projects
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      user: dbUser,
      creditSummary,
      recentProjects: projects || [],
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get user data' },
      { status: 500 }
    )
  }
}
