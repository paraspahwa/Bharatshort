import Link from 'next/link'
import { Video } from 'lucide-react'

export function LandingHeader() {
  return (
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
  )
}
