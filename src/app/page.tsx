import Link from 'next/link'
import { Video, Sparkles, Zap, ArrowRight, PlayCircle } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen animated-grid">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#05070f]/70 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Video className="h-8 w-8 text-orange-400" />
            <span className="font-[var(--font-display)] text-2xl font-bold text-white">BharatShort AI</span>
          </div>
          <nav className="flex gap-4">
            <Link href="/login" className="rounded-lg px-4 py-2 text-slate-300 transition hover:text-white">
              Login
            </Link>
            <Link href="/signup" className="glow-ring rounded-xl bg-orange-500 px-5 py-2.5 font-semibold text-white transition hover:bg-orange-400">
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <section className="container mx-auto px-4 py-20 md:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
          <div className="animate-rise-in">
            <div className="aurora-chip mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-slate-100">
              <Sparkles className="h-4 w-4 text-orange-300" />
              AI-Powered Video Creation
            </div>

            <h1 className="font-[var(--font-display)] text-5xl font-bold leading-tight text-white md:text-6xl">
              From Idea to Viral Reel in Minutes.
            </h1>

            <p className="mt-6 max-w-xl text-lg text-slate-300">
              Craft cinematic short-form videos with scripted storytelling, AI visuals, natural voiceovers, and auto captions.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/signup" className="animate-pulse-glow inline-flex items-center gap-2 rounded-xl bg-orange-500 px-7 py-4 text-lg font-semibold text-white transition hover:bg-orange-400">
                Start Creating
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href="#features" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-7 py-4 text-lg font-semibold text-slate-100 transition hover:border-teal-300 hover:text-teal-200">
                <PlayCircle className="h-5 w-5" />
                Explore Features
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

      <section id="features" className="container mx-auto px-4 py-20">
        <h2 className="mb-12 text-center font-[var(--font-display)] text-4xl font-bold text-white">
          Everything You Need in One Engine
        </h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[
            {
              title: 'AI Script Generation',
              description: 'Get engaging scripts written automatically by AI based on your topic',
              icon: '📝',
            },
            {
              title: 'AI Image & Video',
              description: 'Generate stunning visuals and video clips with state-of-the-art AI',
              icon: '🎨',
            },
            {
              title: 'AI Voice Narration',
              description: 'Natural-sounding voiceovers in multiple languages including Hindi',
              icon: '🎙️',
            },
            {
              title: 'Auto Captions',
              description: 'Automatic subtitle generation for better engagement and accessibility',
              icon: '💬',
            },
            {
              title: 'One-Click Export',
              description: 'Download your final video ready to publish on any platform',
              icon: '⬇️',
            },
            {
              title: 'Credit System',
              description: 'Flexible pay-per-use model. Only pay for what you create',
              icon: '💳',
            },
          ].map((feature, index) => (
            <div key={index} className="glass-card rounded-2xl p-6 transition duration-300 hover:-translate-y-1">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="mb-2 text-xl font-bold text-white">{feature.title}</h3>
              <p className="text-slate-300">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center font-[var(--font-display)] text-4xl font-bold text-white">
            How It Works
          </h2>
          <div className="max-w-4xl mx-auto space-y-8">
            {[
              { step: '1', title: 'Enter Your Topic', description: 'Tell us what video you want to create' },
              { step: '2', title: 'AI Generates Everything', description: 'Script, images, video clips, and voiceover created automatically' },
              { step: '3', title: 'Review & Customize', description: 'Preview your video and make any adjustments' },
              { step: '4', title: 'Download & Share', description: 'Export your video and publish to social media' },
            ].map((item) => (
              <div key={item.step} className="glass-card flex items-start gap-4 rounded-2xl p-5">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-orange-500 text-xl font-bold text-white">
                  {item.step}
                </div>
                <div>
                  <h3 className="mb-1 text-xl font-bold text-white">{item.title}</h3>
                  <p className="text-slate-300">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20 text-center">
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/20 bg-gradient-to-r from-orange-500/90 to-teal-500/90 p-12 text-white shadow-2xl">
          <h2 className="text-4xl font-bold mb-4">Ready to Create Amazing Videos?</h2>
          <p className="mb-8 text-xl opacity-90">
            Join thousands of content creators already using BharatShort AI
          </p>
          <Link href="/signup" className="inline-block rounded-xl bg-white px-8 py-4 text-lg font-semibold text-slate-900 transition hover:bg-slate-200">
            Get Started Now - Free Credits
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8">
        <div className="container mx-auto px-4 text-center text-slate-400">
          <p>&copy; 2026 BharatShort AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
