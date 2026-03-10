import { TrackedLink } from './TrackedLink'

export function LandingCTA() {
  return (
    <section className="container mx-auto px-4 py-14 text-center md:py-18 lg:py-20">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/20 bg-gradient-to-r from-orange-500/90 to-teal-500/90 p-7 text-white shadow-2xl sm:p-10 md:p-12">
        <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Ready to Build a Reliable Shorts Engine?</h2>
        <p className="mb-8 text-base opacity-90 sm:text-xl">
          Start with free credits, validate your workflow quickly, and scale output with predictable effort.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
          <TrackedLink
            href="/signup"
            eventName="landing_click_signup"
            eventParams={{ location: 'final_cta_primary' }}
            className="inline-block w-full rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-slate-900 transition hover:bg-slate-200 sm:w-auto sm:py-4 sm:text-lg"
          >
            Get Started Now
          </TrackedLink>
          <TrackedLink
            href="#how-it-works"
            eventName="landing_click_view_workflow"
            eventParams={{ location: 'final_cta_secondary' }}
            className="inline-block w-full rounded-xl border border-white/40 px-8 py-3.5 text-base font-semibold text-white transition hover:bg-white/10 sm:w-auto sm:py-4 sm:text-lg"
          >
            View The Workflow
          </TrackedLink>
        </div>
      </div>
    </section>
  )
}
