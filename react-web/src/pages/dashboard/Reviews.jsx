import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { REVIEW_CATEGORIES } from '../../utils/reviewCategories'
import { ReviewAggregatesPanel, ReviewCard } from '../../components/reviews/MultiCategoryReviewDisplay'
import { AnimatedStarRow } from '../../components/reviews/AnimatedStarRating'

import { formatRelativeTime } from '../../utils/reviewDisplay'

function IconStar({ filled = true, className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.5} aria-hidden="true">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69l1.07-3.292Z" />
    </svg>
  )
}

export function computeReviewStats(reviews) {
  const list = Array.isArray(reviews) ? reviews : []
  const count = list.length
  if (!count) return { average: 0, count: 0, aggregates: null }

  const sums = {}
  for (const cat of REVIEW_CATEGORIES) {
    sums[cat.ratingField] = 0
  }
  let overallSum = 0

  for (const r of list) {
    overallSum += Number(r.ratingOverall ?? r.rating) || 0
    for (const cat of REVIEW_CATEGORIES) {
      sums[cat.ratingField] += Number(r[cat.ratingField] ?? (cat.key === 'overall' ? r.rating : 0)) || 0
    }
  }

  const aggregates = {
    totalReviews: count,
    ratingOverall: Math.round((overallSum / count) * 10) / 10,
  }
  for (const cat of REVIEW_CATEGORIES) {
    if (cat.key !== 'overall') {
      aggregates[cat.ratingField] = Math.round((sums[cat.ratingField] / count) * 10) / 10
    }
  }

  return { average: aggregates.ratingOverall, count, aggregates }
}

function LandlordReviewListItem({ review, onView, index }) {
  const rating = review.ratingOverall ?? review.rating
  const studentLabel = review.anonymous
    ? `${review.studentDisplayName || 'Student'} (Anonymous)`
    : review.student || review.studentDisplayName || 'Student'

  return (
    <motion.article
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition hover:shadow-md"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[#A0AEC0]">
        <span aria-hidden="true">🏠 </span>
        {review.property}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-[#2D3748]">{studentLabel}</p>
          <p className="text-xs text-[#A0AEC0]">{formatRelativeTime(review.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-[#2D3748]">
          <AnimatedStarRow value={rating} />
          <span>{Number(rating || 0).toFixed(1)}</span>
        </div>
      </div>
      {review.publicComment || review.comment ? (
        <p className="mt-3 text-sm italic text-[#4A5568]">
          &ldquo;{review.publicComment || review.comment}&rdquo;
        </p>
      ) : null}
      {onView ? (
        <button
          type="button"
          onClick={() => onView(review)}
          className="mt-4 text-sm font-semibold text-[#E88D5B] hover:text-[#d97a48]"
        >
          View details →
        </button>
      ) : null}
    </motion.article>
  )
}

export default function Reviews({ reviews = [], loading = false }) {
  const [selected, setSelected] = useState(null)
  const stats = useMemo(() => computeReviewStats(reviews), [reviews])

  const sorted = useMemo(() => {
    return [...reviews].sort((a, b) => {
      const da = new Date(a.createdAt || 0).getTime()
      const db = new Date(b.createdAt || 0).getTime()
      return db - da
    })
  }, [reviews])

  return (
    <div className="min-h-[calc(100vh-4.5rem)] w-full bg-[#FAFAFA] font-sans text-[#2D3748] lg:min-h-screen">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <header>
          <h1 className="text-2xl font-bold text-[#2D3748]">
            <span aria-hidden="true">⭐ </span>
            Reviews &amp; Ratings
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#4A5568]">
            <span>📊 Overall Average:</span>
            <span className="inline-flex items-center gap-1 font-bold text-[#2D3748]">
              {stats.count ? stats.average.toFixed(1) : '0.0'}
              <IconStar className="h-4 w-4 text-[#F59E0B]" />
            </span>
            <span className="text-[#A0AEC0]">({stats.count} review{stats.count === 1 ? '' : 's'})</span>
          </p>
        </header>

        {loading ? (
          <div className="rounded-xl border border-[#E2E8F0] bg-white px-6 py-12 text-center shadow-sm">
            <p className="text-sm text-[#A0AEC0]">Loading reviews…</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="rounded-xl border border-[#E2E8F0] bg-white px-6 py-12 text-center shadow-sm">
            <p className="text-4xl" aria-hidden="true">
              ⭐
            </p>
            <p className="mt-4 text-sm font-medium text-[#2D3748]">No reviews yet</p>
            <p className="mt-2 text-sm text-[#A0AEC0]">
              Reviews from students will appear here after they rate your properties.
            </p>
          </div>
        ) : (
          <>
            {stats.aggregates ? (
              <ReviewAggregatesPanel aggregates={stats.aggregates} />
            ) : null}

            <section>
              <h2 className="mb-4 text-lg font-bold text-[#2D3748]">
                <span aria-hidden="true">📋 </span>
                All Reviews
              </h2>
              <div className="space-y-4">
                {sorted.map((review, index) => (
                  <LandlordReviewListItem
                    key={review.id}
                    review={review}
                    index={index}
                    onView={setSelected}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </div>

      {selected ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => setSelected(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <ul className="space-y-0">
              <ReviewCard review={selected} />
            </ul>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mt-4 w-full rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-semibold text-[#2D3748] hover:bg-[#F7FAFC]"
            >
              Close
            </button>
          </motion.div>
        </div>
      ) : null}
    </div>
  )
}
