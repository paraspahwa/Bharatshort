export function LandingFeatures() {
  return (
    <section id="features" className="container mx-auto px-4 py-14 md:py-18 lg:py-20">
      <h2 className="mb-10 text-center font-[var(--font-display)] text-3xl font-bold text-white sm:text-4xl md:mb-12">
        One Workflow From Idea to Publish
      </h2>
      <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
        {[
          {
            title: 'AI Script Generation',
              description: 'Create tighter hooks and narrative flow based on your topic, audience, and content format.',
            icon: 'Script',
          },
          {
            title: 'AI Image & Video',
              description: 'Generate scene visuals and clips without jumping between multiple tools.',
            icon: 'Visuals',
          },
          {
            title: 'AI Voice Narration',
              description: 'Add clear voiceovers in multiple languages for broader reach and faster localization.',
            icon: 'Voice',
          },
          {
            title: 'Auto Captions',
              description: 'Improve retention with subtitles generated automatically for each video output.',
            icon: 'Captions',
          },
          {
            title: 'One-Click Export',
              description: 'Export platform-ready formats quickly so your posting schedule stays predictable.',
            icon: 'Export',
          },
          {
            title: 'Flexible Credits',
              description: 'Use clear, usage-based credits to control spend while scaling content volume.',
            icon: 'Credits',
          },
          ].map((feature, index) => (
            <div key={index} className="glass-card animate-rise-in rounded-2xl p-5 transition duration-300 hover:-translate-y-1 md:p-6" style={{ animationDelay: `${index * 60}ms` }}>
            <div className="mb-3 inline-flex rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
              {feature.icon}
            </div>
              <h3 className="mb-2 text-lg font-bold text-white sm:text-xl">{feature.title}</h3>
              <p className="text-sm text-slate-300 sm:text-base">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
