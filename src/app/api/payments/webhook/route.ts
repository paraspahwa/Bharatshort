import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { verifyRazorpayWebhookSignature } from '@/lib/payments'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-razorpay-signature')
    if (!signature) {
      return NextResponse.json({ error: 'Missing webhook signature' }, { status: 400 })
    }

    const payload = await request.text()
    const valid = verifyRazorpayWebhookSignature(payload, signature)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
    }

    const event = JSON.parse(payload)
    const eventName = String(event?.event || '')

    if (eventName !== 'payment.captured' && eventName !== 'order.paid') {
      return NextResponse.json({ success: true, ignored: true })
    }

    const razorpayOrderId = String(
      event?.payload?.payment?.entity?.order_id ||
      event?.payload?.order?.entity?.id ||
      ''
    )
    const razorpayPaymentId = String(event?.payload?.payment?.entity?.id || '')

    if (!razorpayOrderId) {
      return NextResponse.json({ success: true, ignored: true })
    }

    const { data: captureResult, error: captureError } = await (getSupabaseAdmin() as any).rpc(
      'capture_payment_order',
      {
        p_razorpay_order_id: razorpayOrderId,
        p_razorpay_payment_id: razorpayPaymentId || null,
        p_razorpay_signature: null,
        p_source: 'webhook',
      }
    )

    if (captureError) {
      throw new Error(captureError.message)
    }

    const capture = Array.isArray(captureResult) ? captureResult[0] : captureResult

    if (!capture?.success) {
      return NextResponse.json({ success: true, ignored: true })
    }

    return NextResponse.json({
      success: true,
      alreadyProcessed: Boolean(capture.already_processed),
      creditsAdded: Number(capture.credits_added || 0),
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to process Razorpay webhook' },
      { status: 500 }
    )
  }
}
