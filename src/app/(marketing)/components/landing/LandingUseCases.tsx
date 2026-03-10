export function LandingUseCases() {
  const cases = [
    {
      title: 'Solo Creator',
      pain: 'Posting slows down when editing consumes your week.',
      outcome: 'Turn raw ideas into a repeatable short-video schedule quickly.',
      stack: ['Faster script drafts', 'Automatic visuals + captions', 'Quick export flow'],
    },
    {
      title: 'Agency Team',
      pain: 'Multi-client timelines break when production tools are fragmented.',
      outcome: 'Standardize delivery with one pipeline and predictable turnaround.',
      stack: ['Reusable workflow', 'Clear production handoffs', 'Consistent output quality'],
    },
    {
      title: 'Brand Marketing',
      pain: 'Campaign momentum drops when creative production cannot keep pace.',
      outcome: 'Scale short-form content bursts while controlling effort and spend.',
      stack: ['Localized narration support', 'Batch-friendly creation loop', 'Usage-based credits'],
    },
  ]

  return (
    <section id="use-cases" className="container mx-auto px-4 py-14 md:py-18 lg:py-20">
      <p className="mb-3 text-center text-xs uppercase tracking-[0.18em] text-slate-400">Use Cases</p>
      <h2 className="mb-10 text-center font-[var(--font-display)] text-3xl font-bold text-white sm:text-4xl md:mb-12">
        Built for Different Teams, One Production Engine
      </h2>

      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
        {cases.map((item, idx) => (
          <article
            key={item.title}
            className="glass-card animate-rise-in rounded-2xl p-5 transition duration-300 hover:-translate-y-1 md:p-6"
            style={{ animationDelay: `${idx * 80}ms` }}
          >
            <p className="mb-3 text-xs uppercase tracking-[0.15em] text-orange-300">{item.title}</p>
            <p className="mb-3 text-sm text-slate-300">{item.pain}</p>
            <p className="mb-4 text-sm font-semibold text-teal-200">{item.outcome}</p>
            <ul className="space-y-2 text-sm text-slate-200">
              {item.stack.map((point) => (
                <li key={point} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  {point}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  )
}
