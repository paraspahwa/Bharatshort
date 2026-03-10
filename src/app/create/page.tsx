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
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#05070f]/70 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2 text-slate-300 transition hover:text-white">
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </Link>
            
            <div className="aurora-chip flex items-center gap-2 rounded-lg px-4 py-2">
              <span className="text-sm text-slate-200">Credits:</span>
              <span className="font-semibold text-white">{credits || 0}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="aurora-chip mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-slate-100">
              <Sparkles className="w-4 h-4 text-orange-300" />
              <span className="text-sm font-medium">AI Video Generator</span>
            </div>
            <h1 className="mb-3 font-[var(--font-display)] text-4xl font-bold text-white">
              Create Your Video
            </h1>
            <p className="text-lg text-slate-300">
              Just tell us what you want, and AI will handle the rest
            </p>
          </div>

          <div className="glass-card animate-rise-in rounded-2xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Topic Input */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">
                  Video Topic *
                </label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full resize-none rounded-xl border border-white/20 bg-[#0d1324] px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  rows={4}
                  placeholder="e.g., Top 5 benefits of morning exercise, History of the Taj Mahal, How to make perfect chai..."
                  required
                />
                <p className="mt-1 text-xs text-slate-400">
                  Be specific! Better topics = better videos
                </p>
              </div>

              {/* Language Selection */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">
                  <Globe className="w-4 h-4 inline mr-1" />
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-[#0d1324] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
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
                <label className="mb-2 block text-sm font-semibold text-slate-200">
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
                <div className="mt-1 flex justify-between text-xs text-slate-400">
                  <span>30s</span>
                  <span>60s</span>
                  <span>90s</span>
                </div>
              </div>

              {/* Cost Estimate */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-200">Estimated Cost</span>
                  <span className="text-xl font-bold text-orange-300">{estimatedCredits} credits</span>
                </div>
                <div className="space-y-1 text-xs text-slate-300">
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
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-4 text-lg font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
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
                <p className="text-center text-sm text-red-300">
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
              <div key={index} className="glass-card rounded-lg p-4 text-center">
                <div className="text-3xl mb-2">{item.icon}</div>
                <div className="font-semibold text-white">{item.title}</div>
                <div className="text-sm text-slate-300">{item.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
