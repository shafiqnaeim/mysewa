import { useNavigate } from 'react-router-dom'
import LandingReveal from './LandingReveal'

export default function LandingSplitCTA() {
  const navigate = useNavigate()

  return (
    <LandingReveal className="w-full">
      <section className="grid min-h-[320px] md:grid-cols-2">
        <div className="flex min-h-[280px] flex-col items-center justify-center bg-story-blue px-6 py-14 text-center md:min-h-[360px]">
          <h2 className="font-display text-3xl text-story-primary">Looking for a home?</h2>
          <p className="mt-3 max-w-sm text-story-primary/75">
            Browse verified student rentals, filter by campus, and apply in minutes.
          </p>
          <a
            href="#landing-search-section"
            className="mt-6 inline-flex rounded-full bg-story-primary px-8 py-3 text-sm font-bold text-white transition hover:scale-105"
          >
            Search Listings
          </a>
        </div>

        <div className="flex min-h-[280px] flex-col items-center justify-center bg-story-green px-6 py-14 text-center md:min-h-[360px]">
          <h2 className="font-display text-3xl text-story-primary">Own a property?</h2>
          <p className="mt-3 max-w-sm text-story-primary/75">
            Publish listings, manage applications, and reach students across Terengganu.
          </p>
          <button
            type="button"
            onClick={() => navigate('/signup')}
            className="mt-6 inline-flex rounded-full bg-story-primary px-8 py-3 text-sm font-bold text-white transition hover:scale-105"
          >
            List Your Property
          </button>
        </div>
      </section>
    </LandingReveal>
  )
}
