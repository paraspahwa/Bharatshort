import crypto from 'crypto'
import Razorpay from 'razorpay'

export interface CreditPlan {
  id: string
  credits: number
  prices: {
    INR: number
    USD: number
  }
  title: string
  description: string
}

export const CREDIT_PLANS: CreditPlan[] = [
  {
    id: 'starter_100',
    credits: 100,
    prices: { INR: 19900, USD: 299 },
    title: 'Starter',
    description: '100 credits for getting started',
  },
  {
    id: 'creator_300',
    credits: 300,
    prices: { INR: 49900, USD: 699 },
    title: 'Creator',
    description: '300 credits for regular creators',
  },
  {
    id: 'pro_700',
    credits: 700,
    prices: { INR: 99900, USD: 1299 },
    title: 'Pro',
    description: '700 credits for heavy production',
  },
]

let razorpayClient: Razorpay | null = null

export function getRazorpayClient(): Razorpay {
  if (!razorpayClient) {
    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!keyId || !keySecret) {
      throw new Error('Missing Razorpay environment variables')
    }

    razorpayClient = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    })
  }

  return razorpayClient
}

export function getPublicRazorpayKeyId(): string {
  const keyId = process.env.RAZORPAY_KEY_ID
  if (!keyId) {
    throw new Error('RAZORPAY_KEY_ID is not configured')
  }
  return keyId
}

export function getCreditPlanById(planId: string): CreditPlan | null {
  return CREDIT_PLANS.find((plan) => plan.id === planId) || null
}

export function getPlanAmountSubunits(plan: CreditPlan, currency: string): number {
  const normalizedCurrency = currency.toUpperCase()
  if (normalizedCurrency === 'INR') {
    return plan.prices.INR
  }
  return plan.prices.USD
}

export function verifyRazorpayPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret) {
    throw new Error('RAZORPAY_KEY_SECRET is not configured')
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')

  return expected === signature
}

export function verifyRazorpayWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('RAZORPAY_WEBHOOK_SECRET is not configured')
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  return expected === signature
}
