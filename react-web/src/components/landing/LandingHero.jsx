import { useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import CountUpStat from './CountUpStat'
import { easeOut, hoverButton } from './landingMotion'

const HERO_IMAGE = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=2000&q=80'

export default function LandingHero({ stats, statsLoading }) {
  const navigate = useNavigate()
  const { scrollY } = useScroll()
  const bgY = useTransform(scrollY, [0, 600], [0, 120])

  const propertyCount = stats?.propertyCount ?? 0
  const studentCount = stats?.studentCount ?? 0
  const averageRating = stats?.averageRating

  return (
    <section className="relative flex min-h-screen flex-col justify-center overflow-hidden">
      <motion.div
        style={{ y: bgY }}
        className="absolute inset-0 scale-105 bg-cover bg-center"
        initial={{ scale: 1.08 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.4, ease: easeOut }}
        aria-hidden="true"
      >
        <div
          className="h-full w-full bg-cover bg-center"
          style={{ backgroundImage: `url("${HERO_IMAGE}")` }}
        />
      </motion.div>

      <div
        className="absolute inset-0 bg-gradient-to-br from-[#2D3748]/95 via-[#2D3748]/80 to-[#E88D5B]/40"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-4 pb-20 pt-28 text-center sm:px-6 lg:px-8">
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOut }}
          className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-[#E88D5B]"
        >
          Terengganu Student Rentals
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: easeOut }}
          className="font-display text-4xl leading-tight text-white sm:text-5xl lg:text-6xl"
        >
          Find Your Student Home
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.2, ease: easeOut }}
          className="mt-5 max-w-2xl text-base text-white/90 sm:text-lg"
        >
          Skip the broker fees. Verified listings near UMT, UniSZA, IPGM, and ILPKT.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.32, ease: easeOut }}
          className="mt-10"
        >
          <motion.button
            type="button"
            variants={hoverButton}
            initial="rest"
            whileHover="hover"
            whileTap="tap"
            onClick={() => navigate('/properties')}
            className="inline-flex items-center gap-2 rounded-full bg-[#E88D5B] px-8 py-4 text-base font-bold text-[#2D3748] shadow-xl shadow-[#E88D5B]/40 transition hover:shadow-[#E88D5B]/60"
          >
            <span aria-hidden="true">🔍</span>
            Find My Next Home
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: easeOut }}
          className="mt-14 grid w-full max-w-3xl grid-cols-3 gap-6 border-t border-white/20 pt-10"
        >
          {statsLoading ? (
            <>
              {[0, 1, 2].map((i) => (
                <div key={i} className="mx-auto h-14 w-20 animate-pulse rounded-lg bg-white/20" />
              ))}
            </>
          ) : (
            <>
              <CountUpStat end={propertyCount} suffix="+" label="Properties" />
              <CountUpStat end={studentCount} suffix="+" label="Students" />
              <CountUpStat
                end={averageRating ?? 0}
                suffix={averageRating == null ? '' : ''}
                decimals={averageRating == null ? 0 : 1}
                label="Rating"
                displayValue={averageRating == null ? '—' : undefined}
              />
            </>
          )}
        </motion.div>
      </div>
    </section>
  )
}
