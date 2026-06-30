import { motion } from 'framer-motion'
import { REVIEW_CATEGORIES } from '../../utils/reviewCategories'
import { resolveMediaUrl } from '../../utils/mediaUrl'
import { AnimatedStarRow } from './AnimatedStarRating'
import { formatRelativeTime } from '../../utils/reviewDisplay'

function formatAvg(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  return Number(value).toFixed(1)
}

function CategoryScoreCard({ cat, value, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}
      className="rounded-xl border border-[#E2E8F0] bg-white p-4 text-center shadow-sm transition"
    >
      <p className="text-2xl font-bold text-[#2D3748]">{formatAvg(value)}</p>
      <p className="mt-1 text-xs font-medium text-[#718096]">
        <span aria-hidden="true">{cat.emoji} </span>
        {cat.shortLabel || cat.label}
      </p>
    </motion.div>
  )
}

export function ReviewAggregatesPanel({ aggregates, title }) {
  if (!aggregates || !aggregates.totalReviews) return null

  const categoryCards = REVIEW_CATEGORIES.filter((c) => c.key !== 'overall')

  return (
    <div className="mb-6">
      {title ? (
        <h3 className="mb-4 text-lg font-bold text-[#2D3748]">
          <span aria-hidden="true">⭐ </span>
          {title} ({formatAvg(aggregates.ratingOverall)})
        </h3>
      ) : null}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-gradient-to-br from-[#FFFBEB] to-white p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]">Overall</p>
          <p className="text-4xl font-bold text-[#2D3748]">{formatAvg(aggregates.ratingOverall)}</p>
          <AnimatedStarRow value={aggregates.ratingOverall} size="lg" />
        </div>
        <p className="text-sm text-[#718096]">
          {aggregates.totalReviews} review{aggregates.totalReviews === 1 ? '' : 's'}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {categoryCards.map((cat, index) => (
          <CategoryScoreCard
            key={cat.key}
            cat={cat}
            value={aggregates[cat.ratingField]}
            index={index}
          />
        ))}
      </div>
    </div>
  )
}

export function ReviewCard({ review, index = 0 }) {
  const displayName = review.anonymous
    ? 'Anonymous'
    : review.studentDisplayName || 'Student'
  const overall = review.ratingOverall ?? review.rating

  return (
    <motion.li
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition hover:shadow-md"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-semibold text-[#2D3748]">{displayName}</span>
          {review.anonymous ? (
            <span className="ml-2 text-xs text-[#A0AEC0]">(Anonymous)</span>
          ) : null}
          <p className="text-xs text-[#A0AEC0]">
            {review.createdAt ? formatRelativeTime(review.createdAt) : ''}
          </p>
        </div>
        <AnimatedStarRow value={overall} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {REVIEW_CATEGORIES.filter((c) => c.key !== 'overall').map((cat) => {
          const stars = review[cat.ratingField]
          if (!stars) return null
          return (
            <span
              key={cat.key}
              className="inline-flex items-center gap-1 rounded-full bg-[#F7FAFC] px-2 py-1 text-xs text-[#4A5568]"
              title={cat.label}
            >
              <span aria-hidden="true">{cat.emoji}</span>
              <AnimatedStarRow value={stars} size="sm" />
            </span>
          )
        })}
      </div>

      {review.publicComment || review.comment ? (
        <p className="mt-3 text-sm italic leading-relaxed text-[#4A5568]">
          &ldquo;{review.publicComment || review.comment}&rdquo;
        </p>
      ) : null}

      {Array.isArray(review.photos) && review.photos.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {review.photos.map((url) => (
            <a
              key={url}
              href={resolveMediaUrl(url)}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-lg border border-[#E2E8F0] transition hover:scale-105"
            >
              <img src={resolveMediaUrl(url)} alt="" className="h-16 w-16 object-cover" />
            </a>
          ))}
        </div>
      ) : null}
    </motion.li>
  )
}
