import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { isInternalWorkerAuthorized } from '@/lib/internal-auth'

export const dynamic = 'force-dynamic'

async function getCount(
  queryBuilder: any
): Promise<number> {
  const { count, error } = await queryBuilder
  if (error) {
    throw new Error(error.message)
  }
  return count || 0
}

export async function GET(request: NextRequest) {
  try {
    if (!isInternalWorkerAuthorized(request, { allowVercelCron: true })) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const nowIso = new Date().toISOString()
    const supabase = getSupabaseAdmin() as any

    const [
      queuedTotal,
      retryScheduled,
      queuedReady,
      processing,
      stuckProcessing,
      completed,
      failed,
      deadLetter,
      recentDeadLettersResult,
    ] = await Promise.all([
      getCount(
        supabase
          .from('generation_jobs')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'queued')
      ),
      getCount(
        supabase
          .from('generation_jobs')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'queued')
          .gt('retry_at', nowIso)
      ),
      getCount(
        supabase
          .from('generation_jobs')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'queued')
          .or(`retry_at.is.null,retry_at.lte.${nowIso}`)
      ),
      getCount(
        supabase
          .from('generation_jobs')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'processing')
      ),
      getCount(
        supabase
          .from('generation_jobs')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'processing')
          .lt('lease_expires_at', nowIso)
      ),
      getCount(
        supabase
          .from('generation_jobs')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'completed')
      ),
      getCount(
        supabase
          .from('generation_jobs')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'failed')
      ),
      getCount(
        supabase
          .from('generation_jobs')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'failed')
          .eq('error_code', 'WORKER_RETRY_EXHAUSTED')
      ),
      supabase
        .from('generation_jobs')
        .select('id, project_id, user_id, attempt_count, max_attempts, error_code, error_stage, error_message, completed_at, created_at')
        .eq('status', 'failed')
        .eq('error_code', 'WORKER_RETRY_EXHAUSTED')
        .order('completed_at', { ascending: false })
        .limit(10),
    ])

    if (recentDeadLettersResult.error) {
      throw new Error(recentDeadLettersResult.error.message)
    }

    return NextResponse.json({
      generatedAt: nowIso,
      jobs: {
        queuedTotal,
        queuedReady,
        retryScheduled,
        processing,
        stuckProcessing,
        completed,
        failed,
        deadLetter,
      },
      recentDeadLetters: recentDeadLettersResult.data || [],
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to collect worker metrics' },
      { status: 500 }
    )
  }
}
