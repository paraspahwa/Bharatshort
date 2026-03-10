import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { ensureUserExists } from '@/lib/credits'
import { getSupabaseAdmin } from '@/lib/supabase'
import {
  getCreditPlanById,
  getPlanAmountSubunits,
  getPublicRazorpayKeyId,
  getRazorpayClient,
} from '@/lib/payments'
import { resolveGeoLocation } from '@/lib/geoip'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient({ cookies: async () => cookieStore })

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureUserExists(session.user.id, session.user.email)

    const body = await request.json()
    const planId = String(body?.planId || '')

    const plan = getCreditPlanById(planId)
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan id' }, { status: 400 })
    }

    const geo = await resolveGeoLocation(request)
    const currency = geo.currency === 'INR' ? 'INR' : 'USD'
    const amountSubunits = getPlanAmountSubunits(plan, currency)

    const razorpay = getRazorpayClient()
    const receipt = `bs_${session.user.id.slice(0, 8)}_${Date.now()}`

    const order = await razorpay.orders.create({
      amount: amountSubunits,
      currency,
      receipt,
      notes: {
        userId: session.user.id,
        planId: plan.id,
        credits: String(plan.credits),
        geoCountryCode: geo.countryCode,
      },
    })

    const { error: insertError } = await (getSupabaseAdmin() as any)
      .from('payment_orders')
      .insert({
        user_id: session.user.id,
        plan_id: plan.id,
        credits: plan.credits,
        currency,
        amount_subunits: amountSubunits,
        status: 'created',
        razorpay_order_id: order.id,
        geo_country_code: geo.countryCode,
        metadata: {
          geoSource: geo.source,
          receipt,
        },
      })

    if (insertError) {
      throw new Error(insertError.message)
    }

    return NextResponse.json({
      keyId: getPublicRazorpayKeyId(),
      orderId: order.id,
      amountSubunits,
      currency,
      plan: {
        id: plan.id,
        title: plan.title,
        credits: plan.credits,
      },
      geo,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create payment order' },
      { status: 500 }
    )
  }
}
