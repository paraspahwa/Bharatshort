'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '../providers'
import Link from 'next/link'
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

export default function DashboardPage() {
  const { user, supabase, credits, refreshCredits } = useSupabase()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [workerMetrics, setWorkerMetrics] = useState<WorkerDashboardMetrics | null>(null)
  const [showWorkerPanel, setShowWorkerPanel] = useState(false)
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
      const [userRes, metricsRes] = await Promise.all([
        fetch('/api/user'),
        fetch('/api/internal/jobs/dashboard-metrics'),
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
    } catch (error) {
      console.error('Error loading dashboard:', error)
      setShowWorkerPanel(false)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase?.auth.signOut()
    router.push('/')
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
    </div>
  )
}
