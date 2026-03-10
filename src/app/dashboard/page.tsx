'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '../providers'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Video, Plus, CreditCard, Clock, TrendingUp, LogOut, Activity, AlertTriangle, RefreshCw } from 'lucide-react'

interface Project {
  id: string
  title: string
  status: string
  thumbnail_url: string | null
  created_at: string
  credits_used: number
}

interface DashboardData {
  user: any
  creditSummary: {
    currentBalance: number
    totalSpent: number
    totalAdded: number
    videoCount: number
  }
  recentProjects: Project[]
}

interface WorkerDashboardMetrics {
  generatedAt: string
  queuedReady: number
  retryScheduled: number
  processing: number
  stuckProcessing: number
  deadLetter: number
}

interface CreditPlanOffer {
  id: string
  title: string
  description: string
  credits: number
  amountSubunits: number
  currency: string
}

interface PaymentPlansResponse {
  currency: string
  plans: CreditPlanOffer[]
}

interface ReconcileMismatch {
  payment_order_id: string
  user_id: string
  credits: number
  issue: string
  repaired: boolean
}

interface ReconcileRun {
  id: string
  actor: string
  repair_mode: boolean
  scanned_count: number
  repaired_count: number
  created_at: string
}

interface ReconcileResponse {
  repair: boolean
  limit: number
  scanned: number
  repaired: number
  mismatches: ReconcileMismatch[]
}

export default function DashboardPage() {
  const { user, supabase, credits, refreshCredits } = useSupabase()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [workerMetrics, setWorkerMetrics] = useState<WorkerDashboardMetrics | null>(null)
  const [showWorkerPanel, setShowWorkerPanel] = useState(false)
  const [paymentPlans, setPaymentPlans] = useState<CreditPlanOffer[]>([])
  const [paymentCurrency, setPaymentCurrency] = useState('USD')
  const [showPlansModal, setShowPlansModal] = useState(false)
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [payingPlanId, setPayingPlanId] = useState<string | null>(null)
  const [showReconcilePanel, setShowReconcilePanel] = useState(false)
  const [reconcileRuns, setReconcileRuns] = useState<ReconcileRun[]>([])
  const [reconcileResult, setReconcileResult] = useState<ReconcileResponse | null>(null)
  const [reconcileLimit, setReconcileLimit] = useState(100)
  const [reconcileLoading, setReconcileLoading] = useState(false)
  const [reconcileAction, setReconcileAction] = useState<'dry-run' | 'repair' | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    loadDashboardData()
  }, [user])

  const loadDashboardData = async () => {
    try {
      const [userRes, metricsRes, reconcileRunsRes] = await Promise.all([
        fetch('/api/user'),
        fetch('/api/internal/jobs/dashboard-metrics'),
        fetch('/api/internal/payments/dashboard-reconcile'),
      ])

      if (userRes.ok) {
        const result = await userRes.json()
        setData(result)
      }

      if (metricsRes.ok) {
        const metrics = await metricsRes.json()
        setWorkerMetrics(metrics)
        setShowWorkerPanel(true)
      } else {
        setShowWorkerPanel(false)
      }

      if (reconcileRunsRes.ok) {
        const reconcilePayload = await reconcileRunsRes.json()
        setReconcileRuns(Array.isArray(reconcilePayload?.runs) ? reconcilePayload.runs : [])
        setShowReconcilePanel(true)
      } else {
        setShowReconcilePanel(false)
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
      setShowWorkerPanel(false)
      setShowReconcilePanel(false)
    } finally {
      setLoading(false)
    }
  }

  const runReconciliation = async (repair: boolean) => {
    try {
      setReconcileAction(repair ? 'repair' : 'dry-run')
      setReconcileLoading(true)

      const response = await fetch('/api/internal/payments/dashboard-reconcile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repair,
          limit: reconcileLimit,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to run payment reconciliation')
      }

      setReconcileResult(payload)
      const mismatchCount = Array.isArray(payload?.mismatches) ? payload.mismatches.length : 0
      if (!repair) {
        toast.success(`Dry run completed. ${mismatchCount} mismatches found.`)
      } else {
        toast.success(`Repair completed. ${payload?.repaired || 0} mismatches repaired.`)
      }

      const runsResponse = await fetch('/api/internal/payments/dashboard-reconcile')
      if (runsResponse.ok) {
        const runsPayload = await runsResponse.json()
        setReconcileRuns(Array.isArray(runsPayload?.runs) ? runsPayload.runs : [])
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to run reconciliation')
    } finally {
      setReconcileLoading(false)
      setReconcileAction(null)
    }
  }

  const handleLogout = async () => {
    await supabase?.auth.signOut()
    router.push('/')
  }

  const formatAmount = (amountSubunits: number, currency: string): string => {
    const value = amountSubunits / 100
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value)
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

  const openCreditPlans = async () => {
    try {
      setLoadingPlans(true)
      const response = await fetch('/api/payments/plans')
      if (!response.ok) {
        throw new Error('Could not load payment plans')
      }

      const payload = (await response.json()) as PaymentPlansResponse
      setPaymentPlans(payload.plans || [])
      setPaymentCurrency(payload.currency || 'USD')
      setShowPlansModal(true)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load plans')
    } finally {
      setLoadingPlans(false)
    }
  }

  const startPlanPayment = async (plan: CreditPlanOffer) => {
    try {
      setPayingPlanId(plan.id)

      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error('Razorpay checkout failed to load')
      }

      const orderResponse = await fetch('/api/payments/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId: plan.id }),
      })

      const orderPayload = await orderResponse.json()
      if (!orderResponse.ok) {
        throw new Error(orderPayload?.error || 'Failed to create payment order')
      }

      const checkout = new window.Razorpay({
        key: orderPayload.keyId,
        amount: orderPayload.amountSubunits,
        currency: orderPayload.currency,
        name: 'BharatShort AI',
        description: `${plan.title} - ${plan.credits} credits`,
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
          await loadDashboardData()
          setShowPlansModal(false)
          toast.success(`Payment successful. ${plan.credits} credits added.`)
        },
        modal: {
          ondismiss: () => {
            setPayingPlanId(null)
          },
        },
      })

      checkout.open()
    } catch (error: any) {
      toast.error(error?.message || 'Payment failed to start')
    } finally {
      setPayingPlanId(null)
    }
  }

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-orange-400"></div>
          <p className="mt-4 text-slate-300">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#05070f]/70 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Video className="w-8 h-8 text-orange-400" />
              <span className="font-[var(--font-display)] text-2xl font-bold text-white">BharatShort AI</span>
            </Link>
            
            <div className="flex items-center gap-4">
              <div className="aurora-chip flex items-center gap-2 rounded-lg px-4 py-2">
                <CreditCard className="w-5 h-5 text-orange-300" />
                <span className="font-semibold text-white">{credits || 0} credits</span>
              </div>

              <button
                type="button"
                onClick={openCreditPlans}
                disabled={loadingPlans}
                className="rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white transition hover:border-orange-300 hover:text-orange-200 disabled:opacity-60"
              >
                {loadingPlans ? 'Loading Plans...' : 'Buy Credits'}
              </button>

              <Link
                href="/billing"
                className="rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white transition hover:border-teal-300 hover:text-teal-200"
              >
                Billing
              </Link>
              
              <button
                onClick={handleLogout}
                className="p-2 text-slate-300 transition hover:text-white"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <CreditCard className="w-5 h-5 text-orange-300" />
              <span className="text-sm text-slate-300">Credits Balance</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {data.creditSummary.currentBalance}
            </div>
          </div>

          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Video className="w-5 h-5 text-teal-300" />
              <span className="text-sm text-slate-300">Videos Created</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {data.creditSummary.videoCount}
            </div>
          </div>

          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-emerald-300" />
              <span className="text-sm text-slate-300">Credits Added</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {data.creditSummary.totalAdded}
            </div>
          </div>

          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-sky-300" />
              <span className="text-sm text-slate-300">Credits Used</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {data.creditSummary.totalSpent}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mb-8">
          <Link
            href="/create"
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-8 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-orange-400"
          >
            <Plus className="w-6 h-6" />
            Create New Video
          </Link>
        </div>

        {showWorkerPanel && workerMetrics && (
          <div className="glass-card mb-8 rounded-xl p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-[var(--font-display)] text-xl font-bold text-white">
                <Activity className="h-5 w-5 text-orange-300" />
                Worker Health
              </h2>
              <span className="text-xs text-slate-400">
                Updated {new Date(workerMetrics.generatedAt).toLocaleTimeString()}
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-slate-300">Queued Ready</div>
                <div className="mt-1 text-2xl font-bold text-white">{workerMetrics.queuedReady}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-slate-300">Retry Scheduled</div>
                <div className="mt-1 text-2xl font-bold text-white">{workerMetrics.retryScheduled}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-slate-300">Processing</div>
                <div className="mt-1 text-2xl font-bold text-white">{workerMetrics.processing}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-1 text-xs text-slate-300">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
                  Stuck Processing
                </div>
                <div className="mt-1 text-2xl font-bold text-amber-300">{workerMetrics.stuckProcessing}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-slate-300">Dead Letter</div>
                <div className="mt-1 text-2xl font-bold text-rose-300">{workerMetrics.deadLetter}</div>
              </div>
              <button
                onClick={loadDashboardData}
                className="rounded-lg border border-white/20 bg-white/5 p-4 text-left transition hover:border-orange-300/50 hover:bg-white/10"
                type="button"
              >
                <div className="flex items-center gap-1 text-xs text-slate-300">
                  <RefreshCw className="h-3.5 w-3.5 text-orange-300" />
                  Refresh
                </div>
                <div className="mt-1 text-lg font-semibold text-white">Now</div>
              </button>
            </div>
          </div>
        )}

        {showReconcilePanel && (
          <div className="glass-card mb-8 rounded-xl p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-[var(--font-display)] text-xl font-bold text-white">Payment Reconciliation</h2>
                <p className="mt-1 text-sm text-slate-300">Audit paid orders against granted credits and optionally repair drift.</p>
              </div>
              <button
                type="button"
                onClick={loadDashboardData}
                className="rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white transition hover:border-orange-300 hover:text-orange-200"
              >
                Refresh
              </button>
            </div>

            <div className="mb-4 grid gap-3 md:grid-cols-[140px_1fr_1fr]">
              <input
                type="number"
                min={1}
                max={1000}
                value={reconcileLimit}
                onChange={(event) => {
                  const next = Number.parseInt(event.target.value || '100', 10)
                  if (Number.isNaN(next)) {
                    setReconcileLimit(100)
                    return
                  }
                  setReconcileLimit(Math.max(1, Math.min(1000, next)))
                }}
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none ring-orange-300/60 placeholder:text-slate-400 focus:ring"
              />
              <button
                type="button"
                onClick={() => runReconciliation(false)}
                disabled={reconcileLoading}
                className="rounded-lg border border-sky-300/40 bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/25 disabled:opacity-60"
              >
                {reconcileAction === 'dry-run' ? 'Running Dry Run...' : 'Run Dry Reconciliation'}
              </button>
              <button
                type="button"
                onClick={() => runReconciliation(true)}
                disabled={reconcileLoading}
                className="rounded-lg border border-amber-300/40 bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/25 disabled:opacity-60"
              >
                {reconcileAction === 'repair' ? 'Running Repair...' : 'Run Repair Reconciliation'}
              </button>
            </div>

            {reconcileResult && (
              <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="grid gap-3 text-sm md:grid-cols-4">
                  <div>
                    <div className="text-slate-300">Mode</div>
                    <div className="font-semibold text-white">{reconcileResult.repair ? 'Repair' : 'Dry Run'}</div>
                  </div>
                  <div>
                    <div className="text-slate-300">Scanned</div>
                    <div className="font-semibold text-white">{reconcileResult.scanned}</div>
                  </div>
                  <div>
                    <div className="text-slate-300">Mismatches</div>
                    <div className="font-semibold text-amber-200">{reconcileResult.mismatches.length}</div>
                  </div>
                  <div>
                    <div className="text-slate-300">Repaired</div>
                    <div className="font-semibold text-emerald-200">{reconcileResult.repaired}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <h3 className="mb-3 text-sm font-semibold text-white">Recent Runs</h3>
                {reconcileRuns.length === 0 ? (
                  <p className="text-sm text-slate-300">No reconciliation runs recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {reconcileRuns.slice(0, 6).map((run) => (
                      <div key={run.id} className="rounded-md border border-white/10 bg-white/5 p-2 text-xs text-slate-200">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-white">{run.repair_mode ? 'Repair' : 'Dry'}</span>
                          <span>{new Date(run.created_at).toLocaleString()}</span>
                        </div>
                        <div className="mt-1 text-slate-300">
                          Actor: {run.actor} | Scanned: {run.scanned_count} | Repaired: {run.repaired_count}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <h3 className="mb-3 text-sm font-semibold text-white">Latest Mismatch Sample</h3>
                {!reconcileResult || reconcileResult.mismatches.length === 0 ? (
                  <p className="text-sm text-slate-300">No mismatches in latest run.</p>
                ) : (
                  <div className="space-y-2">
                    {reconcileResult.mismatches.slice(0, 5).map((item) => (
                      <div key={item.payment_order_id} className="rounded-md border border-white/10 bg-white/5 p-2 text-xs text-slate-200">
                        <div className="font-semibold text-white">{item.issue}</div>
                        <div className="mt-1 break-all text-slate-300">Order: {item.payment_order_id}</div>
                        <div className="mt-1 break-all text-slate-300">User: {item.user_id}</div>
                        <div className="mt-1 text-slate-300">Credits: {item.credits} | Repaired: {item.repaired ? 'Yes' : 'No'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Recent Projects */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="mb-6 font-[var(--font-display)] text-2xl font-bold text-white">Recent Projects</h2>
          
          {data.recentProjects.length === 0 ? (
            <div className="text-center py-12">
              <Video className="mx-auto mb-4 h-16 w-16 text-slate-500" />
              <p className="mb-4 text-slate-300">No videos created yet</p>
              <Link
                href="/create"
                className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-3 text-white transition hover:bg-orange-400"
              >
                <Plus className="w-5 h-5" />
                Create Your First Video
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.recentProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="group block"
                >
                  <div className="mb-3 aspect-video overflow-hidden rounded-lg bg-slate-900/70">
                    {project.thumbnail_url ? (
                      <img
                        src={project.thumbnail_url}
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="w-12 h-12 text-slate-500" />
                      </div>
                    )}
                  </div>
                  <h3 className="mb-1 font-semibold text-white transition group-hover:text-orange-300">
                    {project.title}
                  </h3>
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span className={`px-2 py-1 rounded text-xs ${
                      project.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                      project.status === 'generating' ? 'bg-sky-500/20 text-sky-300' :
                      project.status === 'failed' ? 'bg-red-500/20 text-red-300' :
                      'bg-slate-500/20 text-slate-300'
                    }`}>
                      {project.status}
                    </span>
                    <span>{project.credits_used} credits</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {showPlansModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="glass-card w-full max-w-3xl rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-[var(--font-display)] text-2xl font-bold text-white">Buy Credits</h3>
              <button
                type="button"
                onClick={() => setShowPlansModal(false)}
                className="rounded-lg border border-white/20 px-3 py-1 text-slate-300 transition hover:text-white"
              >
                Close
              </button>
            </div>

            <p className="mb-6 text-sm text-slate-300">
              Geo pricing currency: <span className="font-semibold text-white">{paymentCurrency}</span>
            </p>

            <div className="grid gap-4 md:grid-cols-3">
              {paymentPlans.map((plan) => (
                <div key={plan.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <h4 className="font-semibold text-white">{plan.title}</h4>
                  <p className="mt-1 text-sm text-slate-300">{plan.description}</p>
                  <div className="mt-4 text-2xl font-bold text-orange-300">{plan.credits} credits</div>
                  <div className="mt-1 text-sm text-slate-200">
                    {formatAmount(plan.amountSubunits, plan.currency)}
                  </div>

                  <button
                    type="button"
                    onClick={() => startPlanPayment(plan)}
                    disabled={payingPlanId === plan.id}
                    className="mt-4 w-full rounded-lg bg-orange-500 px-3 py-2 font-semibold text-white transition hover:bg-orange-400 disabled:opacity-60"
                  >
                    {payingPlanId === plan.id ? 'Starting...' : 'Pay with Razorpay'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
