import { Redis } from '@upstash/redis'
import { getSupabaseAdmin } from './supabase'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export interface VideoJob {
  id: string
  projectId: string
  userId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  currentStep?: string
  error?: string
  createdAt: number
}

export interface ClaimedGenerationJob {
  id: string
  projectId: string
  userId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  currentStep?: string | null
  attemptCount: number
}

const DEFAULT_MAX_ATTEMPTS = 3

const QUEUE_KEY = 'video_generation_queue'
const JOB_PREFIX = 'video_job:'

/**
 * Add a video generation job to the queue
 */
export async function enqueueVideoJob(
  projectId: string,
  userId: string,
  existingJobId?: string
): Promise<string> {
  const jobId = existingJobId || `${Date.now()}_${projectId}`
  
  const job: VideoJob = {
    id: jobId,
    projectId,
    userId,
    status: 'queued',
    progress: 0,
    createdAt: Date.now(),
  }

  // Store job data
  await redis.set(`${JOB_PREFIX}${jobId}`, JSON.stringify(job), {
    ex: 3600, // Expire after 1 hour
  })

  // Add to queue
  await redis.lpush(QUEUE_KEY, jobId)

  return jobId
}

/**
 * Get the next job from the queue
 */
export async function dequeueVideoJob(): Promise<VideoJob | null> {
  const jobId = await redis.rpop(QUEUE_KEY)
  
  if (!jobId) {
    return null
  }

  const jobData = await redis.get(`${JOB_PREFIX}${jobId}`)
  
  if (!jobData) {
    return null
  }

  const job = typeof jobData === 'string' ? JSON.parse(jobData) : jobData
  return job as VideoJob
}

/**
 * Update job status and progress
 */
export async function updateJobStatus(
  jobId: string,
  updates: Partial<VideoJob>
): Promise<void> {
  const currentData = await redis.get(`${JOB_PREFIX}${jobId}`)
  
  if (!currentData) {
    throw new Error('Job not found')
  }

  const job = typeof currentData === 'string' ? JSON.parse(currentData) : currentData
  const updatedJob = { ...job, ...updates }

  await redis.set(`${JOB_PREFIX}${jobId}`, JSON.stringify(updatedJob), {
    ex: 3600,
  })
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string): Promise<VideoJob | null> {
  const jobData = await redis.get(`${JOB_PREFIX}${jobId}`)
  
  if (!jobData) {
    return null
  }

  const job = typeof jobData === 'string' ? JSON.parse(jobData) : jobData
  return job as VideoJob
}

/**
 * Get all jobs for a user
 */
export async function getUserJobs(userId: string): Promise<VideoJob[]> {
  const keys = await redis.keys(`${JOB_PREFIX}*`)
  
  if (!keys || keys.length === 0) {
    return []
  }

  const jobs = await Promise.all(
    keys.map(async (key) => {
      const data = await redis.get(key)
      return typeof data === 'string' ? (JSON.parse(data) as VideoJob) : (data as VideoJob)
    })
  )

  return jobs.filter(job => job && job.userId === userId)
}

/**
 * Delete a job
 */
export async function deleteJob(jobId: string): Promise<void> {
  await redis.del(`${JOB_PREFIX}${jobId}`)
}

/**
 * Get queue length
 */
export async function getQueueLength(): Promise<number> {
  return await redis.llen(QUEUE_KEY)
}

/**
 * Clear the entire queue (admin function)
 */
export async function clearQueue(): Promise<void> {
  await redis.del(QUEUE_KEY)
}

/**
 * Claim one generation job with a lease for worker processing.
 */
export async function claimNextGenerationJob(
  leaseSeconds: number = 120
): Promise<ClaimedGenerationJob | null> {
  const { data, error } = await (getSupabaseAdmin() as any).rpc('claim_generation_job', {
    p_lease_seconds: leaseSeconds,
  })

  if (error) {
    throw new Error(`Failed to claim generation job: ${error.message}`)
  }

  const row = Array.isArray(data) ? data[0] : null
  if (!row) {
    return null
  }

  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    status: row.status,
    progress: row.progress || 0,
    currentStep: row.current_step,
    attemptCount: row.attempt_count || 0,
  }
}

/**
 * Extend lease and optionally update progress/state while a worker is processing.
 */
export async function heartbeatGenerationJob(
  jobId: string,
  leaseSeconds: number = 120,
  progress?: number,
  currentStep?: string
): Promise<void> {
  const { error } = await (getSupabaseAdmin() as any).rpc('heartbeat_generation_job', {
    p_job_id: jobId,
    p_lease_seconds: leaseSeconds,
    p_progress: typeof progress === 'number' ? Math.round(progress) : null,
    p_current_step: currentStep || null,
  })

  if (error) {
    throw new Error(`Failed to heartbeat generation job: ${error.message}`)
  }
}

/**
 * Mark SQL job as completed.
 */
export async function completeGenerationJob(jobId: string): Promise<void> {
  const { error } = await (getSupabaseAdmin() as any)
    .from('generation_jobs')
    .update({
      status: 'completed',
      progress: 100,
      current_step: 'completed',
      completed_at: new Date().toISOString(),
      lease_expires_at: null,
      last_heartbeat_at: new Date().toISOString(),
      error_message: null,
      error_code: null,
      error_stage: null,
      error_context: null,
      retry_at: null,
    })
    .eq('id', jobId)

  if (error) {
    throw new Error(`Failed to complete generation job: ${error.message}`)
  }
}

/**
 * Mark SQL job as failed with structured context.
 */
export async function failGenerationJob(
  jobId: string,
  errorMessage: string,
  errorCode?: string,
  errorStage?: string,
  errorContext?: Record<string, any>
): Promise<void> {
  const { error } = await (getSupabaseAdmin() as any)
    .from('generation_jobs')
    .update({
      status: 'failed',
      current_step: errorStage || 'failed',
      error_message: errorMessage,
      error_code: errorCode || null,
      error_stage: errorStage || null,
      error_context: errorContext || null,
      completed_at: new Date().toISOString(),
      lease_expires_at: null,
      last_heartbeat_at: new Date().toISOString(),
      retry_at: null,
    })
    .eq('id', jobId)

  if (error) {
    throw new Error(`Failed to fail generation job: ${error.message}`)
  }
}

/**
 * Return current attempt and max attempt limits for a job.
 */
export async function getGenerationJobAttempts(jobId: string): Promise<{
  attemptCount: number
  maxAttempts: number
}> {
  const { data, error } = await (getSupabaseAdmin() as any)
    .from('generation_jobs')
    .select('attempt_count, max_attempts')
    .eq('id', jobId)
    .single()

  if (error || !data) {
    throw new Error(`Failed to read generation attempts for job ${jobId}`)
  }

  return {
    attemptCount: data.attempt_count || 0,
    maxAttempts: data.max_attempts || DEFAULT_MAX_ATTEMPTS,
  }
}

/**
 * Requeue a processing job with delay.
 */
export async function requeueGenerationJob(
  jobId: string,
  retryAfterSeconds: number,
  errorMessage: string,
  errorCode?: string,
  errorStage?: string,
  errorContext?: Record<string, any>
): Promise<void> {
  const retryAt = new Date(Date.now() + retryAfterSeconds * 1000).toISOString()

  const { error } = await (getSupabaseAdmin() as any)
    .from('generation_jobs')
    .update({
      status: 'queued',
      current_step: errorStage || 'retry_scheduled',
      error_message: errorMessage,
      error_code: errorCode || 'RETRY_SCHEDULED',
      error_stage: errorStage || null,
      error_context: {
        ...(errorContext || {}),
        retryAfterSeconds,
      },
      retry_at: retryAt,
      lease_expires_at: null,
      last_heartbeat_at: new Date().toISOString(),
      completed_at: null,
    })
    .eq('id', jobId)

  if (error) {
    throw new Error(`Failed to requeue generation job: ${error.message}`)
  }
}
