import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { fadeUp, scaleIn } from './landingMotion'

const AVATAR_COLORS = ['#E88D5B', '#6C2BD9', '#2D3748', '#00843D', '#0057B3']

function StarRow({ rating = 5 }) {
  const filled = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)))
  return (
    <div className="mb-3 flex gap-0.5" aria-label={`${filled} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={i < filled ? '#E88D5B' : 'none'}
          stroke="#E88D5B"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  )
}

function TestimonialCard({ item, index }) {
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length]
  const name = item.studentDisplayName || 'Student'
  const initial = name.charAt(0).toUpperCase()
  const comment = item.publicComment || item.comment || ''
  const rating = item.ratingOverall ?? item.rating ?? 0

  return (
    <blockquote className="flex h-full flex-col rounded-2xl border border-[#2D3748]/8 bg-white p-6 shadow-md">
      <StarRow rating={rating} />
      <p className="flex-1 text-sm leading-relaxed text-[#2D3748]/80">
        {comment ? `“${comment}”` : 'No written comment.'}
      </p>
      <footer className="mt-5 flex items-center gap-3 border-t border-[#2D3748]/8 pt-4">
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {initial}
        </motion.span>
        <cite className="not-italic">
          <span className="block font-bold text-[#2D3748]">{name}</span>
          {item.propertyName ? (
            <span className="text-xs text-[#2D3748]/60">{item.propertyName}</span>
          ) : null}
        </cite>
      </footer>
    </blockquote>
  )
}

export default function LandingTestimonials({ items = [], loading, error }) {
  const [active, setActive] = useState(0)
  const count = items.length

  useEffect(() => {
    if (count <= 1) return undefined
    const timer = setInterval(() => {
      setActive((i) => (i + 1) % count)
    }, 5500)
    return () => clearInterval(timer)
  }, [count])

  useEffect(() => {
    if (active >= count) setActive(0)
  }, [active, count])

  return (
    <section id="testimonials" className="bg-[#FAFAFA] px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mb-10 text-center"
        >
          <h2 className="font-display text-3xl text-[#2D3748] sm:text-4xl">What Students Say</h2>
          <p className="mx-auto mt-3 max-w-2xl text-[#2D3748]/70">
            Real reviews from students who rented through MySewa.
          </p>
        </motion.div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-[#2D3748]/10" />
            ))}
          </div>
        ) : error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : count === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#2D3748]/20 bg-white px-6 py-12 text-center">
            <p className="font-semibold text-[#2D3748]">No reviews yet</p>
            <p className="mt-2 text-sm text-[#2D3748]/65">
              Student reviews will appear here after their first rental experience.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden gap-6 md:grid md:grid-cols-3">
              {items.map((item, i) => (
                <motion.div
                  key={item.id ?? i}
                  variants={scaleIn}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={i * 0.12}
                >
                  <TestimonialCard item={item} index={i} />
                </motion.div>
              ))}
            </div>

            <div className="md:hidden">
              <div className="relative min-h-[260px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={items[active]?.id ?? active}
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.4 }}
                  >
                    <TestimonialCard item={items[active]} index={active} />
                  </motion.div>
                </AnimatePresence>
              </div>
              {count > 1 ? (
                <div className="mt-6 flex justify-center gap-2" role="tablist" aria-label="Testimonials">
                  {items.map((item, i) => (
                    <button
                      key={item.id ?? i}
                      type="button"
                      role="tab"
                      aria-selected={i === active}
                      aria-label={`Review ${i + 1}`}
                      onClick={() => setActive(i)}
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        i === active ? 'w-8 bg-[#E88D5B]' : 'w-2.5 bg-[#2D3748]/20'
                      }`}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
