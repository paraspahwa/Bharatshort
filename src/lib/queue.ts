import { Redis } from '@upstash/redis'

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

const QUEUE_KEY = 'video_generation_queue'
const JOB_PREFIX = 'video_job:'

/**
 * Add a video generation job to the queue
 */
export async function enqueueVideoJob(
  projectId: string,
  userId: string
): Promise<string> {
  const jobId = `${Date.now()}_${projectId}`
  
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
