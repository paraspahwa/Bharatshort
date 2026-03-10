import Link from 'next/link'

export function LandingCTA() {
  return (
    <section className="container mx-auto px-4 py-20 text-center">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/20 bg-gradient-to-r from-orange-500/90 to-teal-500/90 p-12 text-white shadow-2xl">
        <h2 className="mb-4 text-4xl font-bold">Ready to Build a Reliable Shorts Engine?</h2>
        <p className="mb-8 text-xl opacity-90">
          Start with free credits, validate your workflow quickly, and scale output with predictable effort.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/signup" className="inline-block rounded-xl bg-white px-8 py-4 text-lg font-semibold text-slate-900 transition hover:bg-slate-200">
            Get Started Now
          </Link>
          <Link href="#how-it-works" className="inline-block rounded-xl border border-white/40 px-8 py-4 text-lg font-semibold text-white transition hover:bg-white/10">
            View The Workflow
          </Link>
        </div>
      </div>
    </section>
  )
}
