import { TrackedLink } from './TrackedLink'

const outcomes = [
  {
    role: 'YouTube Educator',
    quote: 'I moved from occasional uploads to a consistent weekly short-video cadence without hiring an editor.',
    impact: 'Consistency improved in 2 weeks',
  },
  {
    role: 'D2C Founder',
    quote: 'We now turn product updates into short explainers quickly enough to keep social channels active every week.',
    impact: 'Production bottlenecks reduced',
  },
  {
    role: 'Agency Operator',
    quote: 'Our team uses one workflow to script, render, narrate, and caption, which made delivery timelines much more predictable.',
    impact: 'Delivery confidence increased',
  },
]

export function LandingProof() {
  return (
    <section id="proof" className="container mx-auto px-4 py-14 md:py-18 lg:py-20">
      <div className="mb-10 text-center md:mb-12">
        <p className="mb-3 text-xs uppercase tracking-[0.18em] text-slate-400">Social Proof</p>
        <h2 className="font-[var(--font-display)] text-3xl font-bold text-white sm:text-4xl">Built for Reliable Output, Not One-Off Demos</h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-300 sm:text-base">
          BharatShort helps teams replace fragmented tools with one repeatable workflow that turns ideas into publishable short videos.
        </p>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
        {outcomes.map((item, idx) => (
          <article key={item.role} className="glass-card animate-rise-in rounded-2xl p-5 transition duration-300 hover:-translate-y-1 md:p-6" style={{ animationDelay: `${idx * 90}ms` }}>
            <p className="mb-4 text-sm uppercase tracking-wide text-orange-300">{item.role}</p>
            <p className="text-sm text-slate-100 sm:text-base">&quot;{item.quote}&quot;</p>
            <p className="mt-4 text-sm font-semibold text-teal-200">{item.impact}</p>
          </article>
        ))}
      </div>

      <div className="mt-8 text-center">
        <TrackedLink
          href="/signup"
          eventName="landing_click_signup"
          eventParams={{ location: 'proof' }}
          className="inline-flex items-center rounded-xl bg-teal-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-400"
        >
          Start With Free Credits
        </TrackedLink>
      </div>
    </section>
  )
}