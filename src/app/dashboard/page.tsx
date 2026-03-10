'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '../providers'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Video, Plus, CreditCard, Clock, TrendingUp, LogOut, Activity, AlertTriangle, RefreshCw, Shield, UserPlus, UserX } from 'lucide-react'

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

interface DashboardAdminUser {
  user_id: string
  email: string | null
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

interface AdminAuditEvent {
  id: string
  action: 'grant' | 'revoke' | string
  actor_type: string
  actor_user_id: string | null
  actor_email: string | null
  target_user_id: string
  target_email: string | null
  notes: string | null
  source: string
  metadata: Record<string, any> | null
  created_at: string
}

interface AdminAuditResponse {
  logs: AdminAuditEvent[]
  limit: number
  page: number
  action: 'grant' | 'revoke' | null
  query: string | null
  hasMore: boolean
}

interface CostRollupRow {
  day: string
  total_cost_usd: number | string
  total_revenue_usd: number | string
  total_credits_sold: number
  margin_percent: number | string
}

interface CostSummarySnapshot {
  totalCostUsd: number
  totalRevenueUsd: number
  grossMarginUsd: number
  marginPercent: number
  totalCreditsSold: number
  totalRefundedCredits: number
  costPerCreditUsd: number
  revenuePerCreditUsd: number
  totalJobs: number
  completedJobs: number
  failedJobs: number
  paidOrders: number
}

interface CostDashboardSummaryResponse {
  days: number
  summary: CostSummarySnapshot
  rows: CostRollupRow[]
}

export default function DashboardPage() {
  const { user, supabase, credits, refreshCredits } = useSupabase()
  const router = useRouter()
  const [hasAdminAccess, setHasAdminAccess] = useState(false)
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
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [showCostPanel, setShowCostPanel] = useState(false)
  const [costSummary, setCostSummary] = useState<CostDashboardSummaryResponse | null>(null)
  const [adminUsers, setAdminUsers] = useState<DashboardAdminUser[]>([])
  const [adminAuditEvents, setAdminAuditEvents] = useState<AdminAuditEvent[]>([])
  const [adminAuditActionFilter, setAdminAuditActionFilter] = useState<'all' | 'grant' | 'revoke'>('all')
  const [adminAuditSearchInput, setAdminAuditSearchInput] = useState('')
  const [adminAuditSearchQuery, setAdminAuditSearchQuery] = useState('')
  const [adminAuditPage, setAdminAuditPage] = useState(1)
  const [adminAuditHasMore, setAdminAuditHasMore] = useState(false)
  const [adminAuditLoading, setAdminAuditLoading] = useState(false)
  const [adminEmailInput, setAdminEmailInput] = useState('')
  const [adminNotesInput, setAdminNotesInput] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminActionUserId, setAdminActionUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const formatUsd = (value: number): string => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 4,
    }).format(value)
  }

  const toNumeric = (value: number | string | undefined | null): number => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  const fetchJsonWithTimeout = async <T,>(
    url: string,
    timeoutMs: number = 3000
  ): Promise<{ ok: boolean; payload?: T }> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, { signal: controller.signal })
      if (!response.ok) {
        return { ok: false }
      }

      const payload = (await response.json()) as T
      return { ok: true, payload }
    } catch {
      return { ok: false }
    } finally {
      clearTimeout(timer)
    }
  }

  const buildFallbackDashboardData = async (): Promise<DashboardData> => {
    let recentProjects: Project[] = []

    if (supabase && user) {
      const { data: projects } = await supabase
        .from('projects')
        .select('id, title, status, thumbnail_url, created_at, credits_used')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      recentProjects = Array.isArray(projects)
        ? projects.map((project: any) => ({
          id: project.id,
          title: project.title || 'Untitled project',
          status: project.status || 'draft',
          thumbnail_url: project.thumbnail_url || null,
          created_at: project.created_at,
          credits_used: Number(project.credits_used || 0),
        }))
        : []
    }

    const currentBalance = typeof credits === 'number' ? credits : 0
    const completedVideos = recentProjects.filter((project) => project.status === 'completed').length

    return {
      user: {
        id: user?.id || null,
        email: user?.email || null,
      },
      creditSummary: {
        currentBalance,
        totalSpent: 0,
        totalAdded: 0,
        videoCount: completedVideos,
      },
      recentProjects,
    }
  }

  const costTrend = useMemo(() => {
    if (!costSummary || !Array.isArray(costSummary.rows) || costSummary.rows.length < 2) {
      return null
    }

    const rows = costSummary.rows
    const latestWindow = rows.slice(0, 7)
    const previousWindow = rows.slice(7, 14)

    if (latestWindow.length === 0 || previousWindow.length === 0) {
      return null
    }

    const avg = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length
    const latestAvg = avg(latestWindow.map((row) => toNumeric(row.margin_percent)))
    const previousAvg = avg(previousWindow.map((row) => toNumeric(row.margin_percent)))

    return {
      latestAvg,
      previousAvg,
      delta: latestAvg - previousAvg,
    }
  }, [costSummary])

  const marginSparkline = useMemo(() => {
    if (!costSummary || !Array.isArray(costSummary.rows) || costSummary.rows.length === 0) {
      return null
    }

    const series = costSummary.rows
      .slice(0, 14)
      .reverse()
      .map((row) => ({
        day: row.day,
        value: toNumeric(row.margin_percent),
      }))

    if (series.length < 2) {
      return null
    }

    const values = series.map((item) => item.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const width = 320
    const height = 90
    const pad = 8
    const range = max - min || 1

    const points = series
      .map((item, index) => {
        const x = pad + (index * (width - pad * 2)) / (series.length - 1)
        const y = pad + ((max - item.value) * (height - pad * 2)) / range
        return `${x},${y}`
      })
      .join(' ')

    return {
      points,
      min,
      max,
      latest: series[series.length - 1],
      earliest: series[0],
      sampleSize: series.length,
      width,
      height,
    }
  }, [costSummary])

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    loadDashboardData()
  }, [user])

  useEffect(() => {
    if (!showAdminPanel) {
      return
    }

    void fetchAdminAuditEvents(1, adminAuditActionFilter, adminAuditSearchQuery)
  }, [adminAuditActionFilter, showAdminPanel])

  useEffect(() => {
    if (!showAdminPanel) {
      return
    }

    const normalized = adminAuditSearchInput.trim().toLowerCase()
    if (normalized === adminAuditSearchQuery) {
      return
    }

    const timeout = setTimeout(() => {
      setAdminAuditSearchQuery(normalized)
      void fetchAdminAuditEvents(1, adminAuditActionFilter, normalized, true)
    }, 350)

    return () => clearTimeout(timeout)
  }, [adminAuditSearchInput, adminAuditSearchQuery, adminAuditActionFilter, showAdminPanel])

  const loadDashboardData = async () => {
    try {
      setLoadError(null)

      // Core user payload should load first so dashboard is usable quickly.
      const userResult = await fetchJsonWithTimeout<DashboardData>('/api/user', 5000)
      if (!userResult.ok || !userResult.payload) {
          const fallbackData = await buildFallbackDashboardData()
          setData(fallbackData)
          setHasAdminAccess(false)
          setLoadError('Some dashboard services are unavailable. Showing fallback data.')
          setShowWorkerPanel(false)
          setShowReconcilePanel(false)
          setShowAdminPanel(false)
          setShowCostPanel(false)
          setCostSummary(null)
          setAdminAuditEvents([])
          return
      }

      setData(userResult.payload)
      setLoading(false)

      const adminSessionResult = await fetchJsonWithTimeout<{ isAdmin: boolean }>(
        '/api/internal/admin/session',
        2500
      )
      setHasAdminAccess(Boolean(adminSessionResult.ok && adminSessionResult.payload?.isAdmin))

      // Admin/ops panels moved to /admin.
      setShowWorkerPanel(false)
      setShowReconcilePanel(false)
      setShowAdminPanel(false)
      setShowCostPanel(false)
      setCostSummary(null)
      setAdminAuditEvents([])
    } catch (error) {
      console.error('Error loading dashboard')
      const fallbackData = await buildFallbackDashboardData()
      setData(fallbackData)
      setHasAdminAccess(false)
      setLoadError('Some dashboard services are unavailable. Showing fallback data.')
      setShowWorkerPanel(false)
      setShowReconcilePanel(false)
      setShowAdminPanel(false)
      setShowCostPanel(false)
      setCostSummary(null)
      setAdminAuditEvents([])
    } finally {
      setLoading(false)
    }
  }

  const fetchAdminAuditEvents = async (
    page: number,
    action: 'all' | 'grant' | 'revoke' = adminAuditActionFilter,
    searchQuery: string = adminAuditSearchQuery,
    suppressErrorToast: boolean = false
  ) => {
    try {
      setAdminAuditLoading(true)
      const actionQuery = action === 'all' ? '' : `&action=${action}`
      const queryParam = searchQuery.trim().length > 0
        ? `&query=${encodeURIComponent(searchQuery.trim())}`
        : ''
      const response = await fetch(`/api/internal/admin/dashboard-audit?limit=12&page=${page}${actionQuery}${queryParam}`)

      if (!response.ok) {
        throw new Error('Failed to fetch admin audit events')
      }

      const payload = (await response.json()) as AdminAuditResponse
      setAdminAuditEvents(Array.isArray(payload?.logs) ? payload.logs : [])
      setAdminAuditPage(payload?.page || page)
      setAdminAuditHasMore(Boolean(payload?.hasMore))
    } catch (error: any) {
      setAdminAuditEvents([])
      setAdminAuditHasMore(false)
      if (!suppressErrorToast) {
        toast.error(error?.message || 'Failed to fetch admin audit events')
      }
    } finally {
      setAdminAuditLoading(false)
    }
  }

  const resetAdminAuditView = async () => {
    setAdminAuditSearchInput('')
    setAdminAuditSearchQuery('')
    setAdminAuditActionFilter('all')
    await fetchAdminAuditEvents(1, 'all', '')
  }

  const refreshAdminUsers = async () => {
    const response = await fetch('/api/internal/admin/dashboard-users')
    if (!response.ok) {
      throw new Error('Failed to refresh admin users')
    }

    const payload = await response.json()
    setAdminUsers(Array.isArray(payload?.admins) ? payload.admins : [])
    await fetchAdminAuditEvents(1, adminAuditActionFilter, adminAuditSearchQuery)
  }

  const grantDashboardAdmin = async () => {
    try {
      if (!adminEmailInput.trim()) {
        toast.error('Please enter an email address')
        return
      }

      setAdminLoading(true)
      const response = await fetch('/api/internal/admin/dashboard-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: adminEmailInput.trim().toLowerCase(),
          notes: adminNotesInput.trim(),
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to grant admin access')
      }

      toast.success('Admin access granted')
      setAdminEmailInput('')
      setAdminNotesInput('')
      await refreshAdminUsers()
    } catch (error: any) {
      toast.error(error?.message || 'Failed to grant admin access')
    } finally {
      setAdminLoading(false)
    }
  }

  const revokeDashboardAdmin = async (userId: string, email: string | null) => {
    try {
      setAdminActionUserId(userId)
      const response = await fetch('/api/internal/admin/dashboard-users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to revoke admin access')
      }

      toast.success(`Revoked admin access for ${email || userId}`)
      await refreshAdminUsers()
    } catch (error: any) {
      toast.error(error?.message || 'Failed to revoke admin access')
    } finally {
      setAdminActionUserId(null)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-orange-400"></div>
          <p className="mt-4 text-slate-300">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-card w-full max-w-md rounded-xl p-6 text-center">
          <h2 className="font-[var(--font-display)] text-xl font-bold text-white">Dashboard Unavailable</h2>
          <p className="mt-2 text-sm text-slate-300">
            {loadError || 'The dashboard could not be loaded right now.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setLoading(true)
              void loadDashboardData()
            }}
            className="mt-4 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-400"
          >
            Retry
          </button>
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

              {hasAdminAccess && (
                <Link
                  href="/admin"
                  className="rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white transition hover:border-orange-300 hover:text-orange-200"
                >
                  Admin Panel
                </Link>
              )}
              
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
        {loadError && (
          <div className="mb-6 rounded-xl border border-amber-300/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {loadError}
          </div>
        )}

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

        {showAdminPanel && (
          <div className="glass-card mb-8 rounded-xl p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 font-[var(--font-display)] text-xl font-bold text-white">
                  <Shield className="h-5 w-5 text-orange-300" />
                  Dashboard Admin Access
                </h2>
                <p className="mt-1 text-sm text-slate-300">Manage active admin users for dashboard ops panels.</p>
              </div>
              <button
                type="button"
                onClick={refreshAdminUsers}
                disabled={adminLoading || Boolean(adminActionUserId)}
                className="rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white transition hover:border-orange-300 hover:text-orange-200 disabled:opacity-60"
              >
                Refresh
              </button>
            </div>

            <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
              <input
                type="email"
                value={adminEmailInput}
                onChange={(event) => setAdminEmailInput(event.target.value)}
                placeholder="admin@example.com"
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none ring-orange-300/60 placeholder:text-slate-400 focus:ring"
              />
              <input
                type="text"
                value={adminNotesInput}
                onChange={(event) => setAdminNotesInput(event.target.value)}
                placeholder="Notes (optional)"
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none ring-orange-300/60 placeholder:text-slate-400 focus:ring"
              />
              <button
                type="button"
                onClick={grantDashboardAdmin}
                disabled={adminLoading || Boolean(adminActionUserId)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-300/40 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/25 disabled:opacity-60"
              >
                <UserPlus className="h-4 w-4" />
                {adminLoading ? 'Adding...' : 'Grant Admin'}
              </button>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h3 className="mb-3 text-sm font-semibold text-white">Active and Historical Admin Entries</h3>
              {adminUsers.length === 0 ? (
                <p className="text-sm text-slate-300">No admin entries found.</p>
              ) : (
                <div className="space-y-2">
                  {adminUsers.map((admin) => (
                    <div key={admin.user_id} className="flex flex-col gap-2 rounded-md border border-white/10 bg-white/5 p-3 text-sm text-slate-200 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="font-semibold text-white">{admin.email || admin.user_id}</div>
                        <div className="mt-1 text-xs text-slate-300">User ID: {admin.user_id}</div>
                        <div className="mt-1 text-xs text-slate-300">Status: {admin.is_active ? 'Active' : 'Inactive'} | Updated: {new Date(admin.updated_at).toLocaleString()}</div>
                        {admin.notes && <div className="mt-1 text-xs text-slate-400">Notes: {admin.notes}</div>}
                      </div>

                      <div>
                        {admin.is_active ? (
                          <button
                            type="button"
                            onClick={() => revokeDashboardAdmin(admin.user_id, admin.email)}
                            disabled={adminLoading || adminActionUserId === admin.user_id}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-300/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20 disabled:opacity-60"
                          >
                            <UserX className="h-3.5 w-3.5" />
                            {adminActionUserId === admin.user_id ? 'Revoking...' : 'Revoke'}
                          </button>
                        ) : (
                          <span className="rounded bg-slate-700/60 px-2 py-1 text-xs text-slate-300">Inactive</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <h3 className="text-sm font-semibold text-white">Recent Admin Audit Events</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={adminAuditSearchInput}
                    onChange={(event) => setAdminAuditSearchInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        const normalized = adminAuditSearchInput.trim().toLowerCase()
                        setAdminAuditSearchQuery(normalized)
                        void fetchAdminAuditEvents(1, adminAuditActionFilter, normalized)
                      }
                    }}
                    placeholder="Search actor/target email"
                    className="rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-xs text-white outline-none placeholder:text-slate-400"
                  />
                  <select
                    value={adminAuditActionFilter}
                    onChange={(event) => {
                      const value = event.target.value as 'all' | 'grant' | 'revoke'
                      setAdminAuditActionFilter(value)
                    }}
                    className="rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-xs text-white outline-none"
                  >
                    <option value="all">All Actions</option>
                    <option value="grant">Grant Only</option>
                    <option value="revoke">Revoke Only</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const normalized = adminAuditSearchInput.trim().toLowerCase()
                      setAdminAuditSearchQuery(normalized)
                      void fetchAdminAuditEvents(1, adminAuditActionFilter, normalized)
                    }}
                    disabled={adminAuditLoading}
                    className="rounded-lg border border-white/20 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:border-orange-300 hover:text-orange-200 disabled:opacity-60"
                  >
                    {adminAuditLoading ? 'Loading...' : 'Apply'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void resetAdminAuditView()}
                    disabled={adminAuditLoading}
                    className="rounded-lg border border-white/20 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-300 hover:text-white disabled:opacity-60"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <p className="mb-3 text-xs text-slate-400">
                Showing {adminAuditEvents.length} result{adminAuditEvents.length === 1 ? '' : 's'}
                {' '}on page {adminAuditPage}
                {' '}for {adminAuditActionFilter === 'all' ? 'all actions' : `${adminAuditActionFilter} actions`}
                {adminAuditSearchQuery ? ` matching "${adminAuditSearchQuery}"` : ''}.
              </p>

              {adminAuditEvents.length === 0 ? (
                <p className="text-sm text-slate-300">
                  {adminAuditSearchQuery || adminAuditActionFilter !== 'all'
                    ? `No results for ${adminAuditSearchQuery ? `"${adminAuditSearchQuery}"` : 'the current query'} in ${adminAuditActionFilter === 'all' ? 'all actions' : `${adminAuditActionFilter} actions`}.`
                    : 'No admin audit events yet.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {adminAuditEvents.slice(0, 12).map((event) => (
                    <div key={event.id} className="rounded-md border border-white/10 bg-white/5 p-3 text-xs text-slate-200">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`rounded px-2 py-0.5 font-semibold ${
                          event.action === 'grant' ? 'bg-emerald-500/20 text-emerald-200' : 'bg-rose-500/20 text-rose-200'
                        }`}>
                          {event.action.toUpperCase()}
                        </span>
                        <span className="text-slate-400">{new Date(event.created_at).toLocaleString()}</span>
                      </div>
                      <div className="mt-2 text-slate-300">
                        Actor: {event.actor_email || event.actor_user_id || 'unknown'} | Target: {event.target_email || event.target_user_id}
                      </div>
                      <div className="mt-1 text-slate-400">
                        Source: {event.source} | Type: {event.actor_type}
                      </div>
                      {event.notes && <div className="mt-1 text-slate-400">Notes: {event.notes}</div>}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
                <button
                  type="button"
                  onClick={() => fetchAdminAuditEvents(Math.max(1, adminAuditPage - 1), adminAuditActionFilter, adminAuditSearchQuery)}
                  disabled={adminAuditLoading || adminAuditPage <= 1}
                  className="rounded-lg border border-white/20 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:border-orange-300 hover:text-orange-200 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-400">Page {adminAuditPage}</span>
                <button
                  type="button"
                  onClick={() => fetchAdminAuditEvents(adminAuditPage + 1, adminAuditActionFilter, adminAuditSearchQuery)}
                  disabled={adminAuditLoading || !adminAuditHasMore}
                  className="rounded-lg border border-white/20 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:border-orange-300 hover:text-orange-200 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

          {showCostPanel && costSummary && (
            <div className="glass-card mb-8 rounded-xl p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-[var(--font-display)] text-xl font-bold text-white">Unit Economics</h2>
                  <p className="mt-1 text-sm text-slate-300">Daily COGS and pricing efficiency for the last {costSummary.days} days.</p>
                </div>
                <button
                  type="button"
                  onClick={loadDashboardData}
                  className="rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white transition hover:border-orange-300 hover:text-orange-200"
                >
                  Refresh
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-slate-300">Gross Margin</div>
                  <div className="mt-1 text-2xl font-bold text-emerald-200">{toNumeric(costSummary.summary.marginPercent).toFixed(2)}%</div>
                  <div className="mt-1 text-xs text-slate-400">{formatUsd(toNumeric(costSummary.summary.grossMarginUsd))}</div>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-slate-300">Cost / Credit</div>
                  <div className="mt-1 text-2xl font-bold text-rose-200">{formatUsd(toNumeric(costSummary.summary.costPerCreditUsd))}</div>
                  <div className="mt-1 text-xs text-slate-400">USD per sold credit</div>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-slate-300">Revenue / Credit</div>
                  <div className="mt-1 text-2xl font-bold text-sky-200">{formatUsd(toNumeric(costSummary.summary.revenuePerCreditUsd))}</div>
                  <div className="mt-1 text-xs text-slate-400">USD per sold credit</div>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-slate-300">7D Margin Trend</div>
                  {costTrend ? (
                    <>
                      <div className={`mt-1 text-2xl font-bold ${costTrend.delta >= 0 ? 'text-emerald-200' : 'text-amber-200'}`}>
                        {costTrend.delta >= 0 ? '+' : ''}{costTrend.delta.toFixed(2)} pts
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        vs previous 7 days ({costTrend.latestAvg.toFixed(2)}% vs {costTrend.previousAvg.toFixed(2)}%)
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mt-1 text-2xl font-bold text-slate-200">Not enough data</div>
                      <div className="mt-1 text-xs text-slate-400">Needs at least 14 daily rollup rows.</div>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-white">Margin Trend (last 14 days)</h3>
                  {marginSparkline && (
                    <span className="text-xs text-slate-400">
                      {marginSparkline.sampleSize} points | {marginSparkline.earliest.day} to {marginSparkline.latest.day}
                    </span>
                  )}
                </div>

                {marginSparkline ? (
                  <div>
                    <svg
                      viewBox={`0 0 ${marginSparkline.width} ${marginSparkline.height}`}
                      className="h-24 w-full"
                      role="img"
                      aria-label="Gross margin percent trend"
                    >
                      <polyline
                        fill="none"
                        stroke="rgba(148, 163, 184, 0.25)"
                        strokeWidth="1"
                        points={`8,8 ${marginSparkline.width - 8},8`}
                      />
                      <polyline
                        fill="none"
                        stroke="rgba(148, 163, 184, 0.25)"
                        strokeWidth="1"
                        points={`8,${marginSparkline.height - 8} ${marginSparkline.width - 8},${marginSparkline.height - 8}`}
                      />
                      <polyline
                        fill="none"
                        stroke="rgba(56, 189, 248, 0.95)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={marginSparkline.points}
                      />
                    </svg>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                      <span>Min {marginSparkline.min.toFixed(2)}%</span>
                      <span>Latest {marginSparkline.latest.value.toFixed(2)}%</span>
                      <span>Max {marginSparkline.max.toFixed(2)}%</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-300">Not enough rollup history to render trendline.</p>
                )}
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
