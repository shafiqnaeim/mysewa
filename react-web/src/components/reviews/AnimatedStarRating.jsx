import { useState } from 'react'
import { motion } from 'framer-motion'

const STAR_COLOR = '#F59E0B'
const STAR_EMPTY = '#E2E8F0'

export function computeRatingsAverage(ratings, keys) {
  const values = keys
    .map((key) => Number(ratings?.[key]))
    .filter((n) => Number.isFinite(n) && n > 0)
  if (!values.length) return null
  const sum = values.reduce((a, b) => a + b, 0)
  return Math.round((sum / values.length) * 10) / 10
}

export default function AnimatedStarRating({
  value = 0,
  onChange,
  disabled = false,
  size = 'lg',
  labelId,
  showHint = false,
}) {
  const [hover, setHover] = useState(0)
  const sizeClass = size === 'sm' ? 'text-lg' : size === 'md' ? 'text-xl' : 'text-2xl'
  const numericValue = Number(value) || 0
  const active = hover || numericValue
  const showClickHint = showHint && numericValue === 0 && hover === 0

  return (
    <div
      className={`inline-flex items-center gap-0.5 ${sizeClass}`}
      role="radiogroup"
      aria-labelledby={labelId}
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= active
        const starChar = filled || numericValue > 0 || hover > 0 ? '★' : '☆'
        return (
          <motion.button
            key={n}
            type="button"
            disabled={disabled}
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
            aria-checked={numericValue === n}
            onMouseEnter={() => !disabled && setHover(n)}
            onClick={() => onChange?.(n)}
            whileTap={disabled ? undefined : { scale: 1.25 }}
            whileHover={disabled ? undefined : { scale: 1.15 }}
            transition={{ type: 'spring', stiffness: 500, damping: 18 }}
            className="rounded p-0.5 leading-none disabled:cursor-not-allowed disabled:opacity-50"
            style={{ color: filled ? STAR_COLOR : STAR_EMPTY }}
          >
            {starChar}
          </motion.button>
        )
      })}
      {showClickHint ? (
        <span className="ml-2 text-xs text-[#A0AEC0]">Click to rate</span>
      ) : null}
    </div>
  )
}

export function AnimatedStarRow({ value, size = 'md' }) {
  const n = Math.min(5, Math.max(0, Math.round(Number(value) || 0)))
  const sizeClass = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base'
  return (
    <span className={`inline-flex gap-0.5 ${sizeClass}`} aria-label={`${n} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ color: i <= n ? STAR_COLOR : STAR_EMPTY }}>
          ★
        </span>
      ))}
    </span>
  )
}

export function AnonymousToggle({ anonymous, onChange, disabled = false }) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-gradient-to-br from-[#FAFAFA] to-white p-4">
      <p className="text-sm font-semibold text-[#2D3748]">
        <span aria-hidden="true">👤 </span>
        Review visibility
      </p>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(false)}
          className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
            !anonymous
              ? 'bg-[#6C2BD9] text-white shadow-md'
              : 'bg-white text-[#4A5568] ring-1 ring-[#E2E8F0] hover:bg-[#F7FAFC]'
          }`}
        >
          Show my profile name
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(true)}
          className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
            anonymous
              ? 'bg-[#6C2BD9] text-white shadow-md'
              : 'bg-white text-[#4A5568] ring-1 ring-[#E2E8F0] hover:bg-[#F7FAFC]'
          }`}
        >
          Stay anonymous
        </button>
      </div>
      <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-[#E2E8F0]">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-[#6C2BD9]"
          animate={{ width: anonymous ? '50%' : '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        />
      </div>
    </div>
  )
}
