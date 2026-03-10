import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { isDashboardAdmin } from '@/lib/admin-access'
import { resolveRequestAuth } from '@/lib/request-auth'

export const dynamic = 'force-dynamic'

async function authorizeAdmin(request: NextRequest): Promise<{ ok: true; email: string } | { ok: false; response: NextResponse }> {
  if (!process.env.WORKER_SECRET) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Not found' }, { status: 404 }),
    }
  }

  const auth = await resolveRequestAuth(request)
  if (!auth?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const email = (auth.user.email || '').toLowerCase()
  const isAdmin = await isDashboardAdmin(auth.user.id)

  if (!isAdmin) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return { ok: true, email }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeAdmin(request)
    if (!auth.ok) {
      return auth.response
    }

    const limitParam = Number.parseInt(request.nextUrl.searchParams.get('limit') || '30', 10)
    const limit = Math.max(1, Math.min(120, Number.isFinite(limitParam) ? limitParam : 30))

    const { data: rows, error: rowsError } = await (getSupabaseAdmin() as any)
      .from('generation_cost_daily_rollups')
      .select('*')
      .order('day', { ascending: false })
      .limit(limit)

    if (rowsError) {
      throw new Error(rowsError.message)
    }

    const safeRows = Array.isArray(rows) ? rows : []
    const totals = safeRows.reduce(
      (acc: any, row: any) => {
        acc.costUsd += Number(row.total_cost_usd || 0)
        acc.revenueUsd += Number(row.total_revenue_usd || 0)
        acc.creditsSold += Number(row.total_credits_sold || 0)
        acc.refundedCredits += Number(row.total_refunded_credits || 0)
        acc.totalJobs += Number(row.total_jobs || 0)
        acc.completedJobs += Number(row.completed_jobs || 0)
        acc.failedJobs += Number(row.failed_jobs || 0)
        acc.paidOrders += Number(row.paid_orders || 0)
        return acc
      },
      {
        costUsd: 0,
        revenueUsd: 0,
        creditsSold: 0,
        refundedCredits: 0,
        totalJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        paidOrders: 0,
      }
    )

    const grossMarginUsd = totals.revenueUsd - totals.costUsd
    const marginPercent = totals.revenueUsd > 0 ? (grossMarginUsd / totals.revenueUsd) * 100 : 0
    const costPerCreditUsd = totals.creditsSold > 0 ? totals.costUsd / totals.creditsSold : 0
    const revenuePerCreditUsd = totals.creditsSold > 0 ? totals.revenueUsd / totals.creditsSold : 0

    return NextResponse.json({
      days: limit,
      summary: {
        totalCostUsd: Number(totals.costUsd.toFixed(6)),
        totalRevenueUsd: Number(totals.revenueUsd.toFixed(6)),
        grossMarginUsd: Number(grossMarginUsd.toFixed(6)),
        marginPercent: Number(marginPercent.toFixed(4)),
        totalCreditsSold: totals.creditsSold,
        totalRefundedCredits: totals.refundedCredits,
        costPerCreditUsd: Number(costPerCreditUsd.toFixed(6)),
        revenuePerCreditUsd: Number(revenuePerCreditUsd.toFixed(6)),
        totalJobs: totals.totalJobs,
        completedJobs: totals.completedJobs,
        failedJobs: totals.failedJobs,
        paidOrders: totals.paidOrders,
      },
      rows: safeRows,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load cost dashboard summary' },
      { status: 500 }
    )
  }
}
