import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { processOneGenerationJob } from '@/lib/generation-worker'
import { isInternalWorkerAuthorized } from '@/lib/internal-auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    if (!isInternalWorkerAuthorized(request, { allowVercelCron: true })) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const maxJobsPerTick = Math.max(
      1,
      Number.parseInt(process.env.WORKER_MAX_JOBS_PER_TICK || '5', 10)
    )
    const maxDurationMs = Math.max(
      1000,
      Number.parseInt(process.env.WORKER_MAX_DURATION_MS || '45000', 10)
    )

    const startedAt = Date.now()
    const results: Array<{ jobId?: string; projectId?: string; success?: boolean; reason?: string }> = []

    for (let i = 0; i < maxJobsPerTick; i++) {
      if (Date.now() - startedAt > maxDurationMs) {
        break
      }

      const result = await processOneGenerationJob()
      if (!result.claimed) {
        break
      }

      results.push({
        jobId: result.jobId,
        projectId: result.projectId,
        success: result.success,
        reason: result.reason,
      })
    }

    return NextResponse.json({
      processed: results.length,
      maxJobsPerTick,
      maxDurationMs,
      results,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to run scheduler loop' },
      { status: 500 }
    )
  }
}
