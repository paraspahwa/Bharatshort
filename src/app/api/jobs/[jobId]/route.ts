import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getJobStatus } from '@/lib/queue'

// Prevent static generation
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: async () => cookieStore })
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // SQL is the source of truth for durable job status.
    const { data: sqlJob } = await (supabase as any)
      .from('generation_jobs')
      .select('id, project_id, user_id, status, progress, current_step, error_message, created_at')
      .eq('id', jobId)
      .maybeSingle()

    if (sqlJob) {
      if (sqlJob.user_id !== session.user.id) {
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
    if (job.userId !== session.user.id) {
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
