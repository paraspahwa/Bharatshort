import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getCreditUsageSummary, ensureUserExists } from '@/lib/credits'

// Prevent static generation
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ensure user record exists
    await ensureUserExists(session.user.id, session.user.email)

    // Get user data
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()

    // Get credit summary
    const creditSummary = await getCreditUsageSummary(session.user.id)

    // Get recent projects
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      user,
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
