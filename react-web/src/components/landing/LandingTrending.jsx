import { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import LandingReveal from './LandingReveal'

function TrendingCard({ item, onSelect }) {
  return (
    <article className="w-[280px] shrink-0 snap-start overflow-hidden rounded-2xl border border-story-primary/10 bg-white shadow-md sm:w-[300px]">
      <div className="relative h-44 overflow-hidden">
        <img src={item.image} alt="" className="h-full w-full object-cover" loading="lazy" />
        {item.petFriendly ? (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-story-primary">
            Pet Friendly
          </span>
        ) : null}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-story-primary">{item.name}</h3>
          <span className="shrink-0 rounded-full bg-story-accent/30 px-2 py-0.5 text-xs font-bold text-story-primary">
            {item.neighborhoodScore}/100
          </span>
        </div>
        <p className="mt-1 text-xs text-story-primary/60">Neighborhood Score</p>
        <p className="mt-2 text-sm text-story-primary/75">{item.location}</p>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-lg font-extrabold text-story-primary">
            RM {item.price}
            <span className="text-sm font-medium text-story-primary/50">/mo</span>
          </p>
          <button
            type="button"
            onClick={() => onSelect?.(item)}
            className="rounded-full bg-story-primary px-3 py-1.5 text-xs font-bold text-white transition hover:scale-105"
          >
            View
          </button>
        </div>
      </div>
    </article>
  )
}

export default function LandingTrending({ items, loading, onSelect }) {
  const trackRef = useRef(null)
  const [dragLimit, setDragLimit] = useState(0)

  useEffect(() => {
    const el = trackRef.current
    if (!el) return undefined

    const measure = () => {
      setDragLimit(Math.max(0, el.scrollWidth - el.clientWidth))
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [items, loading])

  return (
    <section id="trending" className="bg-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <LandingReveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl text-story-primary sm:text-4xl">Trending Rentals</h2>
            <p className="mt-2 text-story-primary/70">Drag to explore popular listings near campus.</p>
          </div>
          <a
            href="#landing-search-section"
            className="text-sm font-bold text-story-primary underline-offset-4 hover:underline"
          >
            See all listings
          </a>
        </LandingReveal>

        {loading ? (
          <p className="text-story-primary/60">Loading trending rentals…</p>
        ) : (
          <div ref={trackRef} className="overflow-hidden">
            <motion.div
              className="flex cursor-grab gap-5 pb-2 active:cursor-grabbing"
              drag="x"
              dragConstraints={{ left: -dragLimit, right: 0 }}
              dragElastic={0.08}
              style={{ touchAction: 'pan-y' }}
            >
              {items.map((item) => (
                <TrendingCard key={item.id} item={item} onSelect={onSelect} />
              ))}
            </motion.div>
          </div>
        )}
      </div>
    </section>
  )
}
