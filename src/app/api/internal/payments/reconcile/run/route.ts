import { NextRequest, NextResponse } from 'next/server'
import { isInternalWorkerAuthorized } from '@/lib/internal-auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

async function sendReconcileAlert(payload: Record<string, any>): Promise<void> {
  const webhookUrl = process.env.PAYMENT_RECON_ALERT_WEBHOOK_URL
  if (!webhookUrl) {
    return
  }

  await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }).catch(() => {
    // Alert failure should not fail reconciliation.
  })
}

export async function GET(request: NextRequest) {
  try {
    if (!isInternalWorkerAuthorized(request, { allowVercelCron: true })) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cronEnabled = (process.env.PAYMENT_RECONCILE_CRON_ENABLED || 'true') === 'true'
    if (!cronEnabled) {
      return NextResponse.json({ success: true, skipped: true, reason: 'cron_disabled' })
    }

    const limit = Math.max(
      1,
      Math.min(1000, Number.parseInt(process.env.PAYMENT_RECONCILE_LIMIT || '200', 10) || 200)
    )

    const { data, error } = await (getSupabaseAdmin() as any).rpc('reconcile_paid_payment_orders', {
      p_limit: limit,
      p_repair: false,
      p_actor: 'cron_daily',
    })

    if (error) {
      throw new Error(error.message)
    }

    const rows = Array.isArray(data) ? data : []
    const mismatchCount = rows.length

    if (mismatchCount > 0) {
      await sendReconcileAlert({
        source: 'payment_reconcile_cron',
        mismatchCount,
        scanned: mismatchCount,
        sample: rows.slice(0, 10),
        generatedAt: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      success: true,
      repair: false,
      limit,
      scanned: mismatchCount,
      mismatches: rows,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to run scheduled payment reconciliation' },
      { status: 500 }
    )
  }
}
