import { getSupabaseAdmin } from './supabase'
import {
  claimNextGenerationJob,
  completeGenerationJob,
  failGenerationJob,
  getGenerationJobAttempts,
  heartbeatGenerationJob,
  requeueGenerationJob,
} from './queue'
import { generateVideo } from './video-generator'
import { refundGenerationJobCharges } from './credits'

interface ProcessResult {
  claimed: boolean
  jobId?: string
  projectId?: string
  success?: boolean
  reason?: string
}

function isRetryableError(error: any): boolean {
  const message = String(error?.message || '').toLowerCase()
  return (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('429') ||
    message.includes('rate limit') ||
    message.includes('network') ||
    message.includes('tempor') ||
    message.includes('econnreset') ||
    message.includes('service unavailable')
  )
}

function getRetryDelaySeconds(attemptCount: number): number {
  const baseSeconds = 15
  const cappedAttempt = Math.min(Math.max(attemptCount, 1), 6)
  return baseSeconds * Math.pow(2, cappedAttempt - 1)
}

/**
 * Claims and processes one queued generation job.
 */
export async function processOneGenerationJob(): Promise<ProcessResult> {
  const claimed = await claimNextGenerationJob(180)
  if (!claimed) {
    return {
      claimed: false,
      reason: 'no_jobs_available',
    }
  }

  const jobId = claimed.id
  try {
    await heartbeatGenerationJob(jobId, 180, claimed.progress, claimed.currentStep || 'claimed')

    const { data: project, error: projectError } = await (getSupabaseAdmin() as any)
      .from('projects')
      .select('id, topic, language, duration')
      .eq('id', claimed.projectId)
      .single()

    if (projectError || !project) {
      throw new Error('Project not found for claimed job')
    }

    const generationResult = await generateVideo({
      topic: project.topic,
      language: project.language || 'en',
      duration: project.duration || 60,
      userId: claimed.userId,
      projectId: claimed.projectId,
      jobId,
    })

    if (!generationResult.success) {
      throw new Error(generationResult.error || 'Generation failed')
    }

    await completeGenerationJob(jobId)

    return {
      claimed: true,
      jobId,
      projectId: claimed.projectId,
      success: true,
    }
  } catch (error: any) {
    const retryable = isRetryableError(error)
    const attempts = await getGenerationJobAttempts(jobId)
    const delaySeconds = getRetryDelaySeconds(attempts.attemptCount)

    if (retryable && attempts.attemptCount < attempts.maxAttempts) {
      await requeueGenerationJob(
        jobId,
        delaySeconds,
        error?.message || 'Retry scheduled after transient worker failure',
        'WORKER_RETRY_SCHEDULED',
        'worker_retry',
        {
          projectId: claimed.projectId,
          attemptCount: attempts.attemptCount,
          maxAttempts: attempts.maxAttempts,
          retryable,
        }
      )

      return {
        claimed: true,
        jobId,
        projectId: claimed.projectId,
        success: false,
        reason: `retry_scheduled_${delaySeconds}s`,
      }
    }

    await failGenerationJob(
      jobId,
      error?.message || 'Worker processing failed',
      retryable ? 'WORKER_RETRY_EXHAUSTED' : 'WORKER_EXECUTION_FAILED',
      retryable ? 'dead_letter' : 'worker',
      {
        projectId: claimed.projectId,
        attemptCount: attempts.attemptCount,
        maxAttempts: attempts.maxAttempts,
        retryable,
      }
    )

    const refundOnFailure = (process.env.REFUND_ON_TERMINAL_FAILURE || 'true') === 'true'
    if (refundOnFailure) {
      await refundGenerationJobCharges(
        jobId,
        `Auto refund after terminal failure (${retryable ? 'retry exhausted' : 'non-retryable'})`
      ).catch((refundError) => {
        console.error('Failed to auto-refund job charges:', refundError)
      })
    }

    await (getSupabaseAdmin() as any)
      .from('projects')
      .update({ status: 'failed' })
      .eq('id', claimed.projectId)

    return {
      claimed: true,
      jobId,
      projectId: claimed.projectId,
      success: false,
      reason: error?.message || 'worker_failed',
    }
  }
}
