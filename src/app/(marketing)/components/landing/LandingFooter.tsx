import Link from 'next/link'

export function LandingFooter() {
  return (
    <footer className="border-t border-white/10 py-8 md:py-10">
      <div className="container mx-auto flex flex-col gap-4 px-4 text-slate-400 md:flex-row md:items-center md:justify-between">
        <p className="text-sm">&copy; 2026 BharatShort AI. All rights reserved.</p>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/login" className="transition hover:text-slate-200">Login</Link>
          <span className="text-slate-600">|</span>
          <Link href="/signup" className="transition hover:text-slate-200">Create Account</Link>
        </div>
      </div>
    </footer>
  )
}
