import { useState } from 'react'
import { motion } from 'framer-motion'

const HERO_IMAGE = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=2000&q=80'

export default function LandingHero({ onSearch }) {
  const [location, setLocation] = useState('')
  const [moveInDate, setMoveInDate] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSearch?.({ location, moveInDate, maxPrice })
  }

  return (
    <section className="relative flex min-h-screen flex-col justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url("${HERO_IMAGE}")` }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-br from-story-primary/92 via-story-primary/78 to-story-primary/88"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-4 pb-16 pt-28 text-center sm:px-6 lg:px-8">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-story-accent"
        >
          Neighborhood Storyteller
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="font-display text-4xl leading-tight text-white sm:text-5xl lg:text-6xl"
        >
          Find a Home, Not Just a House.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.16 }}
          className="mt-5 max-w-2xl text-base text-white/88 sm:text-lg"
        >
          Skip the broker fees. Verified listings near UMT &amp; UniSZA, virtual tours, and instant
          booking for Terengganu students.
        </motion.p>

        <motion.form
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.28 }}
          onSubmit={handleSubmit}
          className="mt-10 w-full max-w-4xl rounded-2xl bg-white p-3 shadow-2xl shadow-black/20 sm:p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_auto] lg:items-end">
            <label className="block text-left">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-story-primary/60">
                Location
              </span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Campus, area, or keyword"
                className="w-full rounded-xl border border-story-primary/10 bg-story-bg px-4 py-3 text-sm text-story-primary outline-none ring-story-accent/40 focus:ring-2"
              />
            </label>
            <label className="block text-left">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-story-primary/60">
                Move-in Date
              </span>
              <input
                type="date"
                value={moveInDate}
                onChange={(e) => setMoveInDate(e.target.value)}
                className="w-full rounded-xl border border-story-primary/10 bg-story-bg px-4 py-3 text-sm text-story-primary outline-none ring-story-accent/40 focus:ring-2"
              />
            </label>
            <label className="block text-left">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-story-primary/60">
                Max Price (RM)
              </span>
              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="e.g. 800"
                className="w-full rounded-xl border border-story-primary/10 bg-story-bg px-4 py-3 text-sm text-story-primary outline-none ring-story-accent/40 focus:ring-2"
              />
            </label>
            <button
              type="submit"
              className="h-[46px] w-full rounded-xl bg-story-primary px-6 py-3 text-sm font-bold text-white transition hover:scale-[1.03] hover:bg-story-primary/90 lg:h-auto lg:min-h-[46px]"
            >
              Find My Next Home
            </button>
          </div>
        </motion.form>
      </div>
    </section>
  )
}
