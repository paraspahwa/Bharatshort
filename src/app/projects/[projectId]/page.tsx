'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSupabase } from '@/app/providers'
import Link from 'next/link'
import { ArrowLeft, Download, Share2, Video, Clock, CreditCard } from 'lucide-react'

interface Project {
  id: string
  title: string
  topic: string
  status: string
  script: string | null
  video_url: string | null
  thumbnail_url: string | null
  duration: number | null
  language: string
  credits_used: number
  created_at: string
}

export default function ProjectPage() {
  const { user, supabase } = useSupabase()
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)

  const projectId = params.projectId as string

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    loadProject()
    
    // Poll for updates if generating
    const interval = setInterval(() => {
      if (project?.status === 'generating') {
        loadProject()
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [user, projectId])

  const loadProject = async () => {
    try {
      if (!supabase) return
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error) throw error
      
      setProject(data)
      
      // Simulate progress based on status
      if (data.status === 'generating') {
        setProgress(Math.min(progress + 10, 90))
      } else if (data.status === 'completed') {
        setProgress(100)
      }
    } catch (error) {
      console.error('Error loading project:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (project?.video_url) {
      window.open(project.video_url, '_blank')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Project not found</p>
          <Link href="/dashboard" className="text-orange-600 hover:text-orange-700 mt-2 inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition">
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Project Header */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{project.title}</h1>
                <p className="text-gray-600">{project.topic}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                project.status === 'completed' ? 'bg-green-100 text-green-800' :
                project.status === 'generating' ? 'bg-blue-100 text-blue-800' :
                project.status === 'failed' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {project.status}
              </span>
            </div>

            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{project.duration || 60}s</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                <span>{project.credits_used} credits used</span>
              </div>
              <div>
                Language: {project.language.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Generating Progress */}
          {project.status === 'generating' && (
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Generating Your Video...</h2>
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block text-orange-600">
                      Progress
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-orange-600">
                      {progress}%
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-orange-200">
                  <div
                    style={{ width: `${progress}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-orange-600 transition-all duration-500"
                  ></div>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                This usually takes 5-10 minutes. You can leave this page and come back later.
              </p>
            </div>
          )}

          {/* Video Player */}
          {project.status === 'completed' && project.video_url && (
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Your Video</h2>
              <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden mb-4">
                <video
                  src={project.video_url}
                  controls
                  className="w-full h-full"
                  poster={project.thumbnail_url || undefined}
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-semibold"
                >
                  <Download className="w-5 h-5" />
                  Download Video
                </button>
                <button
                  className="flex items-center gap-2 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-orange-600 hover:text-orange-600 transition font-semibold"
                >
                  <Share2 className="w-5 h-5" />
                  Share
                </button>
              </div>
            </div>
          )}

          {/* Failed State */}
          {project.status === 'failed' && (
            <div className="bg-red-50 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-bold text-red-900 mb-2">Generation Failed</h2>
              <p className="text-red-700">
                Sorry, we encountered an error while generating your video. Your credits have been refunded.
              </p>
            </div>
          )}

          {/* Script Preview */}
          {project.script && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Generated Script</h2>
              <div className="prose max-w-none">
                <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(JSON.parse(project.script), null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
