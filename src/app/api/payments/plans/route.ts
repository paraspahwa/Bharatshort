import { NextRequest, NextResponse } from 'next/server'
import { CREDIT_PLANS, getPlanAmountSubunits } from '@/lib/payments'
import { resolveGeoLocation } from '@/lib/geoip'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const geo = await resolveGeoLocation(request)
    const currency = geo.currency === 'INR' ? 'INR' : 'USD'

    const plans = CREDIT_PLANS.map((plan) => ({
      id: plan.id,
      title: plan.title,
      description: plan.description,
      credits: plan.credits,
      amountSubunits: getPlanAmountSubunits(plan, currency),
      currency,
    }))

    return NextResponse.json({
      geo,
      currency,
      plans,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch payment plans' },
      { status: 500 }
    )
  }
}
