import { useEffect, useState } from 'react'
import { useInViewOnce } from '../hooks/useInViewOnce'

const SLIDES = [
  {
    eyebrow: 'Near UMT & UniSZA',
    title: 'Student rentals near your campus',
    lead: 'Browse rooms and houses around Universiti Malaysia Terengganu and Universiti Sultan Zainal Abidin — with distance and preferences in one place.',
    image:
      'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1600&q=80',
  },
  {
    eyebrow: 'Search · Apply · Rent',
    title: 'One platform for the whole rental journey',
    lead: 'Filter by campus, budget, and house rules. Apply online, track your application, and manage deposits from your student dashboard.',
    image:
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=80',
  },
  {
    eyebrow: 'Built for Terengganu students',
    title: 'Trusted listings from real landlords',
    lead: 'Landlords publish verified-style listings; administrators keep campus pins and platform data up to date for a clearer rental experience.',
    image:
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80',
  },
]

const CAMPUS_CHIPS = ['UMT', 'UniSZA', 'ILPKT', 'IPGM']

/** Hero banner — display only (carousel + copy; no search bar or controls). */
export default function LandingHero({ stats }) {
  const [slideIndex, setSlideIndex] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [slideReady, setSlideReady] = useState(true)
  const [statsRef, statsVisible] = useInViewOnce({ threshold: 0.2 })

  const slide = SLIDES[slideIndex]

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    setSlideReady(false)
    const frame = requestAnimationFrame(() => setSlideReady(true))
    return () => cancelAnimationFrame(frame)
  }, [slideIndex])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % SLIDES.length)
    }, 7000)
    return () => window.clearInterval(timer)
  }, [])

  const heroShellClass = [
    'hero-lux',
    'landing-hero-carousel',
    'landing-hero-display',
    mounted ? 'landing-hero-carousel--mounted' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const copyClass = [
    'hero-lux-copy',
    'landing-hero-copy',
    slideReady ? 'landing-hero-copy--in' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className="landing-hero-wrap" aria-label="Welcome to MySewa">
      <div className={heroShellClass}>
        <div
          key={slideIndex}
          className="landing-hero-bg"
          style={{ backgroundImage: `url("${slide.image}")` }}
          aria-hidden="true"
        />
        <div className="landing-hero-overlay" aria-hidden="true" />

        <div className={copyClass} key={`copy-${slideIndex}`}>
          <p className="landing-hero-eyebrow landing-hero-stagger" style={{ '--stagger': 0 }}>
            {slide.eyebrow}
          </p>
          <h1 className="landing-hero-stagger" style={{ '--stagger': 1 }}>
            {slide.title}
          </h1>
          <p className="landing-hero-stagger" style={{ '--stagger': 2 }}>
            {slide.lead}
          </p>

          <div className="landing-hero-chips" aria-hidden="true">
            <span className="landing-hero-chips-label landing-hero-stagger" style={{ '--stagger': 3 }}>
              Near
            </span>
            {CAMPUS_CHIPS.map((label, i) => (
              <span
                key={label}
                className="landing-hero-chip landing-hero-chip--static landing-hero-stagger"
                style={{ '--stagger': 4 + i }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="hero-lux-indicators landing-hero-indicators" aria-hidden="true">
          {SLIDES.map((_, i) => (
            <span key={i} className={i === slideIndex ? 'active' : ''} />
          ))}
        </div>
      </div>

      {stats ? (
        <div
          ref={statsRef}
          className={`landing-stats-bar${statsVisible ? ' landing-stats-bar--visible' : ''}`}
          aria-label="Platform highlights"
        >
          <div className="landing-stats-item" style={{ '--stagger': 0 }}>
            <strong>{stats.total}</strong>
            <span>Listings</span>
          </div>
          <div className="landing-stats-item" style={{ '--stagger': 1 }}>
            <strong>{stats.available}</strong>
            <span>Available now</span>
          </div>
          <div className="landing-stats-item" style={{ '--stagger': 2 }}>
            <strong>{stats.campuses}</strong>
            <span>Campus areas</span>
          </div>
        </div>
      ) : null}
    </section>
  )
}
