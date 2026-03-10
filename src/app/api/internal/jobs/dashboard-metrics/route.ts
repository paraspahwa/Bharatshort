import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase'
import { isDashboardAdmin } from '@/lib/admin-access'

export const dynamic = 'force-dynamic'

async function getCount(queryBuilder: any): Promise<number> {
  const { count, error } = await queryBuilder
  if (error) {
    throw new Error(error.message)
  }
  return count || 0
}

export async function GET(request: NextRequest) {
  try {
    if (!process.env.WORKER_SECRET) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: async () => cookieStore })

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await isDashboardAdmin(session.user.id, session.user.email)

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const nowIso = new Date().toISOString()
    const adminClient = getSupabaseAdmin() as any

    const [queuedReady, retryScheduled, processing, stuckProcessing, deadLetter] = await Promise.all([
      getCount(
        adminClient
          .from('generation_jobs')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'queued')
          .or(`retry_at.is.null,retry_at.lte.${nowIso}`)
      ),
      getCount(
        adminClient
          .from('generation_jobs')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'queued')
          .gt('retry_at', nowIso)
      ),
      getCount(
        adminClient
          .from('generation_jobs')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'processing')
      ),
      getCount(
        adminClient
          .from('generation_jobs')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'processing')
          .lt('lease_expires_at', nowIso)
      ),
      getCount(
        adminClient
          .from('generation_jobs')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'failed')
          .eq('error_code', 'WORKER_RETRY_EXHAUSTED')
      ),
    ])

    return NextResponse.json({
      generatedAt: nowIso,
      queuedReady,
      retryScheduled,
      processing,
      stuckProcessing,
      deadLetter,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load dashboard worker metrics' },
      { status: 500 }
    )
  }
}
