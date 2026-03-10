import Link from 'next/link'

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="py-20">
      <div className="container mx-auto px-4">
        <p className="mb-3 text-center text-xs uppercase tracking-[0.18em] text-slate-400">Process</p>
        <h2 className="mb-12 text-center font-[var(--font-display)] text-4xl font-bold text-white">
          Four Steps to Consistent Publishing
        </h2>
        <div className="mx-auto max-w-4xl space-y-8">
          {[
              { step: '1', title: 'Enter Your Topic', description: 'Describe your idea, format, and audience in one prompt.' },
              { step: '2', title: 'Generate Complete Draft', description: 'Script, visuals, narration, and captions are assembled automatically.' },
              { step: '3', title: 'Review and Tune', description: 'Adjust key moments and messaging quickly before final export.' },
              { step: '4', title: 'Publish on Schedule', description: 'Export and post consistently to Shorts, Reels, and other channels.' },
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

          <div className="pt-4 text-center">
            <Link href="/signup" className="inline-flex items-center rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-orange-300 hover:text-orange-200">
              Launch Your First Workflow
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
