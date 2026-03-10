import { Video } from 'lucide-react'
import { TrackedLink } from './TrackedLink'

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#05070f]/70 backdrop-blur-xl">
      <div className="container mx-auto flex items-center justify-between px-4 py-3 md:py-4">
        <div className="flex items-center gap-2 md:gap-2.5">
          <Video className="h-7 w-7 text-orange-400 md:h-8 md:w-8" />
          <span className="font-[var(--font-display)] text-xl font-bold text-white md:text-2xl">BharatShort AI</span>
        </div>
        <nav className="flex items-center gap-2 md:gap-4">
          <TrackedLink
            href="/login"
            eventName="landing_click_login"
            eventParams={{ location: 'header' }}
            className="rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:text-white md:px-4 md:text-base"
          >
            Login
          </TrackedLink>
          <TrackedLink
            href="/signup"
            eventName="landing_click_signup"
            eventParams={{ location: 'header' }}
            className="glow-ring rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-400 md:px-5 md:py-2.5 md:text-base"
          >
            Get Started
          </TrackedLink>
        </nav>
      </div>
    </header>
  )
}
