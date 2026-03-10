import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { generateVideo } from '@/lib/video-generator'
import { enqueueVideoJob } from '@/lib/queue'
import { ensureUserExists } from '@/lib/credits'
import { v4 as uuidv4 } from 'uuid'

// Prevent static generation
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: async () => cookieStore })
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ensure user record exists
    await ensureUserExists(session.user.id, session.user.email)

    const body = await request.json()
    const { topic, language = 'en', duration = 60 } = body
    const idempotencyKey = request.headers.get('Idempotency-Key') || body.idempotencyKey || null

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
    }

    // Return existing job for repeated idempotency keys.
    if (idempotencyKey) {
      const { data: existingJob } = await (supabase as any)
        .from('generation_jobs')
        .select('id, project_id, status')
        .eq('user_id', session.user.id)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle()

      if (existingJob) {
        return NextResponse.json({
          success: true,
          projectId: existingJob.project_id,
          jobId: existingJob.id,
          message: 'Video generation already started for this idempotency key',
          duplicate: true,
        })
      }
    }

    // Create project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: session.user.id,
        title: `Video: ${topic.substring(0, 50)}`,
        topic,
        language,
        status: 'generating',
      })
      .select()
      .single()

    if (projectError || !project) {
      throw new Error('Failed to create project')
    }

    // Persist job state in SQL as source of truth.
    const { data: job, error: jobError } = await (supabase as any)
      .from('generation_jobs')
      .insert({
        project_id: project.id,
        user_id: session.user.id,
        status: 'queued',
        progress: 0,
        current_step: 'queued',
        idempotency_key: idempotencyKey,
        max_attempts: Number.parseInt(process.env.WORKER_MAX_ATTEMPTS || '3', 10),
      })
      .select('id')
      .single()

    if (jobError || !job) {
      throw new Error('Failed to create generation job')
    }

    // Add to Redis queue (dispatch transport)
    const jobId = await enqueueVideoJob(project.id, session.user.id, job.id)

    // Backward-compatible execution mode.
    // "inline" keeps current behavior until an external worker is rolled out.
    const executionMode = process.env.GENERATION_EXECUTION_MODE || 'inline'
    if (executionMode === 'inline') {
      generateVideo({
        topic,
        language,
        duration,
        userId: session.user.id,
        projectId: project.id,
        jobId,
      }).catch(error => {
        console.error('Video generation error:', error)
      })
    }

    return NextResponse.json({
      success: true,
      projectId: project.id,
      jobId,
      message: 'Video generation started',
    })
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to start video generation' },
      { status: 500 }
    )
  }
}
