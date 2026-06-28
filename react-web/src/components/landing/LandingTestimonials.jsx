import LandingReveal from './LandingReveal'
import { TESTIMONIALS } from './landingData'

export default function LandingTestimonials() {
  return (
    <section id="testimonials" className="bg-story-bg px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <LandingReveal className="mb-10 text-center">
          <h2 className="font-display text-3xl text-story-primary sm:text-4xl">Stories from the neighborhood</h2>
          <p className="mx-auto mt-3 max-w-2xl text-story-primary/70">
            Real experiences from students and landlords using MySewa.
          </p>
        </LandingReveal>

        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((item, i) => (
            <LandingReveal key={item.name} delay={i * 0.1}>
              <blockquote className="flex h-full flex-col rounded-2xl border border-story-primary/8 bg-white p-6 shadow-sm">
                <p className="flex-1 text-sm leading-relaxed text-story-primary/80">&ldquo;{item.quote}&rdquo;</p>
                <footer className="mt-5 border-t border-story-primary/8 pt-4">
                  <cite className="not-italic">
                    <span className="block font-bold text-story-primary">{item.name}</span>
                    <span className="text-xs text-story-primary/60">{item.role}</span>
                  </cite>
                </footer>
              </blockquote>
            </LandingReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
