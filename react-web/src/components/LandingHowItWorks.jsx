import { useInViewOnce } from '../hooks/useInViewOnce'

const STEPS = [
  {
    step: '01',
    title: 'Search near campus',
    text: 'Pick UMT, UniSZA, or another campus hub and filter by budget, type, and preferences.',
  },
  {
    step: '02',
    title: 'Apply with one profile',
    text: 'Open a listing, review details and distance, then submit your rental application online.',
  },
  {
    step: '03',
    title: 'Manage in your dashboard',
    text: 'Track application status, pay deposits, and handle tenancy tasks from your student account.',
  },
]

export default function LandingHowItWorks() {
  const [sectionRef, visible] = useInViewOnce({ threshold: 0.18 })

  return (
    <section
      ref={sectionRef}
      className={`landing-how-it-works${visible ? ' landing-how-it-works--visible' : ''}`}
      aria-labelledby="landing-how-title"
    >
      <header className="landing-how-head landing-reveal-pop">
        <h2 id="landing-how-title">How MySewa works</h2>
        <p>Three steps from browsing to renting — designed for university communities in Terengganu.</p>
      </header>
      <ol className="landing-how-grid">
        {STEPS.map((row, i) => (
          <li
            key={row.step}
            className="landing-how-card landing-reveal-pop"
            style={{ '--stagger': i }}
          >
            <span className="landing-how-step">{row.step}</span>
            <h3>{row.title}</h3>
            <p>{row.text}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
