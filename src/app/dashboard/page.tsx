'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '../providers'
import Link from 'next/link'
import { Video, Plus, CreditCard, Clock, TrendingUp, LogOut, Settings } from 'lucide-react'

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

export default function DashboardPage() {
  const { user, supabase, credits, refreshCredits } = useSupabase()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
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
      const response = await fetch('/api/user')
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Video className="w-8 h-8 text-orange-600" />
              <span className="text-2xl font-bold text-gray-900">BharatShort AI</span>
            </Link>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-lg">
                <CreditCard className="w-5 h-5 text-orange-600" />
                <span className="font-semibold text-gray-900">{credits || 0} credits</span>
              </div>
              
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 hover:text-gray-900 transition"
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
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <CreditCard className="w-5 h-5 text-orange-600" />
              <span className="text-sm text-gray-600">Credits Balance</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {data.creditSummary.currentBalance}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Video className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-gray-600">Videos Created</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {data.creditSummary.videoCount}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-600">Credits Added</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {data.creditSummary.totalAdded}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-gray-600">Credits Used</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {data.creditSummary.totalSpent}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mb-8">
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-8 py-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-semibold text-lg shadow-lg"
          >
            <Plus className="w-6 h-6" />
            Create New Video
          </Link>
        </div>

        {/* Recent Projects */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Projects</h2>
          
          {data.recentProjects.length === 0 ? (
            <div className="text-center py-12">
              <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No videos created yet</p>
              <Link
                href="/create"
                className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
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
                  <div className="bg-gray-100 rounded-lg overflow-hidden mb-3 aspect-video">
                    {project.thumbnail_url ? (
                      <img
                        src={project.thumbnail_url}
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-orange-600 transition">
                    {project.title}
                  </h3>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span className={`px-2 py-1 rounded text-xs ${
                      project.status === 'completed' ? 'bg-green-100 text-green-800' :
                      project.status === 'generating' ? 'bg-blue-100 text-blue-800' :
                      project.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
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
