'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '../providers'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Video, ArrowLeft, Sparkles, Globe, Clock } from 'lucide-react'

export default function CreatePage() {
  const { user, credits } = useSupabase()
  const router = useRouter()
  const [topic, setTopic] = useState('')
  const [language, setLanguage] = useState('en')
  const [duration, setDuration] = useState(60)
  const [loading, setLoading] = useState(false)

  const estimatedCredits = Math.ceil(5 + (5 * 3) + (duration * 2) + (duration * 0.5))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!topic.trim()) {
      toast.error('Please enter a topic')
      return
    }

    if ((credits || 0) < estimatedCredits) {
      toast.error('Insufficient credits')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, language, duration }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start generation')
      }

      toast.success('Video generation started!')
      router.push(`/projects/${data.projectId}`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to create video')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition">
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </Link>
            
            <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-lg">
              <span className="text-sm text-gray-600">Credits:</span>
              <span className="font-semibold text-gray-900">{credits || 0}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-800 rounded-full mb-4">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">AI Video Generator</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Create Your Video
            </h1>
            <p className="text-gray-600 text-lg">
              Just tell us what you want, and AI will handle the rest
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Topic Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Video Topic *
                </label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  rows={4}
                  placeholder="e.g., Top 5 benefits of morning exercise, History of the Taj Mahal, How to make perfect chai..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Be specific! Better topics = better videos
                </p>
              </div>

              {/* Language Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Globe className="w-4 h-4 inline mr-1" />
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>

              {/* Duration Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Video Duration: {duration} seconds
                </label>
                <input
                  type="range"
                  min="30"
                  max="90"
                  step="15"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>30s</span>
                  <span>60s</span>
                  <span>90s</span>
                </div>
              </div>

              {/* Cost Estimate */}
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Estimated Cost</span>
                  <span className="text-xl font-bold text-orange-600">{estimatedCredits} credits</span>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Script generation</span>
                    <span>5 credits</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Images (5 scenes)</span>
                    <span>15 credits</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Video clips ({duration}s)</span>
                    <span>{duration * 2} credits</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Voice narration</span>
                    <span>{Math.ceil(duration * 0.5)} credits</span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || (credits || 0) < estimatedCredits}
                className="w-full py-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Generating Video...
                  </>
                ) : (
                  <>
                    <Video className="w-5 h-5" />
                    Generate Video
                  </>
                )}
              </button>

              {(credits || 0) < estimatedCredits && (
                <p className="text-sm text-red-600 text-center">
                  Insufficient credits. You need {estimatedCredits} credits but have {credits || 0}.
                </p>
              )}
            </form>
          </div>

          {/* Info Cards */}
          <div className="mt-8 grid md:grid-cols-3 gap-4">
            {[
              { icon: '⚡', title: 'Fast Generation', text: '5-10 minutes' },
              { icon: '🎨', title: 'AI-Powered', text: 'Professional quality' },
              { icon: '📱', title: 'Ready to Share', text: 'All platforms' },
            ].map((item, index) => (
              <div key={index} className="bg-white rounded-lg p-4 text-center">
                <div className="text-3xl mb-2">{item.icon}</div>
                <div className="font-semibold text-gray-900">{item.title}</div>
                <div className="text-sm text-gray-600">{item.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
