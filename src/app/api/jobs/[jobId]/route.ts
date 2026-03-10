import { NextRequest, NextResponse } from 'next/server'
import { getJobStatus } from '@/lib/queue'
import { resolveRequestAuth } from '@/lib/request-auth'

// Prevent static generation
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
      const auth = await resolveRequestAuth(request)
      if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

      const { supabase, user } = auth

    // SQL is the source of truth for durable job status.
    const { data: sqlJob } = await (supabase as any)
      .from('generation_jobs')
      .select('id, project_id, user_id, status, progress, current_step, error_message, created_at')
      .eq('id', jobId)
      .maybeSingle()

    if (sqlJob) {
        if (sqlJob.user_id !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      return NextResponse.json({
        id: sqlJob.id,
        projectId: sqlJob.project_id,
        userId: sqlJob.user_id,
        status: sqlJob.status,
        progress: sqlJob.progress,
        currentStep: sqlJob.current_step || undefined,
        error: sqlJob.error_message || undefined,
        createdAt: Date.parse(sqlJob.created_at),
      })
    }

    // Temporary fallback for legacy Redis-only jobs.
    const job = await getJobStatus(jobId)

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Verify job belongs to user
      if (job.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json(job)
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get job status' },
      { status: 500 }
    )
  }
}
