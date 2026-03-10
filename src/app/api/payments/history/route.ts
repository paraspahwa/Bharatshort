import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: async () => cookieStore })

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limitParam = Number.parseInt(request.nextUrl.searchParams.get('limit') || '20', 10)
    const limit = Math.max(1, Math.min(100, Number.isNaN(limitParam) ? 20 : limitParam))

    const { data, error } = await (supabase as any)
      .from('payment_orders')
      .select('id, plan_id, credits, currency, amount_subunits, status, razorpay_order_id, razorpay_payment_id, created_at, updated_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({
      payments: data || [],
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch payment history' },
      { status: 500 }
    )
  }
}
