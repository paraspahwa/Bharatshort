import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase'
import { isDashboardAdmin } from '@/lib/admin-access'

export const dynamic = 'force-dynamic'

async function authorizeAdmin(): Promise<{ ok: true; email: string } | { ok: false; response: NextResponse }> {
  if (!process.env.WORKER_SECRET) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not found' }, { status: 404 }),
    }
  }

  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: async () => cookieStore })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const email = (session.user.email || '').toLowerCase()
  const isAdmin = await isDashboardAdmin(session.user.id)

  if (!isAdmin) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return { ok: true, email }
}

export async function GET() {
  try {
    const auth = await authorizeAdmin()
    if (!auth.ok) {
      return auth.response
    }

    const limit = 10
    const { data, error } = await (getSupabaseAdmin() as any)
      .from('payment_order_reconciliation_runs')
      .select('id, actor, repair_mode, scanned_count, repaired_count, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ runs: data || [] })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load reconciliation runs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeAdmin()
    if (!auth.ok) {
      return auth.response
    }

    const body = await request.json().catch(() => ({}))
    const repair = Boolean(body?.repair)
    const limit = Math.max(1, Math.min(1000, Number.parseInt(String(body?.limit || '100'), 10) || 100))

    const { data, error } = await (getSupabaseAdmin() as any).rpc('reconcile_paid_payment_orders', {
      p_limit: limit,
      p_repair: repair,
      p_actor: `dashboard:${auth.email}`,
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
