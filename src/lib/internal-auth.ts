import type { NextRequest } from 'next/server'

export function isInternalWorkerAuthorized(
  request: NextRequest,
  options?: { allowVercelCron?: boolean }
): boolean {
  const workerSecret = process.env.WORKER_SECRET
  const incomingSecret = request.headers.get('x-worker-secret')
  const allowVercelCron = options?.allowVercelCron ?? false
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'

  if (workerSecret && incomingSecret === workerSecret) {
    return true
  }

  if (allowVercelCron && isVercelCron) {
    return true
  }

  return false
}
