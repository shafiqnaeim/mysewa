import LandingReveal from './LandingReveal'

function FeatureIcon({ name }) {
  const p = {
    width: 28,
    height: 28,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  }

  if (name === 'shield') {
    return (
      <svg {...p}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    )
  }
  if (name === 'document') {
    return (
      <svg {...p}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M8 13h8M8 17h5" />
      </svg>
    )
  }
  return (
    <svg {...p}>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
}

const FEATURES = [
  {
    icon: 'shield',
    title: 'Verified Listings',
    text: 'Landlord listings reviewed for clearer campus proximity and rental details before students apply.',
  },
  {
    icon: 'document',
    title: 'Digital Leasing',
    text: 'Apply online, upload documents once, and track application status from your student dashboard.',
  },
  {
    icon: 'cube',
    title: 'Virtual Walkthroughs',
    text: 'Browse photos, maps, and nearby facilities so you know the neighborhood before move-in day.',
  },
]

export default function LandingFeatures() {
  return (
    <section id="features" className="bg-story-bg px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <LandingReveal className="mb-10 text-center">
          <h2 className="font-display text-3xl text-story-primary sm:text-4xl">Why students choose MySewa</h2>
          <p className="mx-auto mt-3 max-w-2xl text-story-primary/70">
            Built for the whole rental journey — search, apply, and rent with less guesswork.
          </p>
        </LandingReveal>

        <div className="grid gap-6 md:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <LandingReveal key={feature.title} delay={i * 0.08} className="h-full">
              <article className="flex h-full flex-col rounded-2xl border border-story-primary/8 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-story-accent/25 text-story-primary">
                  <FeatureIcon name={feature.icon} />
                </div>
                <h3 className="text-lg font-bold text-story-primary">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-story-primary/70">{feature.text}</p>
              </article>
            </LandingReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
