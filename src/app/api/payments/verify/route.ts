import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase'
import { verifyRazorpayPaymentSignature } from '@/lib/payments'

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

    const body = await request.json()
    const razorpayOrderId = String(body?.razorpay_order_id || '')
    const razorpayPaymentId = String(body?.razorpay_payment_id || '')
    const razorpaySignature = String(body?.razorpay_signature || '')

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json({ error: 'Missing payment verification fields' }, { status: 400 })
    }

    const validSignature = verifyRazorpayPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    )

    if (!validSignature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
    }

    const { data: orderRecord, error: orderLookupError } = await (getSupabaseAdmin() as any)
      .from('payment_orders')
      .select('id, user_id, status')
      .eq('razorpay_order_id', razorpayOrderId)
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (orderLookupError) {
      throw new Error(orderLookupError.message)
    }

    if (!orderRecord) {
      return NextResponse.json({ error: 'Payment order not found' }, { status: 404 })
    }

    const { data: captureResult, error: captureError } = await (getSupabaseAdmin() as any).rpc(
      'capture_payment_order',
      {
        p_razorpay_order_id: razorpayOrderId,
        p_razorpay_payment_id: razorpayPaymentId,
        p_razorpay_signature: razorpaySignature,
        p_source: 'verify',
      }
    )

    if (captureError) {
      throw new Error(captureError.message)
    }

    const capture = Array.isArray(captureResult) ? captureResult[0] : captureResult

    if (!capture?.success) {
      return NextResponse.json({ error: 'Payment capture failed' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      alreadyProcessed: Boolean(capture.already_processed),
      creditsAdded: Number(capture.credits_added || 0),
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to verify payment' },
      { status: 500 }
    )
  }
}
