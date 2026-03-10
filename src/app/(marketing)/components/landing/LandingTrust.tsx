export function LandingTrust() {
  const stats = [
    { label: 'First Draft Turnaround', value: '< 5 min' },
    { label: 'Production Steps Automated', value: '4/4' },
    { label: 'Voice + Caption Ready', value: 'Yes' },
    { label: 'Export Formats', value: 'Shorts/Reels' },
  ]

  return (
    <section className="container mx-auto px-4 py-6 md:py-10">
      <div className="glass-card rounded-2xl p-5 md:p-6">
        <p className="mb-4 text-center text-xs uppercase tracking-[0.18em] text-slate-400">
            Built For Fast Publishing, Designed For Consistent Output
        </p>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {stats.map((item) => (
            <div key={item.label} className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <div className="text-2xl font-bold text-white">{item.value}</div>
              <div className="mt-1 text-sm text-slate-300">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
