import Link from 'next/link'
import { ArrowRight, PlayCircle, Sparkles } from 'lucide-react'

export function LandingHero() {
  return (
    <section className="container mx-auto px-4 py-20 md:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
        <div className="animate-rise-in">
          <div className="aurora-chip mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-slate-100">
            <Sparkles className="h-4 w-4 text-orange-300" />
            AI-Powered Video Creation
          </div>

            <h1 className="font-[var(--font-display)] text-5xl font-bold leading-tight text-white md:text-6xl">
              Ship 30 Days of Shorts.
            <br />
              In One Focused Afternoon.
          </h1>

          <p className="mt-6 max-w-xl text-lg text-slate-300">
              Convert one raw idea into a publish-ready short video pipeline with AI scripting, visuals, voice, and captions in one guided flow.
          </p>

            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-200">
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">No editing timeline required</span>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">Built for creators and lean teams</span>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">Fast export for Shorts and Reels</span>
            </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/signup" className="animate-pulse-glow inline-flex items-center gap-2 rounded-xl bg-orange-500 px-7 py-4 text-lg font-semibold text-white transition hover:bg-orange-400">
                Start Free Creation
              <ArrowRight className="h-5 w-5" />
            </Link>
              <Link href="#proof" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-7 py-4 text-lg font-semibold text-slate-100 transition hover:border-teal-300 hover:text-teal-200">
              <PlayCircle className="h-5 w-5" />
                See Creator Outcomes
            </Link>
          </div>
        </div>

        <div className="glass-card animate-rise-in rounded-3xl p-6 [animation-delay:120ms]">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-slate-300">Live Pipeline Preview</span>
            <span className="rounded-full bg-teal-500/20 px-3 py-1 text-xs text-teal-200">Queue Active</span>
          </div>
          <div className="space-y-4">
            {['Script generated', 'Scene visuals rendered', 'Voice narration ready', 'Final composition exporting'].map((step, idx) => (
              <div key={step} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 flex items-center justify-between text-sm text-slate-200">
                  <span>{step}</span>
                  <span>{Math.min(100, 25 * (idx + 1))}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-teal-400" style={{ width: `${Math.min(100, 25 * (idx + 1))}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
