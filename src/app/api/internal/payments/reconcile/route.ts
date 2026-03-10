import { NextRequest, NextResponse } from 'next/server'
import { isInternalWorkerAuthorized } from '@/lib/internal-auth'
import { getSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    if (!isInternalWorkerAuthorized(request, { allowVercelCron: true })) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const repair = Boolean(body?.repair)
    const limit = Math.max(1, Math.min(1000, Number.parseInt(String(body?.limit || '100'), 10) || 100))
    const actor = String(body?.actor || 'internal_api')

    const { data, error } = await (getSupabaseAdmin() as any).rpc('reconcile_paid_payment_orders', {
      p_limit: limit,
      p_repair: repair,
      p_actor: actor,
    })

    if (error) {
      throw new Error(error.message)
    }

    const rows = Array.isArray(data) ? data : []

    return NextResponse.json({
      repair,
      limit,
      scanned: rows.length,
      repaired: rows.filter((row: any) => Boolean(row.repaired)).length,
      mismatches: rows,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to reconcile payment orders' },
      { status: 500 }
    )
  }
}
