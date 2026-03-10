'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Activity, AlertTriangle, CreditCard, LogOut, RefreshCw, Shield, UserPlus, UserX } from 'lucide-react'
import { useSupabase } from '../providers'

interface WorkerDashboardMetrics {
  generatedAt: string
  queuedReady: number
  retryScheduled: number
  processing: number
  stuckProcessing: number
  deadLetter: number
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

export default function AdminPage() {
  const router = useRouter()
  const { user, supabase } = useSupabase()

  const [loading, setLoading] = useState(true)
  const [guardReady, setGuardReady] = useState(false)

  const [workerMetrics, setWorkerMetrics] = useState<WorkerDashboardMetrics | null>(null)
  const [reconcileRuns, setReconcileRuns] = useState<ReconcileRun[]>([])
  const [reconcileResult, setReconcileResult] = useState<ReconcileResponse | null>(null)
  const [reconcileLimit, setReconcileLimit] = useState(100)
  const [reconcileLoading, setReconcileLoading] = useState(false)
  const [reconcileAction, setReconcileAction] = useState<'dry-run' | 'repair' | null>(null)

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

  const [loadError, setLoadError] = useState<string | null>(null)

  const toNumeric = (value: number | string | undefined | null): number => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  const formatUsd = (value: number): string => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 4,
    }).format(value)
  }

  const fetchJsonWithTimeout = async <T,>(url: string, timeoutMs: number = 3000): Promise<{ ok: boolean; payload?: T }> => {
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

  const loadOptionalPanels = async () => {
    const [metricsResult, reconcileRunsResult, costSummaryResult] = await Promise.all([
      fetchJsonWithTimeout<WorkerDashboardMetrics>('/api/internal/jobs/dashboard-metrics', 4000),
      fetchJsonWithTimeout<{ runs: ReconcileRun[] }>('/api/internal/payments/dashboard-reconcile', 4000),
      fetchJsonWithTimeout<CostDashboardSummaryResponse>('/api/internal/costs/dashboard-summary?limit=14', 4000),
    ])

    if (metricsResult.ok && metricsResult.payload) {
      setWorkerMetrics(metricsResult.payload)
    } else {
      setWorkerMetrics(null)
    }

    if (reconcileRunsResult.ok && reconcileRunsResult.payload) {
      setReconcileRuns(Array.isArray(reconcileRunsResult.payload.runs) ? reconcileRunsResult.payload.runs : [])
    } else {
      setReconcileRuns([])
    }

    if (costSummaryResult.ok && costSummaryResult.payload) {
      setCostSummary(costSummaryResult.payload)
    } else {
      setCostSummary(null)
    }

    if (!metricsResult.ok || !reconcileRunsResult.ok || !costSummaryResult.ok) {
      setLoadError('Some admin services are temporarily unavailable. Showing partial data.')
    } else {
      setLoadError(null)
    }
  }

  const loadAdminData = async () => {
    try {
      setLoadError(null)
      setLoading(true)

      const adminUsersResult = await fetchJsonWithTimeout<{ admins: DashboardAdminUser[] }>(
        '/api/internal/admin/dashboard-users',
        5000
      )

      // Guard decision should depend only on admin membership check.
      if (!adminUsersResult.ok || !adminUsersResult.payload) {
        setLoadError('Admin access unavailable. Ensure your account is an active dashboard admin.')
        router.replace('/dashboard')
        return
      }

      setAdminUsers(Array.isArray(adminUsersResult.payload?.admins) ? adminUsersResult.payload?.admins : [])
      setGuardReady(true)

      await loadOptionalPanels()

      await fetchAdminAuditEvents(1, adminAuditActionFilter, adminAuditSearchQuery, true)
    } catch {
      setLoadError('Failed to load admin dashboard')
      if (!guardReady) {
        router.replace('/dashboard')
      }
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

  const refreshAdminUsers = async () => {
    const response = await fetch('/api/internal/admin/dashboard-users')
    if (!response.ok) {
      throw new Error('Failed to refresh admin users')
    }

    const payload = await response.json()
    setAdminUsers(Array.isArray(payload?.admins) ? payload.admins : [])
    await fetchAdminAuditEvents(1, adminAuditActionFilter, adminAuditSearchQuery, true)
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
        body: JSON.stringify({ userId }),
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

  const marginTrend = useMemo(() => {
    if (!costSummary || !Array.isArray(costSummary.rows) || costSummary.rows.length < 2) {
      return null
    }

    const rows = costSummary.rows.slice(0, 14)
    const latest = rows.slice(0, 7).map((row) => toNumeric(row.margin_percent))
    const previous = rows.slice(7, 14).map((row) => toNumeric(row.margin_percent))

    if (!latest.length || !previous.length) {
      return null
    }

    const latestAvg = latest.reduce((sum, value) => sum + value, 0) / latest.length
    const previousAvg = previous.reduce((sum, value) => sum + value, 0) / previous.length

    return {
      latestAvg,
      previousAvg,
      delta: latestAvg - previousAvg,
    }
  }, [costSummary])

  useEffect(() => {
    if (!user) {
      router.replace('/login?redirect=/admin')
      return
    }

    void loadAdminData()
  }, [user])

  useEffect(() => {
    if (!guardReady) {
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
  }, [adminAuditSearchInput, adminAuditSearchQuery, adminAuditActionFilter, guardReady])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-orange-400" />
          <p className="mt-4 text-slate-300">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  if (!guardReady) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-card w-full max-w-md rounded-xl p-6 text-center">
          <h2 className="font-[var(--font-display)] text-xl font-bold text-white">Admin Access Required</h2>
          <p className="mt-2 text-sm text-slate-300">{loadError || 'You do not have dashboard admin access.'}</p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-400"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 bg-[#05070f]/70 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-2">
              <Shield className="w-8 h-8 text-orange-400" />
              <span className="font-[var(--font-display)] text-2xl font-bold text-white">BharatShort Admin</span>
            </Link>

            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white transition hover:border-orange-300 hover:text-orange-200"
              >
                User Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-300 transition hover:text-white"
                title="Logout"
                type="button"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {loadError && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-amber-300/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => void loadOptionalPanels()}
              className="rounded-lg border border-amber-200/50 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/20"
            >
              Retry failed panels
            </button>
          </div>
        )}

        <div className="glass-card mb-8 rounded-xl p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-[var(--font-display)] text-xl font-bold text-white">
              <Activity className="h-5 w-5 text-orange-300" />
              Worker Health
            </h2>
            <button
              onClick={() => void loadOptionalPanels()}
              className="rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white transition hover:border-orange-300 hover:text-orange-200"
              type="button"
            >
              Refresh
            </button>
          </div>

          {workerMetrics ? (
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
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-slate-300">Updated</div>
                <div className="mt-1 text-sm font-semibold text-white">{new Date(workerMetrics.generatedAt).toLocaleTimeString()}</div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-300">No worker metrics available.</p>
          )}
        </div>

        <div className="glass-card mb-8 rounded-xl p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-[var(--font-display)] text-xl font-bold text-white">Payment Reconciliation</h2>
              <p className="mt-1 text-sm text-slate-300">Audit paid orders against granted credits and optionally repair drift.</p>
            </div>
            <RefreshCw className="h-5 w-5 text-slate-300" />
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
              onClick={() => void runReconciliation(false)}
              disabled={reconcileLoading}
              className="rounded-lg border border-sky-300/40 bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/25 disabled:opacity-60"
            >
              {reconcileAction === 'dry-run' ? 'Running Dry Run...' : 'Run Dry Reconciliation'}
            </button>
            <button
              type="button"
              onClick={() => void runReconciliation(true)}
              disabled={reconcileLoading}
              className="rounded-lg border border-amber-300/40 bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/25 disabled:opacity-60"
            >
              {reconcileAction === 'repair' ? 'Running Repair...' : 'Run Repair Reconciliation'}
            </button>
          </div>

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
              onClick={() => void refreshAdminUsers()}
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
              onClick={() => void grantDashboardAdmin()}
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
                          onClick={() => void revokeDashboardAdmin(admin.user_id, admin.email)}
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
              </div>
            </div>

            {adminAuditEvents.length === 0 ? (
              <p className="text-sm text-slate-300">No admin audit events yet.</p>
            ) : (
              <div className="space-y-2">
                {adminAuditEvents.slice(0, 12).map((event) => (
                  <div key={event.id} className="rounded-md border border-white/10 bg-white/5 p-3 text-xs text-slate-200">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`rounded px-2 py-0.5 font-semibold ${event.action === 'grant' ? 'bg-emerald-500/20 text-emerald-200' : 'bg-rose-500/20 text-rose-200'}`}>
                        {event.action.toUpperCase()}
                      </span>
                      <span className="text-slate-400">{new Date(event.created_at).toLocaleString()}</span>
                    </div>
                    <div className="mt-2 text-slate-300">
                      Actor: {event.actor_email || event.actor_user_id || 'unknown'} | Target: {event.target_email || event.target_user_id}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={() => void fetchAdminAuditEvents(Math.max(1, adminAuditPage - 1), adminAuditActionFilter, adminAuditSearchQuery)}
                disabled={adminAuditLoading || adminAuditPage <= 1}
                className="rounded-lg border border-white/20 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:border-orange-300 hover:text-orange-200 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-xs text-slate-400">Page {adminAuditPage}</span>
              <button
                type="button"
                onClick={() => void fetchAdminAuditEvents(adminAuditPage + 1, adminAuditActionFilter, adminAuditSearchQuery)}
                disabled={adminAuditLoading || !adminAuditHasMore}
                className="rounded-lg border border-white/20 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:border-orange-300 hover:text-orange-200 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {costSummary && (
          <div className="glass-card mb-8 rounded-xl p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-[var(--font-display)] text-xl font-bold text-white">Unit Economics</h2>
                <p className="mt-1 text-sm text-slate-300">Daily COGS and pricing efficiency for the last {costSummary.days} days.</p>
              </div>
              <CreditCard className="h-5 w-5 text-orange-300" />
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
                {marginTrend ? (
                  <>
                    <div className={`mt-1 text-2xl font-bold ${marginTrend.delta >= 0 ? 'text-emerald-200' : 'text-amber-200'}`}>
                      {marginTrend.delta >= 0 ? '+' : ''}{marginTrend.delta.toFixed(2)} pts
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {marginTrend.latestAvg.toFixed(2)}% vs {marginTrend.previousAvg.toFixed(2)}%
                    </div>
                  </>
                ) : (
                  <div className="mt-1 text-sm font-semibold text-slate-200">Not enough data</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
