import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { fadeUp, slideFromLeft, slideFromRight } from './landingMotion'
import { listPropertyImageUrls } from '../../utils/propertyDisplay'

function PropertyCard({ item, index }) {
  const navigate = useNavigate()
  const fromLeft = index % 2 === 0
  const variant = fromLeft ? slideFromLeft : slideFromRight
  const images = listPropertyImageUrls(item)
  const imageUrl = images[0] || null
  const location = [item.location, item.campus, item.city].filter(Boolean).join(', ') || 'Terengganu'
  const typeLabel = item.type ? String(item.type) : 'Rental'

  return (
    <motion.article
      variants={variant}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-4% 0px' }}
      custom={index * 0.08}
      className="w-[280px] shrink-0 snap-start overflow-hidden rounded-2xl border border-[#2D3748]/10 bg-white shadow-md transition-shadow duration-300 hover:shadow-xl sm:w-[300px]"
    >
      <div className="group relative h-44 overflow-hidden bg-[#2D3748]/10">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[#2D3748]/40">No photo</div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold capitalize text-[#2D3748]">
          {typeLabel}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-[#2D3748]">{item.name || 'Rental listing'}</h3>
        <p className="mt-2 text-sm text-[#2D3748]/75">{location}</p>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-lg font-extrabold text-[#2D3748]">
            RM {Number(item.price) || 0}
            <span className="text-sm font-medium text-[#2D3748]/50">/mo</span>
          </p>
          <motion.button
            type="button"
            onClick={() => navigate(`/properties/${item.id}`)}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-full bg-[#2D3748] px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-[#2D3748]/20"
          >
            View
          </motion.button>
        </div>
      </div>
    </motion.article>
  )
}

export default function LandingTrending({ items, loading, error }) {
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
    <section id="popular-properties" className="bg-white px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mb-8 flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <h2 className="font-display text-3xl text-[#2D3748] sm:text-4xl">Popular Properties</h2>
            <p className="mt-2 text-[#2D3748]/70">Top listings from MySewa — ranked by student reviews.</p>
          </div>
          <Link
            to="/properties"
            className="group inline-flex items-center gap-1 text-sm font-bold text-[#E88D5B] transition-colors hover:text-[#2D3748]"
          >
            View All Properties
            <motion.span
              className="inline-block"
              animate={{ x: [0, 4, 0] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
              aria-hidden="true"
            >
              →
            </motion.span>
          </Link>
        </motion.div>

        {loading ? (
          <div className="flex gap-5 overflow-hidden">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.12 }}
                className="h-72 w-[280px] shrink-0 animate-pulse rounded-2xl bg-[#2D3748]/10 sm:w-[300px]"
              />
            ))}
          </div>
        ) : error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#2D3748]/20 bg-[#FAFAFA] px-6 py-12 text-center">
            <p className="font-semibold text-[#2D3748]">No properties listed yet</p>
            <p className="mt-2 text-sm text-[#2D3748]/65">Check back soon — new listings are added by verified landlords.</p>
            <Link
              to="/properties"
              className="mt-4 inline-flex rounded-full bg-[#E88D5B] px-5 py-2.5 text-sm font-bold text-[#2D3748]"
            >
              Browse properties
            </Link>
          </div>
        ) : (
          <div ref={trackRef} className="overflow-hidden">
            <motion.div
              className="flex cursor-grab gap-5 pb-2 active:cursor-grabbing"
              drag="x"
              dragConstraints={{ left: -dragLimit, right: 0 }}
              dragElastic={0.08}
              style={{ touchAction: 'pan-y' }}
            >
              {items.map((item, index) => (
                <PropertyCard key={item.id} item={item} index={index} />
              ))}
            </motion.div>
          </div>
        )}
      </div>
    </section>
  )
}
