import { NextRequest, NextResponse } from 'next/server'
import { isInternalWorkerAuthorized } from '@/lib/internal-auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    if (!isInternalWorkerAuthorized(request, { allowVercelCron: true })) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cronEnabled = (process.env.COST_ROLLUP_CRON_ENABLED || 'true') === 'true'
    if (!cronEnabled) {
      return NextResponse.json({ success: true, skipped: true, reason: 'cron_disabled' })
    }

    const days = Math.max(
      1,
      Math.min(365, Number.parseInt(process.env.COST_ROLLUP_DAYS || '30', 10) || 30)
    )
    const inrToUsd = Number.parseFloat(process.env.COST_ROLLUP_INR_TO_USD || '83') || 83

    const { error: refreshError } = await (getSupabaseAdmin() as any).rpc(
      'refresh_generation_cost_daily_rollups',
      {
        p_days: days,
        p_inr_to_usd: inrToUsd,
      }
    )

    if (refreshError) {
      throw new Error(refreshError.message)
    }

    const { data: rows, error: readError } = await (getSupabaseAdmin() as any)
      .from('generation_cost_daily_rollups')
      .select('*')
      .order('day', { ascending: false })
      .limit(days)

    if (readError) {
      throw new Error(readError.message)
    }

    const latest = Array.isArray(rows) && rows.length > 0 ? rows[0] : null

    return NextResponse.json({
      success: true,
      days,
      inrToUsd,
      latest,
      rows: rows || [],
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to refresh generation cost rollups' },
      { status: 500 }
    )
  }
}
