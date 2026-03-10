import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isInternalWorkerAuthorized } from '@/lib/internal-auth'

export const dynamic = 'force-dynamic'

type CheckStatus = 'ok' | 'warn' | 'fail'

interface SubsystemCheck {
  name: string
  status: CheckStatus
  missing: string[]
  notes?: string[]
}

function hasValue(name: string): boolean {
  return Boolean(process.env[name] && process.env[name]?.trim().length)
}

function checkRequired(name: string, keys: string[]): SubsystemCheck {
  const missing = keys.filter((key) => !hasValue(key))
  return {
    name,
    status: missing.length > 0 ? 'fail' : 'ok',
    missing,
  }
}

function deriveOverallStatus(checks: SubsystemCheck[]): CheckStatus {
  if (checks.some((c) => c.status === 'fail')) return 'fail'
  if (checks.some((c) => c.status === 'warn')) return 'warn'
  return 'ok'
}

export async function GET(request: NextRequest) {
  try {
    if (!isInternalWorkerAuthorized(request, { allowVercelCron: true })) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const checks: SubsystemCheck[] = [
      checkRequired('supabase', [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
      ]),
      checkRequired('queue', [
        'UPSTASH_REDIS_REST_URL',
        'UPSTASH_REDIS_REST_TOKEN',
      ]),
      checkRequired('storage', [
        'R2_ACCOUNT_ID',
        'R2_ACCESS_KEY_ID',
        'R2_SECRET_ACCESS_KEY',
        'R2_BUCKET_NAME',
        'R2_PUBLIC_URL',
      ]),
      checkRequired('worker', [
        'WORKER_SECRET',
      ]),
      checkRequired('providers', [
        'OPENAI_API_KEY',
        'NEBIUS_API_KEY',
        'HAIPER_API_KEY',
        'BHASHINI_API_KEY',
        'BHASHINI_USER_ID',
        'GOOGLE_CLOUD_TTS_API_KEY',
      ]),
      checkRequired('payments', [
        'RAZORPAY_KEY_ID',
        'RAZORPAY_KEY_SECRET',
        'RAZORPAY_WEBHOOK_SECRET',
      ]),
    ]

    const executionMode = process.env.GENERATION_EXECUTION_MODE || 'inline'
    const workerTuningNotes: string[] = []

    if (executionMode !== 'queue') {
      workerTuningNotes.push('GENERATION_EXECUTION_MODE is not set to queue; worker-only execution is not active')
    }

    if (!hasValue('WORKER_MAX_JOBS_PER_TICK')) {
      workerTuningNotes.push('WORKER_MAX_JOBS_PER_TICK is not set; default 5 will be used')
    }

    if (!hasValue('WORKER_MAX_DURATION_MS')) {
      workerTuningNotes.push('WORKER_MAX_DURATION_MS is not set; default 45000 will be used')
    }

    if (!hasValue('WORKER_MAX_ATTEMPTS')) {
      workerTuningNotes.push('WORKER_MAX_ATTEMPTS is not set; DB default max attempts will be used')
    }

    if (!hasValue('REFUND_ON_TERMINAL_FAILURE')) {
      workerTuningNotes.push('REFUND_ON_TERMINAL_FAILURE is not set; default true behavior may still apply in app logic')
    }

    if (!hasValue('PAYMENT_RECONCILE_CRON_ENABLED')) {
      workerTuningNotes.push('PAYMENT_RECONCILE_CRON_ENABLED is not set; default true will be used')
    }

    if (!hasValue('PAYMENT_RECONCILE_LIMIT')) {
      workerTuningNotes.push('PAYMENT_RECONCILE_LIMIT is not set; default 200 will be used')
    }

    if (!hasValue('PAYMENT_RECON_ALERT_WEBHOOK_URL')) {
      workerTuningNotes.push('PAYMENT_RECON_ALERT_WEBHOOK_URL is not set; mismatch alerts will not be pushed')
    }

    checks.push({
      name: 'worker_tuning',
      status: workerTuningNotes.length > 0 ? 'warn' : 'ok',
      missing: [],
      notes: workerTuningNotes,
    })

    const overallStatus = deriveOverallStatus(checks)

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      overallStatus,
      executionMode,
      checks,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to evaluate worker health configuration' },
      { status: 500 }
    )
  }
}
