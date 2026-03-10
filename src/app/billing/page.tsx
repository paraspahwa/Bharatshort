'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSupabase } from '../providers'
import toast from 'react-hot-toast'
import { ArrowLeft, CreditCard, ReceiptText, RefreshCw } from 'lucide-react'

interface PaymentOrder {
  id: string
  plan_id: string
  credits: number
  currency: string
  amount_subunits: number
  status: 'created' | 'paid' | 'failed' | 'refunded'
  razorpay_order_id: string
  razorpay_payment_id: string | null
  created_at: string
  updated_at: string
}

const PAYMENT_STATUS_LABELS: Record<PaymentOrder['status'], string> = {
  created: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
}

export default function BillingPage() {
  const { user, refreshCredits } = useSupabase()
  const router = useRouter()
  const [payments, setPayments] = useState<PaymentOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryingOrderId, setRetryingOrderId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    loadPayments()
  }, [user])

  const loadPayments = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/payments/history?limit=50')
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error || 'Could not load payment history')
      }

      setPayments(payload.payments || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load billing history')
    } finally {
      setLoading(false)
    }
  }

  const totalPurchasedCredits = useMemo(
    () => payments.filter((p) => p.status === 'paid').reduce((sum, p) => sum + p.credits, 0),
    [payments]
  )

  const totalPaidAmount = useMemo(
    () =>
      payments
        .filter((p) => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount_subunits / 100, 0),
    [payments]
  )

  const formatAmount = (amountSubunits: number, currency: string): string => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amountSubunits / 100)
  }

  const loadRazorpayScript = async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false
    if (window.Razorpay) return true

    return new Promise((resolve) => {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  const retryPayment = async (payment: PaymentOrder) => {
    try {
      setRetryingOrderId(payment.id)

      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error('Razorpay checkout failed to load')
      }

      const orderResponse = await fetch('/api/payments/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId: payment.plan_id }),
      })

      const orderPayload = await orderResponse.json()
      if (!orderResponse.ok) {
        throw new Error(orderPayload?.error || 'Failed to create retry payment order')
      }

      const checkout = new window.Razorpay({
        key: orderPayload.keyId,
        amount: orderPayload.amountSubunits,
        currency: orderPayload.currency,
        name: 'BharatShort AI',
        description: `${orderPayload.plan?.title || payment.plan_id} - ${orderPayload.plan?.credits || payment.credits} credits`,
        order_id: orderPayload.orderId,
        prefill: {
          email: user?.email,
        },
        theme: {
          color: '#ff7a1a',
        },
        handler: async (paymentResult) => {
          const verifyResponse = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(paymentResult),
          })

          const verifyPayload = await verifyResponse.json()
          if (!verifyResponse.ok) {
            throw new Error(verifyPayload?.error || 'Payment verification failed')
          }

          await refreshCredits()
          await loadPayments()
          toast.success('Payment completed and credits added successfully.')
        },
      })

      checkout.open()
    } catch (err: any) {
      toast.error(err?.message || 'Could not start retry payment')
    } finally {
      setRetryingOrderId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-orange-400" />
          <p className="mt-3 text-slate-300">Loading billing...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 bg-[#05070f]/70 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-slate-300 transition hover:text-white">
            <ArrowLeft className="h-5 w-5" />
            Back to Dashboard
          </Link>

          <button
            type="button"
            onClick={loadPayments}
            className="rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white transition hover:border-orange-300 hover:text-orange-200"
          >
            <span className="inline-flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </span>
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-[var(--font-display)] text-4xl font-bold text-white">Billing</h1>
          <p className="mt-2 text-slate-300">Razorpay transactions and credit purchases.</p>
        </div>

        <div className="mb-8 grid gap-6 md:grid-cols-3">
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-2 text-slate-300">
              <CreditCard className="h-5 w-5 text-orange-300" />
              Purchased Credits
            </div>
            <div className="mt-2 text-3xl font-bold text-white">{totalPurchasedCredits}</div>
          </div>

          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-2 text-slate-300">
              <ReceiptText className="h-5 w-5 text-teal-300" />
              Total Paid (mixed currency)
            </div>
            <div className="mt-2 text-3xl font-bold text-white">{totalPaidAmount.toFixed(2)}</div>
          </div>

          <div className="glass-card rounded-xl p-6">
            <div className="text-slate-300">Transactions</div>
            <div className="mt-2 text-3xl font-bold text-white">{payments.length}</div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <h2 className="mb-4 font-[var(--font-display)] text-2xl font-bold text-white">Payment History</h2>

          {error && <p className="mb-4 text-sm text-red-300">{error}</p>}

          {payments.length === 0 ? (
            <p className="text-slate-300">No payment records yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-slate-300">
                    <th className="py-3 pr-4">Date</th>
                    <th className="py-3 pr-4">Plan</th>
                    <th className="py-3 pr-4">Credits</th>
                    <th className="py-3 pr-4">Amount</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Order ID</th>
                    <th className="py-3 pr-4">Payment ID</th>
                    <th className="py-3 pr-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-white/5 text-slate-100">
                      <td className="py-3 pr-4">{new Date(payment.created_at).toLocaleString()}</td>
                      <td className="py-3 pr-4">{payment.plan_id}</td>
                      <td className="py-3 pr-4">{payment.credits}</td>
                      <td className="py-3 pr-4">{formatAmount(payment.amount_subunits, payment.currency)}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`rounded px-2 py-1 text-xs ${
                            payment.status === 'paid'
                              ? 'bg-green-500/20 text-green-300'
                              : payment.status === 'created'
                                ? 'bg-sky-500/20 text-sky-300'
                                : payment.status === 'failed'
                                  ? 'bg-red-500/20 text-red-300'
                                  : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {PAYMENT_STATUS_LABELS[payment.status]}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-slate-300">{payment.razorpay_order_id}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-slate-300">{payment.razorpay_payment_id || '-'}</td>
                      <td className="py-3 pr-4">
                        {payment.status === 'created' && (
                          <button
                            type="button"
                            onClick={() => retryPayment(payment)}
                            disabled={retryingOrderId === payment.id}
                            className="rounded-lg border border-sky-300/40 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-200 transition hover:border-sky-300 hover:bg-sky-500/20 disabled:opacity-60"
                          >
                            {retryingOrderId === payment.id ? 'Starting...' : 'Pay Now'}
                          </button>
                        )}

                        {payment.status === 'failed' && (
                          <button
                            type="button"
                            onClick={() => retryPayment(payment)}
                            disabled={retryingOrderId === payment.id}
                            className="rounded-lg border border-amber-300/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200 transition hover:border-amber-300 hover:bg-amber-500/20 disabled:opacity-60"
                          >
                            {retryingOrderId === payment.id ? 'Starting...' : 'Retry Payment'}
                          </button>
                        )}

                        {payment.status !== 'created' && payment.status !== 'failed' && (
                          <span className="text-xs text-slate-500">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
